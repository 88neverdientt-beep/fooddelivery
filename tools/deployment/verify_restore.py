"""One-shot verification of the approved rehearsal dump, NEVER Main or A2.4.

The dump hash, source and restore target are pinned. Existing targets are refused.
No credentials, row values, token/hash values or raw mysql errors are printed.
Failure leaves evidence and any partial restore intact; no retry or cleanup DDL.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys
import mysql_baseline as m

BASE = Path('F:/New folder/food-delivery-mysql-test')
SOURCE = 'fooddelivery_main_rehearsal'
TARGET = 'fooddelivery_restore_verification'
DUMP = BASE/'main-baseline-rehearsal-20261112/private/rehearsal-backup.sql'
EXPECTED_SHA = '541735cc459e7cd4095da06433c627ea937971085341b4b8aac3bb7ce8072ed2'

def audit_dump():
    raw=DUMP.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=EXPECTED_SHA:
        raise m.SafetyError('Dump SHA-256 differs from the approved rehearsal backup')
    sql=raw.decode('utf-8')
    forbidden=[r'(?mi)^\s*USE\s',r'(?mi)^\s*(?:CREATE|DROP|ALTER) DATABASE\b',
               r'(?mi)^\s*DROP TABLE\b',r'`\w+`\.`\w+`',r'\bDEFINER\s*=',
               r'(?mi)^\s*(?:SOURCE\s|\\)',r'(?i)@@GLOBAL\b']
    if any(re.search(pattern,sql) for pattern in forbidden):
        raise m.SafetyError('Dump contains an unapproved namespace/client/global operation')
    names=re.findall(r'CREATE TABLE `([a-z_]+)`',sql)
    expected=json.loads(m.MANIFEST.read_text(encoding='utf-8'))['tableOrder']
    if sorted(names)!=sorted(expected) or len(names)!=16:
        raise m.SafetyError('Dump must contain exactly the reviewed 16 tables')
    return sql

def server_guard(state,expected_uuid):
    if state['port']!=3307 or state['version']!='8.0.46' or state['uuid']!=expected_uuid:
        raise m.SafetyError('Unexpected test server port/version/UUID')
    if state['datadir'].replace('\\','/').casefold()!=m.TEST_DATADIR.casefold():
        raise m.SafetyError('Unexpected isolated test datadir')
    if state['database'] not in ['information_schema',SOURCE,TARGET]:
        raise m.SafetyError('Unexpected database context')

def ident(value):
    if not re.fullmatch(r'[A-Za-z0-9_]+',value):raise m.SafetyError('Invalid metadata identifier')
    return '`'+value+'`'

def data_snapshot(client):
    signature=m.signature(client)
    result={}
    for table in signature['tables']:
        name=table['name']
        columns=[x['name'] for x in signature['columns'] if x['table']==name]
        pk=[x['column'] for x in signature['indexes'] if x['table']==name and x['name']=='PRIMARY']
        # Length-unambiguous HEX representation, with distinct NULL and non-NULL markers.
        # Only server-computed row digests cross the client connection, never secret fields.
        values=["IF("+ident(c)+" IS NULL,'N',CONCAT('V',HEX(CAST("+ident(c)+" AS BINARY))))" for c in columns]
        query="SELECT SHA2(CONCAT_WS('|',"+','.join(values)+"),256) FROM "+ident(name)+' ORDER BY '+','.join(map(ident,pk))
        rows=client.run(query).splitlines();digest=hashlib.sha256()
        for row in rows:digest.update((row+'\n').encode('ascii'))
        result[name]={'rows':len(rows),'dataSha256':digest.hexdigest()}
    return result

def integrity(client):
    sig=m.signature(client);checks=[]
    def zero(name,sql):
        count=int(client.run(sql));checks.append({'name':name,'violations':count,'pass':count==0})
        if count:raise m.SafetyError('Integrity violation: '+name)
    zero('all-fk-targets-in-restored-database',"SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND referenced_table_name IS NOT NULL AND referenced_table_schema<>DATABASE()")
    for fk in sig['foreignKeys']:
        zero('orphan:'+fk['name'],'SELECT COUNT(*) FROM '+ident(fk['table'])+' c LEFT JOIN '+ident(fk['ref'])+' p ON c.'+ident(fk['column'])+'=p.'+ident(fk['refColumn'])+' WHERE c.'+ident(fk['column'])+' IS NOT NULL AND p.'+ident(fk['refColumn'])+' IS NULL')
    keys={}
    for index in sig['indexes']:
        if index['unique']:keys.setdefault((index['table'],index['name']),[]).append(index['column'])
    for (table,name),columns in keys.items():
        notnull=' AND '.join(ident(c)+' IS NOT NULL' for c in columns)
        zero('duplicate:'+table+'.'+name,'SELECT COUNT(*) FROM (SELECT 1 FROM '+ident(table)+' WHERE '+notnull+' GROUP BY '+','.join(map(ident,columns))+' HAVING COUNT(*)>1) duplicates')
    for col in sig['columns']:
        if col['nullable']=='NO':zero('not-null:'+col['table']+'.'+col['name'],'SELECT COUNT(*) FROM '+ident(col['table'])+' WHERE '+ident(col['name'])+' IS NULL')
    for ck in sig['checks']:
        if ck['enforced']!='YES':raise m.SafetyError('A CHECK is not enforced')
        # MySQL information_schema CHECK_CLAUSE escapes quote delimiters (\').
        # It is a metadata display representation, not directly executable SQL.
        # The six expressions have already matched the reviewed manifest exactly.
        clause=ck['clause'].replace("\\'", "'")
        zero('check:'+ck['name'],'SELECT COUNT(*) FROM '+ident(ck['table'])+' WHERE ('+clause+')=0')
    queries={
      'order-detail-subtotal': 'SELECT COUNT(*) FROM order_details WHERE subtotal<>unit_price*quantity OR quantity<=0',
      'order-detail-sum': 'SELECT COUNT(*) FROM orders o LEFT JOIN (SELECT order_id,SUM(subtotal) amount FROM order_details GROUP BY order_id) d ON d.order_id=o.order_id WHERE d.amount IS NULL OR o.subtotal<>d.amount',
      'order-total': 'SELECT COUNT(*) FROM orders WHERE total_amount<>subtotal+shipping_fee OR subtotal IS NULL OR shipping_fee IS NULL OR total_amount IS NULL',
      'payment-amount': 'SELECT COUNT(*) FROM payments p JOIN orders o ON o.order_id=p.order_id WHERE p.amount<>o.total_amount',
      'completed-lifecycle': "SELECT COUNT(*) FROM orders o LEFT JOIN payments p ON p.order_id=o.order_id LEFT JOIN deliveries d ON d.order_id=o.order_id WHERE o.order_status='COMPLETED' AND (p.payment_status IS NULL OR p.payment_status<>'SUCCESS' OR p.paid_at IS NULL OR d.delivery_status IS NULL OR d.delivery_status<>'DELIVERED' OR d.driver_id IS NULL OR d.delivered_time IS NULL)",
      'refresh-within-session': 'SELECT COUNT(*) FROM refresh_tokens r JOIN auth_sessions s ON s.session_id=r.session_id WHERE r.expires_at>s.expires_at',
      'bcyrpt-format': "SELECT COUNT(*) FROM accounts WHERE NOT REGEXP_LIKE(password_hash,'^[$]2[aby][$](0[4-9]|[12][0-9]|3[01])[$][./A-Za-z0-9]{53}$','c')",
      'menu-price': 'SELECT COUNT(*) FROM restaurant_food_items WHERE price<=0'
    }
    for name,sql in queries.items():zero(name,sql)
    cod=int(client.run("SELECT COUNT(*) FROM payment_methods WHERE method_code='COD' AND method_name='Thanh toán khi nhận hàng' AND is_active=b'1'"))
    if cod!=1:raise m.SafetyError('Expected exactly one valid active COD configuration')
    checks.append({'name':'cod-config','pass':True})
    return checks

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--defaults-file',type=Path,required=True)
    parser.add_argument('--evidence-directory',type=Path,required=True)
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--verify-existing',action='store_true',help='SELECT-only verification; never restore again')
    parser.add_argument('--acknowledge')
    args=parser.parse_args();out=args.evidence_directory.resolve()
    if out.is_relative_to(m.ROOT):raise m.SafetyError('Evidence must remain outside Git')
    out.mkdir(parents=True,exist_ok=True)
    evidence={'source':SOURCE,'target':TARGET,'host':'127.0.0.1','port':3307,'dumpSha256':EXPECTED_SHA,
              'mainAccessed':False,'a24DataUsed':False,'restoreAttempted':False,'status':'PREFLIGHT'}
    try:
        if args.apply and args.verify_existing:raise m.SafetyError('Choose apply OR SELECT-only verify')
        sql=audit_dump()
        expected_uuid=json.loads((BASE/'main-baseline-rehearsal-20261112/setup-proof.json').read_text())['serverUuid']
        root=m.Client(args.defaults_file,3307,'information_schema');server_guard(m.inspect(root),expected_uuid)
        exists=root.run("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='"+TARGET+"'")
        if not args.verify_existing and exists!='0':
            raise m.SafetyError('Restore target already exists; do not reuse or drop it')
        if args.verify_existing and exists!='1':raise m.SafetyError('Existing restore target not available')
        source=m.Client(args.defaults_file,3307,SOURCE);server_guard(m.inspect(source),expected_uuid);m.verify(source)
        before=data_snapshot(source);source_schema=m.signature(source)
        if not args.apply and not args.verify_existing:
            evidence['status']='PREFLIGHT_PASS';return
        if args.apply:
            if args.acknowledge!=TARGET+'@127.0.0.1:3307':raise m.SafetyError('Exact restore acknowledgement required')
            root.run('CREATE DATABASE '+ident(TARGET)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci')
        target=m.Client(args.defaults_file,3307,TARGET);server_guard(m.inspect(target),expected_uuid)
        prefix="""CREATE TEMPORARY TABLE `_restore_guard` (`ok` INT NOT NULL CHECK (`ok`=1));
INSERT INTO `_restore_guard` SELECT IF(@@port=3307 AND DATABASE()='fooddelivery_restore_verification'
 AND @@server_uuid='{uuid}' AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE())=0,1,0);
""".format(uuid=expected_uuid)
        if args.apply:
            evidence['restoreAttempted']=True
            target.run(prefix+sql)
            evidence['restoreSqlSucceeded']=True
        else:evidence['verificationOnlyNoWrites']=True
        evidence['schema']=m.verify(target)
        if m.signature(target)!=source_schema:raise m.SafetyError('Source/restored schema definitions differ')
        restored=data_snapshot(target);after=data_snapshot(source)
        if before!=after:raise m.SafetyError('Rehearsal source changed during verification')
        if before!=restored:raise m.SafetyError('Restored rows differ from rehearsal snapshot; stop and investigate')
        evidence['data']=restored;evidence['all16TableDataDigestsMatch']=True
        evidence['sourceDataUnchanged']=True
        evidence['integrity']=integrity(target)
        evidence['integrityPassed']=sum(x['pass'] for x in evidence['integrity'])
        evidence['integrityFailed']=0
        fk_on=target.run('SELECT @@foreign_key_checks')=='1'
        if not fk_on:raise m.SafetyError('Foreign key checks disabled after restore')
        evidence['foreignKeyChecksEnabled']=True
        evidence['status']='PASS'
    except m.SafetyError as error:
        evidence.update(status='FAIL',reason=str(error))
        raise
    except Exception:
        evidence.update(status='FAIL',reason='Unexpected error; raw details withheld to protect dump data')
        raise
    finally:
        (out/'restore-result.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
        summary={k:v for k,v in evidence.items() if k not in ['data','integrity']}
        print(json.dumps(summary))

if __name__=='__main__':
    try:main()
    except Exception:sys.exit(1)
