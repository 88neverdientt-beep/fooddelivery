"""Read-only Main preflight plus an explicitly requested logical backup.

Only TCP 127.0.0.1:3306/fooddelivery and Login Path fooddelivery_main.
Never reads old .cnf files or prints credentials/login-file contents.
No DDL, DML, account, grant, restore, service or test-instance operations.
"""
from pathlib import Path
import argparse
from datetime import datetime, timezone, timedelta
import getpass
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import mysql_baseline as baseline

MYSQL = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe'
DUMP = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe'
DB = 'fooddelivery'
OPTIONS = ['--no-defaults','--login-path=fooddelivery_main','--protocol=TCP',
           '--host=127.0.0.1','--port=3306',
           '--ssl-mode=REQUIRED','--default-character-set=utf8mb4']

class Refused(RuntimeError):
    pass

def mysql(sql):
    if not re.match(r'^\s*(SELECT|SHOW)\b',sql,re.I):
        raise Refused('Only SELECT/SHOW is permitted')
    r=subprocess.run([MYSQL]+OPTIONS+['--database='+DB,'--connect-timeout=5','--skip-reconnect','-N','-B','-r'],
                     input=sql,text=True,encoding='utf-8',capture_output=True)
    if r.returncode:
        codes=re.findall(r'ERROR\s+(\d+)',r.stderr)
        raise Refused('MySQL read failed; codes='+','.join(codes))
    return r.stdout.strip()

def rows(sql):return [json.loads(s) for s in mysql(sql).splitlines()]

def inspect():
    state={}
    state['identity']=rows("SELECT JSON_OBJECT('account',CURRENT_USER(),'hostname',@@hostname,'port',@@port,'version',@@version,'uuid',@@server_uuid,'database',DATABASE(),'datadir',REPLACE(@@datadir,CHAR(92),'/'))")[0]
    schema=rows("SELECT JSON_OBJECT('name',SCHEMA_NAME,'charset',DEFAULT_CHARACTER_SET_NAME,'collation',DEFAULT_COLLATION_NAME,'encryption',DEFAULT_ENCRYPTION) FROM information_schema.schemata WHERE schema_name=DATABASE()")
    if len(schema)!=1:raise Refused('Main schema is not visible')
    state['schema']=schema[0]
    state['objects']=rows("SELECT JSON_OBJECT('tablesAndViews',(SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()),'routines',(SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE()),'events',(SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE()),'triggers',(SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema=DATABASE()))")[0]
    state['settings']=rows("SELECT JSON_OBJECT('charset',@@character_set_server,'collation',@@collation_server,'sqlMode',@@sql_mode,'defaultEngine',@@default_storage_engine,'innodbStrict',@@innodb_strict_mode,'rowFormat',@@innodb_default_row_format,'pageSize',@@innodb_page_size,'lowerCaseTableNames',@@lower_case_table_names,'timeZone',@@time_zone,'systemTimeZone',@@system_time_zone,'readOnly',@@global.read_only,'superReadOnly',@@global.super_read_only,'binlog',@@log_bin,'binlogFormat',@@binlog_format,'gtidMode',@@gtid_mode)")[0]
    state['innodb']=rows("SELECT JSON_OBJECT('engine',ENGINE,'support',SUPPORT,'transactions',TRANSACTIONS,'savepoints',SAVEPOINTS) FROM information_schema.engines WHERE engine='InnoDB'")
    state['collations']=rows("SELECT JSON_OBJECT('collation',COLLATION_NAME,'charset',CHARACTER_SET_NAME,'compiled',IS_COMPILED) FROM information_schema.collations WHERE collation_name IN ('utf8mb4_0900_ai_ci','utf8mb4_0900_as_cs','ascii_bin') ORDER BY collation_name")
    state['tls']=dict(line.split('\t',1) for line in mysql("SHOW SESSION STATUS WHERE Variable_name IN ('Ssl_cipher','Ssl_version')").splitlines())
    state['transportPolicy']=dict(line.split('\t',1) for line in mysql("SHOW VARIABLES WHERE Variable_name IN ('require_secure_transport','tls_version')").splitlines())
    state['otherConnections']=rows("SELECT JSON_OBJECT('command',COMMAND,'count',COUNT(*)) FROM information_schema.processlist WHERE DB=DATABASE() AND ID<>CONNECTION_ID() GROUP BY COMMAND")
    return state

def guard(state,uuid):
    identity=state['identity'];settings=state['settings']
    if identity['port']!=3306 or identity['database']!=DB or identity['version']!='8.0.46' or identity['uuid']!=uuid:
        raise Refused('Unexpected Main server/UUID/version/database')
    if identity['account']!='root@localhost':raise Refused('Unexpected authenticated operator')
    if identity['hostname'].casefold()!=os.environ.get('COMPUTERNAME','').casefold():
        raise Refused('MySQL hostname does not match this Windows machine')
    if 'food-delivery-mysql-test' in identity['datadir'].casefold():raise Refused('Test datadir forbidden')
    if any(state['objects'].values()):raise Refused('Main schema is not empty')
    if state['schema']['charset']!='utf8mb4':raise Refused('Unexpected Main database charset')
    if not ({'STRICT_TRANS_TABLES','STRICT_ALL_TABLES'} & set(settings['sqlMode'].split(','))):
        raise Refused('SQL strict mode is required')
    if settings['defaultEngine']!='InnoDB' or not settings['innodbStrict'] or settings['rowFormat'].lower()!='dynamic' or settings['pageSize']!=16384:
        raise Refused('InnoDB settings differ from the rehearsed environment; review required')
    if settings['readOnly'] or settings['superReadOnly']:raise Refused('Main is read-only')
    if not state['innodb'] or state['innodb'][0]['transactions']!='YES':raise Refused('InnoDB transactions unavailable')
    if len(state['collations'])!=3:raise Refused('Required collations are unavailable')
    if not state['tls'].get('Ssl_cipher'):raise Refused('Encrypted client transport not established')
    if any(x['command']!='Sleep' for x in state['otherConnections']):
        raise Refused('Another active Main connection must be reviewed before backup')

def baseline_check():
    text=baseline.baseline_sql();raw=baseline.BASELINE.read_bytes()
    if re.search(r'(?mi)^\s*(USE\b|CREATE DATABASE\b|DROP\b|ALTER\b|INSERT\b|UPDATE\b|DELETE\b|CREATE USER\b|GRANT\b)',text) or re.search(r'`\w+`\.`\w+`',text):
        raise Refused('Baseline contains an unapproved namespace or operation')
    explicit=len(re.findall(r'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci',text))
    if explicit!=16:raise Refused('All tables must pin the rehearsed charset/collation')
    return {'canonicalUtf8LfSha256':hashlib.sha256(text.encode()).hexdigest(),
            'rawSha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
            'tables':16,'pk':text.count('PRIMARY KEY'),'fk':text.count('FOREIGN KEY'),
            'unique':text.count('UNIQUE KEY'),'check':text.count(' CHECK '),'explicitTableCollations':explicit}

def verify_empty_dump(raw):
    text=raw.decode('utf-8')
    if len(raw)<100 or 'MySQL dump' not in text or not re.search(r'--\s+Host: 127\.0\.0\.1\s+Database: fooddelivery\s',text):
        raise Refused('Dump header/size does not identify the expected Main database')
    if 'Dump completed on' not in text:raise Refused('Dump completion marker is missing')
    forbidden=r'(?mi)^\s*(CREATE TABLE|INSERT INTO|REPLACE INTO|DROP TABLE|USE\s|CREATE DATABASE|ALTER DATABASE|DROP DATABASE|CREATE USER|GRANT\s)'
    if re.search(forbidden,text) or re.search(r'`\w+`\.`\w+`',text) or '@@GLOBAL' in text:
        raise Refused('Empty-schema dump contains unexpected data/DDL/namespace/global statements')
    return {'headerIdentifiesFooddelivery':True,'completionMarker':True,'createTableCount':0,
            'dataStatementCount':0,'databaseDdlCount':0,'schemaQualifiedNames':False}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--expected-server-uuid',required=True)
    p.add_argument('--expected-windows-user',required=True)
    p.add_argument('--backup-directory',type=Path,required=True)
    p.add_argument('--create-backup',action='store_true')
    args=p.parse_args();out=args.backup_directory.resolve()
    if out.is_relative_to(baseline.ROOT):raise Refused('Backups must remain outside Git')
    if not out.is_dir():raise Refused('Create an ACL-protected backup directory first')
    report_path=out/'preflight-backup.json'
    if report_path.exists():raise Refused('Evidence already exists; do not overwrite it')
    result={'time':datetime.now(timezone(timedelta(hours=7))).isoformat(),'status':'PREFLIGHT',
            'windowsUser':getpass.getuser(),'loginPath':'fooddelivery_main','oldCnfUsed':False,
            'ddlExecuted':False,'dmlExecuted':False,'accountsOrGrantsChanged':False,
            'test3307Accessed':False,'otherApplicationDatabaseAccessed':False,'backupCreated':False}
    try:
        if result['windowsUser'].casefold()!=args.expected_windows_user.casefold():
            raise Refused('Login path must be used under the confirmed Windows account')
        result['baseline']=baseline_check()
        before=inspect();guard(before,args.expected_server_uuid);result['before']=before
        needed={'SELECT','SHOW VIEW','EVENT','TRIGGER','CREATE','ALTER','INDEX','REFERENCES','CREATE TEMPORARY TABLES'}
        privileges={r['privilege'] for r in rows("SELECT JSON_OBJECT('privilege',PRIVILEGE_TYPE) FROM information_schema.user_privileges WHERE grantee=CONCAT(QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',1)),'@',QUOTE(SUBSTRING_INDEX(CURRENT_USER(),'@',-1)))")}
        result['operatorRequiredPrivileges']={p:p in privileges for p in sorted(needed)}
        if needed-privileges:raise Refused('Required operator privileges not confirmed')
        # SHOW only: preserve the original database default, including unicode_ci.
        create=mysql('SHOW CREATE DATABASE `fooddelivery`').split('\t',1)
        if len(create)!=2 or create[0]!=DB:raise Refused('Unexpected schema metadata response')
        result['originalCreateDatabase']=create[1]
        result['freeDiskBytes']=shutil.disk_usage(out).free
        if result['freeDiskBytes']<4*1024*1024:raise Refused('Insufficient safe backup space')
        if args.create_backup:
            partial=out/'fooddelivery-before-baseline.sql.partial';destination=out/'fooddelivery-before-baseline.sql'
            if destination.exists():raise Refused('Backup already exists; no overwrite')
            command=[DUMP]+OPTIONS+['--single-transaction','--skip-lock-tables','--routines','--events',
                     '--triggers','--hex-blob','--no-tablespaces','--set-gtid-purged=OFF','--skip-add-drop-table',DB]
            result['backupOptions']=['single-transaction','skip-lock-tables','routines','events','triggers',
                                     'hex-blob','no-tablespaces','set-gtid-purged=OFF','skip-add-drop-table']
            with partial.open('xb') as stream:r=subprocess.run(command,stdout=stream,stderr=subprocess.PIPE)
            if r.returncode:
                codes=re.findall(rb'ERROR\s+(\d+)',r.stderr)
                raise Refused('mysqldump failed; codes='+','.join(c.decode() for c in codes))
            raw=partial.read_bytes();result['dumpVerification']=verify_empty_dump(raw)
            after=inspect();guard(after,args.expected_server_uuid);result['after']=after
            for key in ['identity','schema','objects','settings','innodb','collations']:
                if before[key]!=after[key]:raise Refused('Main metadata changed during backup: '+key)
            partial.rename(destination)
            result.update(backupCreated=True,backupBytes=len(raw),backupSha256=hashlib.sha256(raw).hexdigest(),
                          metadataStableBeforeAfter=True,backupFile=destination.name)
            # Pin the exact reviewed DDL bytes, but NEVER execute them.
            (out/'001_reviewed_baseline.sql').write_bytes(baseline.BASELINE.read_bytes())
            (out/'fooddelivery-before-baseline.sql.sha256').write_text(result['backupSha256']+'  '+destination.name+'\n',encoding='ascii')
            result['status']='PASS'
        else:result['status']='PREFLIGHT_PASS'
    except Refused as error:
        result.update(status='BLOCKED',reason=str(error));raise
    except Exception:
        result.update(status='BLOCKED',reason='Unexpected error; raw details withheld');raise
    finally:
        report_path.write_text(json.dumps(result,indent=2),encoding='utf-8')
        print(json.dumps({k:v for k,v in result.items() if k not in ['before','after','originalCreateDatabase','operatorRequiredPrivileges','backupOptions']}))

if __name__=='__main__':
    try:main()
    except Exception:sys.exit(1)
