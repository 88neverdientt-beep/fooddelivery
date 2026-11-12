"""Destructive probes ONLY in the approved new rehearsal database, never Main/A2.4.

Run after baseline verification with the separately protected rehearsal fixture file.
All constraint probes roll back. HTTP probes create fresh tagged rehearsal records.
Print test names/status only; never print SQL parameters, HTTP bodies or credentials.
"""
from pathlib import Path
import argparse
import json
import re
import subprocess
import sys
import uuid
import mysql_baseline as m

DATABASE = 'fooddelivery_main_rehearsal'
SEED_ID = 910001
SESSION = '11111111-1111-4111-8111-111111111111'

def q(value):
    return "'" + str(value).replace('\\','\\\\').replace("'","''") + "'"

def seed(hashed):
    i=SEED_ID
    return f"""START TRANSACTION;
INSERT INTO customers(customer_id,name,email,password,phone_number,address,created_at) VALUES ({i},'Probe','probe-c@rehearsal.invalid',{q(hashed)},'0900000000','Probe',NOW(6));
INSERT INTO restaurants(restaurant_id,name,email,password,phone_number,address,created_at,restaurant_status) VALUES ({i},'Probe','probe-r@rehearsal.invalid',{q(hashed)},'0900000000','Probe',NOW(6),1);
INSERT INTO drivers(driver_id,name,email,password,phone_number,address,created_at,drive_status) VALUES ({i},'Probe','probe-d@rehearsal.invalid',{q(hashed)},'0900000000','Probe',NOW(6),1);
INSERT INTO food_items(item_id,name) VALUES ({i},'Probe');
INSERT INTO payment_methods(method_id,method_code,method_name,is_active) VALUES ({i},'PROBE','Probe',1);
INSERT INTO restaurant_food_items(restaurant_food_item_id,restaurant_id,item_id,price,is_available) VALUES ({i},{i},{i},35000,1);
INSERT INTO carts(cart_id,customer_id,restaurant_id) VALUES ({i},{i},{i});
INSERT INTO cart_items(cart_item_id,cart_id,restaurant_food_item_id,quantity) VALUES ({i},{i},{i},1);
INSERT INTO orders(order_id,customer_id,restaurant_id,delivery_address,subtotal,shipping_fee,total_amount,order_status,created_at) VALUES ({i},{i},{i},'Probe',35000,15000,50000,'PENDING',NOW(6));
INSERT INTO order_details(order_detail_id,order_id,restaurant_food_item_id,quantity,unit_price,subtotal) VALUES ({i},{i},{i},1,35000,35000);
INSERT INTO deliveries(delivery_id,order_id,driver_id,delivery_status) VALUES ({i},{i},{i},'PENDING');
INSERT INTO payments(payment_id,order_id,payment_method_id,amount,payment_status,created_at) VALUES ({i},{i},{i},50000,'PENDING',NOW(6));
INSERT INTO ratings(rating_id,customer_id,restaurant_id,rating_score,created_at) VALUES ({i},{i},{i},5,NOW(6));
INSERT INTO accounts(account_id,email,password_hash,role) VALUES ({i},'probe-admin@rehearsal.invalid',{q(hashed)},'ADMIN');
INSERT INTO accounts(account_id,email,password_hash,role,customer_id) VALUES ({i+1},'probe-c@rehearsal.invalid',{q(hashed)},'CUSTOMER',{i});
INSERT INTO accounts(account_id,email,password_hash,role,restaurant_id) VALUES ({i+2},'probe-r@rehearsal.invalid',{q(hashed)},'RESTAURANT',{i});
INSERT INTO accounts(account_id,email,password_hash,role,driver_id) VALUES ({i+3},'probe-d@rehearsal.invalid',{q(hashed)},'DRIVER',{i});
INSERT INTO auth_sessions(session_id,account_id,created_at,expires_at) VALUES ('{SESSION}',{i},'2026-01-01','2026-01-02');
INSERT INTO refresh_tokens(refresh_token_id,session_id,token_hash,created_at,expires_at) VALUES ({i},'{SESSION}',UNHEX(REPEAT('ab',32)),'2026-01-01','2026-01-02');
"""

def constraints(client, fixture, record):
    sig=m.signature(client);i=SEED_ID
    counts=lambda:{t['name']:int(client.run('SELECT COUNT(*) FROM `'+t['name']+'`')) for t in sig['tables']}
    before=counts();prefix=seed(fixture['hash'])
    def reject(name,sql,code):
        r=subprocess.run(client.command,input=prefix+sql+';\nROLLBACK;',text=True,encoding='utf-8',capture_output=True)
        found=re.search(r'ERROR\s+(\d+)',r.stderr)
        # Limited DML users may receive generic 1216/1217 rather than 1452/1451.
        # The targeted column, existing FK definition and valid seed are still checked.
        expected={1452,1216} if code==1452 else ({1451,1217} if code==1451 else {code})
        record(name, r.returncode!=0 and found is not None and int(found[1]) in expected)
    client.run(prefix+'ROLLBACK;');record('transaction-valid-16-table-rollback',counts()==before)
    primary={x['table']:x['column'] for x in sig['indexes'] if x['name']=='PRIMARY'}
    def row(table,account_column=None):
        if table=='auth_sessions':return q(SESSION)
        if table=='accounts' and account_column in ['customer_id','restaurant_id','driver_id']:
            return str(i+{'customer_id':1,'restaurant_id':2,'driver_id':3}[account_column])
        return str(i)
    for fk in sig['foreignKeys']:
        table=fk['table'];column=fk['column'];value=q('99999999-9999-4999-8999-999999999999') if column=='session_id' else '9223372036854775807'
        reject('fk:'+fk['name'],f"UPDATE `{table}` SET `{column}`={value} WHERE `{primary[table]}`={row(table,column)}",1452)
    for table,pk in primary.items():
        reject('pk:'+table,f"INSERT INTO `{table}` SELECT * FROM `{table}` WHERE `{pk}`={row(table)}",1062)
    unique={}
    for x in sig['indexes']:
        if x['unique'] and x['name']!='PRIMARY':unique.setdefault((x['table'],x['name']),[]).append(x['column'])
    for (table,name),columns in unique.items():
        pk=primary[table];select=[];account_column=next((c for c in columns if c.endswith('_id')),None) if table=='accounts' else None
        for c in [x['name'] for x in sig['columns'] if x['table']==table]:
            if c==pk:select.append(str(i+99))
            elif table=='accounts' and c=='email' and columns!=['email']:select.append("'unique-probe@rehearsal.invalid'")
            else:select.append('`'+c+'`')
        reject('unique:'+name,f"INSERT INTO `{table}` SELECT {','.join(select)} FROM `{table}` WHERE `{pk}`={row(table,account_column)}",1062)
    checks={
      'ck_accounts_role':f"UPDATE accounts SET role='UNSUPPORTED' WHERE account_id={i}",
      'ck_accounts_status':f"UPDATE accounts SET status='UNKNOWN' WHERE account_id={i}",
      'ck_accounts_email_normalized':f"UPDATE accounts SET email='UPPER@rehearsal.invalid' WHERE account_id={i}",
      'ck_accounts_profile':f"UPDATE accounts SET customer_id={i} WHERE account_id={i}",
      'ck_sessions_expiry':f"UPDATE auth_sessions SET expires_at=created_at WHERE session_id='{SESSION}'",
      'ck_refresh_expiry':f"UPDATE refresh_tokens SET expires_at=created_at WHERE refresh_token_id={i}"
    }
    assert set(checks)=={c['name'] for c in sig['checks']}
    for name,sql in checks.items():reject('check:'+name,sql,3819)
    for c in sig['columns']:
        table=c['table'];column=c['name']
        if c['nullable']=='NO' and column!=primary[table]:
            account_column='customer_id' if table=='accounts' and column=='role' else None
            reject('not-null:'+table+'.'+column,f"UPDATE `{table}` SET `{column}`=NULL WHERE `{primary[table]}`={row(table,account_column)}",1048)
    reject('parent-delete-restricted',f'DELETE FROM customers WHERE customer_id={i}',1451)
    reject('account-delete-does-not-cascade-sessions',f'DELETE FROM accounts WHERE account_id={i}',1451)
    record('all-negative-probes-rolled-back',counts()==before)
    # Existing authenticated account creation must remain after rejected registration transaction.
    client.run('START TRANSACTION; INSERT INTO customers(name,email,password,phone_number,address,created_at) VALUES (\'Rollback\',\'rollback@rehearsal.invalid\','+q(fixture['hash'])+",'0900000000','Probe',NOW(6)); ROLLBACK;")
    record('registration-profile-rollback',client.run("SELECT COUNT(*) FROM customers WHERE email='rollback@rehearsal.invalid'")=='0')
    sql="START TRANSACTION; INSERT INTO customers(name,email,password,phone_number,address,created_at) VALUES ('Rollback account','rollback-account@rehearsal.invalid',"+q(fixture['hash'])+",'0900000000','Probe',NOW(6)); INSERT INTO accounts(email,password_hash,role,customer_id) VALUES ("+q(fixture['adminEmail'])+','+q(fixture['hash'])+",'CUSTOMER',LAST_INSERT_ID()); ROLLBACK;"
    failed=subprocess.run(client.command,input=sql,text=True,encoding='utf-8',capture_output=True)
    record('failed-account-insert-rolls-back-profile',failed.returncode!=0 and '1062' in failed.stderr and client.run("SELECT COUNT(*) FROM customers WHERE email='rollback-account@rehearsal.invalid'")=='0')
    saved=counts()
    try:m.guard(m.inspect(client),'rehearsal',m.inspect(client)['uuid'],True);refused=False
    except m.SafetyError:refused=True
    record('second-baseline-refused-without-changes',refused and counts()==saved)
    try:client.run('CREATE TABLE `_permission_probe`(id BIGINT)');denied=False
    except m.SafetyError as e:denied='1142' in str(e)
    record('dml-account-cannot-create-table',denied)

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--run-directory',type=Path,required=True);args=p.parse_args()
    run=args.run_directory.resolve();private=run/'private'
    if run.is_relative_to(m.ROOT):raise m.SafetyError('Rehearsal credentials must be outside Git')
    c=m.Client(private/'app.cnf',3307,DATABASE)
    proof=json.loads((run/'setup-proof.json').read_text());m.guard(m.inspect(c),'rehearsal',proof['serverUuid'],False);m.verify(c)
    fixture=json.loads((private/'fixture.json').read_text())
    records=[]
    def record(name,ok):
        records.append({'name':name,'pass':bool(ok)})
        if not ok:raise AssertionError('Rehearsal assertion failed: '+name)
    try:
        constraints(c,fixture,record)
    finally:
        result={'passed':sum(r['pass'] for r in records),'failed':sum(not r['pass'] for r in records),'tests':records}
        (run/'constraint-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
        print(json.dumps({k:v for k,v in result.items() if k!='tests'}))

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(json.dumps({'status':'FAIL','errorType':type(e).__name__,'detailsWithheld':True}));sys.exit(1)
