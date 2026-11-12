"""Explicit, guarded MySQL baseline operator. Default action is read-only preflight.

No password arguments, environment dumps or raw MySQL errors are printed.
Use a protected client option file outside Git. Never use mysql --force.
"""
from __future__ import annotations
import argparse
import configparser
import getpass
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
BASELINE = ROOT / 'database/baseline/001_fooddelivery_baseline.sql'
MANIFEST = ROOT / 'database/schema-reference.json'
TARGETS = {'main': (3306, 'fooddelivery'), 'rehearsal': (3307, 'fooddelivery_main_rehearsal')}
TEST_DATADIR = 'F:/New folder/food-delivery-mysql-test/data/'
MYSQL = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe'

class SafetyError(RuntimeError):
    pass

def option_file(path: Path, port: int):
    parser = configparser.ConfigParser(interpolation=None)
    raw = path.read_text(encoding='utf-8-sig')
    if any(line.lstrip().startswith('!') for line in raw.splitlines()):
        raise SafetyError('Option-file includes are forbidden')
    parser.read_string(raw)
    allowed = {'host','port','protocol','user','password','database','default-character-set',
               'ssl-mode','ssl-ca','ssl-cert','ssl-key','ssl-capath','tls-version','connect-timeout'}
    if set(parser.sections()) - {'client','mysql'}:
        raise SafetyError('Unexpected option-file section')
    values = {}
    for section in ['client', 'mysql']:
        if parser.has_section(section):
            if set(parser[section]) - allowed:
                raise SafetyError('Unexpected client option; init/execute/output options forbidden')
            values.update(parser[section])
    if values.get('host') != '127.0.0.1' or values.get('port') != str(port):
        raise SafetyError('Option file must explicitly pin host and port')

class Client:
    def __init__(self, defaults: Path | None, port: int, database: str, binary: str = MYSQL, login_path: str | None = None):
        if login_path is not None:
            if defaults is not None or login_path!='fooddelivery_main' or port!=3306 or database!='fooddelivery':
                raise SafetyError('Login Path is restricted to the approved Main target')
            if getpass.getuser().casefold()!='hieu':raise SafetyError('Login Path requires Windows user HIEU')
            authentication=['--no-defaults','--login-path=fooddelivery_main','--ssl-mode=REQUIRED']
        else:
            if defaults is None:raise SafetyError('Explicit authentication method required')
            option_file(defaults, port)
            authentication=['--defaults-file='+str(defaults.resolve())]
        self.command = [binary] + authentication + ['--protocol=TCP',
                        '--host=127.0.0.1', '--port=' + str(port), '--database=' + database,
                        '--connect-timeout=5', '--skip-reconnect', '--default-character-set=utf8mb4', '-N', '-B', '-r']
    def run(self, sql: str):
        result = subprocess.run(self.command, input=sql, text=True, encoding='utf-8', capture_output=True)
        if result.returncode:
            code = re.search(r'ERROR\s+(\d+)', result.stderr)
            raise SafetyError('MySQL operation failed; code=' + (code[1] if code else 'unavailable'))
        return result.stdout.strip()

def inspect(client):
    return json.loads(client.run("""SELECT JSON_OBJECT(
      'port',@@port,'version',@@version,'uuid',@@server_uuid,'database',DATABASE(),
      'datadir',REPLACE(@@datadir,CHAR(92),'/'),
      'tables',(SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()),
      'routines',(SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE()),
      'events',(SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE()),
      'triggers',(SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema=DATABASE()))"""))

def guard(state, profile: str, expected_uuid: str, empty: bool):
    port, database = TARGETS[profile]
    if state['port'] != port or state['database'] != database:
        raise SafetyError('Wrong server port/database')
    if state['uuid'] != expected_uuid or not expected_uuid:
        raise SafetyError('Server UUID mismatch')
    if state['version'] != '8.0.46':
        raise SafetyError('Unexpected MySQL version')
    data = state['datadir'].replace('\\', '/').rstrip('/') + '/'
    if profile == 'rehearsal' and data.casefold() != TEST_DATADIR.casefold():
        raise SafetyError('Rehearsal datadir mismatch')
    if profile == 'main' and 'food-delivery-mysql-test' in data.casefold():
        raise SafetyError('Main points at test datadir')
    if any(state[key] for key in ['routines', 'events', 'triggers']):
        raise SafetyError('Unexpected database objects')
    if empty and state['tables'] != 0:
        raise SafetyError('Database is not empty; no DDL permitted')

def baseline_sql():
    sql = BASELINE.read_text(encoding='utf-8')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if hashlib.sha256(sql.encode()).hexdigest() != manifest['baselineSha256']:
        raise SafetyError('Baseline hash differs from reviewed manifest')
    statements = [s.strip() for s in re.sub(r'--[^\n]*', '', sql).split(';') if s.strip()]
    names = []
    for s in statements:
        match = re.match(r'CREATE TABLE `([a-z_]+)`\s*\(', s)
        if not match or re.search(r'\b(?:INSERT|UPDATE|DELETE|DROP|TRUNCATE|USE|DATABASE|TRIGGER|PROCEDURE)\b', s, re.I):
            # ON DELETE/ON UPDATE are legal FK clauses; inspect those separately below.
            stripped = re.sub(r'ON (?:DELETE|UPDATE) (?:RESTRICT|CASCADE|NO ACTION|SET NULL)', '', s, flags=re.I)
            if not match or re.search(r'\b(?:INSERT|UPDATE|DELETE|DROP|TRUNCATE|USE|DATABASE|TRIGGER|PROCEDURE)\b', stripped, re.I):
                raise SafetyError('Baseline must contain only reviewed CREATE TABLE statements')
        names.append(match[1])
    if names != manifest['tableOrder'] or len(names) != 16:
        raise SafetyError('Unexpected baseline tables/order')
    return sql

def signature(client):
    queries = {
        'columns': "SELECT JSON_OBJECT('table',table_name,'name',column_name,'type',column_type,'nullable',is_nullable,'default',column_default,'extra',extra,'collation',collation_name) FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY table_name,ordinal_position",
        'indexes': "SELECT JSON_OBJECT('table',table_name,'name',index_name,'unique',non_unique=0,'seq',seq_in_index,'column',column_name,'prefix',sub_part) FROM information_schema.statistics WHERE table_schema=DATABASE() ORDER BY table_name,index_name,seq_in_index",
        'foreignKeys': "SELECT JSON_OBJECT('table',k.table_name,'name',k.constraint_name,'column',k.column_name,'ref',k.referenced_table_name,'refColumn',k.referenced_column_name,'delete',r.delete_rule,'update',r.update_rule) FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r ON r.constraint_schema=k.constraint_schema AND r.constraint_name=k.constraint_name AND r.table_name=k.table_name WHERE k.table_schema=DATABASE() ORDER BY k.table_name,k.constraint_name,k.ordinal_position",
        'checks': "SELECT JSON_OBJECT('table',t.table_name,'name',c.constraint_name,'clause',c.check_clause,'enforced',t.enforced) FROM information_schema.check_constraints c JOIN information_schema.table_constraints t ON t.constraint_schema=c.constraint_schema AND t.constraint_name=c.constraint_name WHERE c.constraint_schema=DATABASE() ORDER BY t.table_name,c.constraint_name",
        'tables': "SELECT JSON_OBJECT('name',table_name,'engine',engine,'collation',table_collation) FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name"
    }
    return {key: [json.loads(line) for line in client.run(sql).splitlines()] for key, sql in queries.items()}

def verify(client):
    expected = json.loads(MANIFEST.read_text(encoding='utf-8'))['signature']
    actual = signature(client)
    different = [key for key in expected if actual[key] != expected[key]]
    if different:
        raise SafetyError('Schema differs from A2.4 reference: ' + ','.join(different))
    return {'tables': len(actual['tables']), 'primaryKeys': sum(x['name']=='PRIMARY' for x in actual['indexes']),
            'foreignKeys': len(actual['foreignKeys']),
            'uniqueConstraints': len({(x['table'],x['name']) for x in actual['indexes'] if x['unique'] and x['name']!='PRIMARY'}),
            'checks': len(actual['checks'])}

def verify_main_backup(directory: Path, expected_uuid: str):
    if directory.resolve().is_relative_to(ROOT):raise SafetyError('Main backup must remain outside Git')
    metadata=json.loads((directory/'preflight-backup.json').read_text(encoding='utf-8'))
    dump=directory/'fooddelivery-before-baseline.sql'
    expected='9bb19e741215f1e29b43f681c71cc39cfcc3f7f44a1af9ef6c7df30cdcbde510'
    raw=dump.read_bytes();digest=hashlib.sha256(raw).hexdigest()
    sidecar=(directory/'fooddelivery-before-baseline.sql.sha256').read_text(encoding='ascii').split()[0]
    if metadata['status']!='PASS' or not metadata['backupCreated'] or digest!=expected or digest!=metadata['backupSha256'] or digest!=sidecar or len(raw)!=metadata['backupBytes']:
        raise SafetyError('Main backup checksum/status differs from accepted snapshot')
    for key in ['before','after']:
        s=metadata[key]
        if s['identity']['uuid']!=expected_uuid or s['identity']['port']!=3306 or s['identity']['database']!='fooddelivery' or any(s['objects'].values()):
            raise SafetyError('Backup does not describe the approved empty Main target')
    if (directory/'001_reviewed_baseline.sql').read_bytes()!=BASELINE.read_bytes():
        raise SafetyError('DDL bytes differ from the preflight-approved artifact')
    independent=json.loads((directory/'independent-verification.json').read_text(encoding='utf-8'))
    if independent['failed']!=0 or not all(independent['checks'].values()):raise SafetyError('Backup independent checks did not pass')
    if hashlib.sha256((directory/'preflight-backup.json').read_bytes()).hexdigest()!=independent['metadataSha256']:
        raise SafetyError('Backup metadata changed after verification')
    return {'sha256':digest,'bytes':len(raw),'originalSchemaEmpty':True,
            'emptyDumpDoesNotUndoPartialDdl':True,'automaticRestoreOrDrop':False}

def apply_sql(port: int, database: str, expected_uuid: str, sql: str):
    if not re.fullmatch(r'[0-9a-fA-F-]{36}',expected_uuid):raise SafetyError('Invalid server UUID')
    prefix="SELECT GET_LOCK('fooddelivery.baseline.v1',0);\n"
    gate="""CREATE TEMPORARY TABLE `_food_baseline_guard` (`ok` INT NOT NULL CHECK (`ok`=1));
INSERT INTO `_food_baseline_guard` SELECT IF(
 @@port={port} AND DATABASE()='{database}' AND @@server_uuid='{uuid}' AND @@version='8.0.46'
 AND IS_USED_LOCK('fooddelivery.baseline.v1')=CONNECTION_ID()
 AND @@session.foreign_key_checks=1 AND @@session.unique_checks=1
 AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE())=0
 AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE())=0
 AND (SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE())=0
 AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema=DATABASE())=0,
 1,0);
""".format(port=port,database=database,uuid=expected_uuid)
    return prefix+gate+sql

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=TARGETS, required=True)
    auth=parser.add_mutually_exclusive_group(required=True)
    auth.add_argument('--defaults-file',type=Path)
    auth.add_argument('--login-path',choices=['fooddelivery_main'])
    parser.add_argument('--expected-server-uuid', required=True)
    parser.add_argument('--action', choices=['preflight','apply','verify','provision-app','seed-cod','backup'], default='preflight')
    parser.add_argument('--acknowledge')
    parser.add_argument('--app-defaults-output', type=Path)
    parser.add_argument('--backup-output', type=Path)
    parser.add_argument('--verified-backup-directory',type=Path)
    parser.add_argument('--verified-restore-report',type=Path)
    parser.add_argument('--evidence-directory',type=Path)
    args = parser.parse_args(argv)
    port, database = TARGETS[args.profile]
    if args.login_path and args.action not in ['preflight','apply','verify']:
        raise SafetyError('Login Path currently permits only preflight/apply/verify; no setup actions')
    client = Client(args.defaults_file, port, database, login_path=args.login_path)
    guard(inspect(client), args.profile, args.expected_server_uuid, empty=args.action in ['preflight','apply'])
    result = {'profile':args.profile,'host':'127.0.0.1','port':port,'database':database,'action':args.action}
    baseline_sql()
    if args.action in ['apply','provision-app','seed-cod']:
        if args.acknowledge != database + '@127.0.0.1:' + str(port):
            raise SafetyError('Explicit exact-target acknowledgement required for writes')
    if args.action == 'provision-app':
        result['schema'] = verify(client)
        output = args.app_defaults_output
        if output is None or output.exists() or output.resolve().is_relative_to(ROOT):
            raise SafetyError('Use a new protected output path outside the repository')
        username = 'fooddelivery_app' if args.profile == 'main' else 'fooddelivery_rehearsal_app'
        if client.run("SELECT COUNT(*) FROM mysql.user WHERE user='"+username+"'") != '0':
            raise SafetyError('App account already exists; no reset or grant changes permitted')
        sql = (ROOT/'database/setup/002_fooddelivery_app.sql').read_text(encoding='utf-8')
        sql = sql.replace("'fooddelivery_app'", "'"+username+"'").replace('`fooddelivery`','`'+database+'`')
        # Only CREATE USER returns a result. Capture it in memory, never forward stdout/stderr.
        row = client.run(sql).splitlines()[0].split('\t')
        if len(row) < 3 or row[0] != username or row[1] != '127.0.0.1':
            raise SafetyError('Unexpected password response; inspect account manually without printing credentials')
        password = row[2]
        if '\n' in password or '\r' in password:
            raise SafetyError('Unsupported credential representation')
        quoted = '"'+password.replace('\\','\\\\').replace('"','\\"')+'"'
        # Parent ACL must be restricted by the operator BEFORE running this action.
        with output.open('x', encoding='utf-8') as f:
            f.write('[client]\nhost=127.0.0.1\nport='+str(port)+'\nprotocol=tcp\nuser='+username+
                    '\npassword='+quoted+'\ndatabase='+database+'\ndefault-character-set=utf8mb4\n')
        result['username'] = username
        result['credentialSavedOutsideGit'] = True
    elif args.action == 'backup':
        if inspect(client)['tables'] == 0:
            result['emptyDatabaseSnapshot'] = True
        else:
            result['schema'] = verify(client)
        output = args.backup_output
        if output is None or output.exists() or output.resolve().is_relative_to(ROOT):
            raise SafetyError('Backup must use a new protected path outside the repository')
        binary = str(Path(MYSQL).with_name('mysqldump.exe'))
        command = [binary,'--defaults-file='+str(args.defaults_file.resolve()),'--protocol=TCP',
                   '--host=127.0.0.1','--port='+str(port),'--single-transaction','--routines',
                   '--events','--triggers','--hex-blob','--no-tablespaces','--set-gtid-purged=OFF',
                   '--skip-add-drop-table',database]
        # Snapshot may contain sensitive hashes. Parent ACL must already be restricted.
        with output.open('xb') as stream:
            completed = subprocess.run(command,stdout=stream,stderr=subprocess.PIPE)
        if completed.returncode:
            raise SafetyError('Backup failed; preserve partial output and inspect without displaying its data')
        result['backupBytes'] = output.stat().st_size
        result['backupSha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    elif args.action == 'seed-cod':
        result['schema'] = verify(client)
        if client.run("SELECT COUNT(*) FROM payment_methods WHERE method_code='COD'") != '0':
            raise SafetyError('COD already exists; inspect instead of modifying it')
        client.run((ROOT/'database/setup/003_cod.sql').read_text(encoding='utf-8'))
        result['codCreated'] = True
    elif args.action == 'apply':
        # One connection, no --force, no FK disabling, no reconnect and no automated retry.
        # Serialise competing invocations of this operator. Other DDL writers must be excluded operationally.
        sql = baseline_sql()
        audit_path=None
        if args.profile=='main':
            if args.login_path!='fooddelivery_main':raise SafetyError('Main apply requires approved Login Path')
            if args.verified_backup_directory is None or args.verified_restore_report is None or args.evidence_directory is None:
                raise SafetyError('Verified backup, restore evidence and new audit directory required')
            result['backup']=verify_main_backup(args.verified_backup_directory,args.expected_server_uuid)
            restored=json.loads(args.verified_restore_report.read_text(encoding='utf-8'))
            if restored['status']!='PASS' or not restored['all16TableDataDigestsMatch'] or restored['integrityFailed']!=0 or restored['dumpSha256']!='541735cc459e7cd4095da06433c627ea937971085341b4b8aac3bb7ce8072ed2':
                raise SafetyError('Accepted rehearsal restore proof is not valid')
            import preflight_main_login_path as main_preflight
            state=main_preflight.inspect();main_preflight.guard(state,args.expected_server_uuid)
            evidence=args.evidence_directory.resolve()
            if evidence.is_relative_to(ROOT):raise SafetyError('Apply evidence must be outside Git')
            evidence.mkdir(parents=True,exist_ok=True);audit_path=evidence/'apply-attempt.json'
            result.update(status='STARTED',ddlAttempted=False,sqlImportSucceeded=False,
                          canonicalSha256=hashlib.sha256(sql.encode()).hexdigest(),
                          rawSha256=hashlib.sha256(BASELINE.read_bytes()).hexdigest(),
                          loginPath=args.login_path,windowsUser=getpass.getuser())
            with audit_path.open('x',encoding='utf-8') as output:json.dump(result,output,indent=2)
        try:
            result['ddlAttempted']=True
            if audit_path:audit_path.write_text(json.dumps(result,indent=2),encoding='utf-8')
            client.run(apply_sql(port,database,args.expected_server_uuid,sql))
            result['sqlImportSucceeded']=True
            result['schema']=verify(client)
            tables=json.loads(MANIFEST.read_text(encoding='utf-8'))['tableOrder']
            result['rowCounts']={name:int(client.run('SELECT COUNT(*) FROM `'+name+'`')) for name in tables}
            if any(result['rowCounts'].values()):raise SafetyError('Unexpected rows after schema-only baseline')
            result['status']='PASS'
        except Exception as error:
            result.update(status='FAIL',reason=str(error) if isinstance(error,SafetyError) else 'Unexpected failure; details withheld',automaticRetry=False,automaticDrop=False)
            try:result['actualTables']=client.run('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name').splitlines()
            except Exception:result['actualTables']='Unable to inspect; stop and investigate'
            raise
        finally:
            if audit_path:audit_path.write_text(json.dumps(result,indent=2),encoding='utf-8')
    elif args.action == 'verify':
        result['schema'] = verify(client)
    print(json.dumps(result))

if __name__ == '__main__':
    try:
        main()
    except SafetyError as error:
        print(json.dumps({'status':'FAIL','message':str(error),'automatedRetry':False}))
        sys.exit(1)
    except (OSError, ValueError, KeyError, configparser.Error):
        # Deliberately suppress raw option contents, SQL with credentials and driver stderr.
        print(json.dumps({'status':'FAIL','message':'Operation refused or failed; inspect protected operator evidence; no automated retry'}))
        sys.exit(1)
