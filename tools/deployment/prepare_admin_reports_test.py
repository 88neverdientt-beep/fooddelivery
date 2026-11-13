"""One-shot, approved test target ONLY. Never Main/old test schemas. No credentials printed."""
from pathlib import Path
import json,sys,subprocess,configparser
from datetime import datetime,timedelta
import mysql_baseline as m
import run_main_jpa_validate as jpa

DB='fooddelivery_admin_reports'
APP='fooddelivery_reports_app'
WORK=Path('F:/New folder/fooddelivery-admin-reports-20261113')
SECRET=WORK/'secrets'
def main():
    if (WORK/'setup-attempt.json').exists():raise m.SafetyError('Prior attempt exists; inspect instead of retry')
    root=m.Client(Path('F:/New folder/food-delivery-mysql-test/root.cnf'),3307,'mysql')
    state=m.inspect(root)
    if state['port']!=3307 or state['uuid']!='a87623fb-db83-11f1-83cc-40c2ba627c1b' or state['datadir'].casefold().rstrip('/')!='f:/new folder/food-delivery-mysql-test/data' or state['version']!='8.0.46':raise m.SafetyError('Isolation not confirmed')
    if root.run(f"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='{DB}'")!='0' or root.run(f"SELECT COUNT(*) FROM mysql.user WHERE user='{APP}'")!='0':raise m.SafetyError('New test schema/account already exists')
    cp,proof=jpa.prepare(WORK/'build/target/fooddelivery-0.0.1-SNAPSHOT.jar',WORK/'fixture-compiler')
    source=Path(__file__).with_name('ReportFixtureIdentity.java')
    p=subprocess.run([str(jpa.JAVA_HOME/'bin/javac.exe'),'-cp',cp,'-d',str(WORK/'fixture-compiler/helper-classes'),str(source)],capture_output=True)
    if p.returncode:raise m.SafetyError('Fixture helper compilation failed')
    p=subprocess.run([str(jpa.JAVA_HOME/'bin/java.exe'),'-cp',cp,'ReportFixtureIdentity',str(SECRET/'fixture-auth.json')],capture_output=True)
    if p.returncode:raise m.SafetyError('Fixture helper failed; details withheld')
    auth=json.loads((SECRET/'fixture-auth.json').read_text());hashed=auth['hash']
    # No password literal enters the fixture SQL; only fresh BCrypt hashes.
    (WORK/'setup-attempt.json').write_text(json.dumps({'isolation':state,'started':True,'mainTouched':False},indent=2))
    root.run(f'CREATE DATABASE `{DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci')
    target=m.Client(Path('F:/New folder/food-delivery-mysql-test/root.cnf'),3307,DB)
    target.run(m.baseline_sql());schema=m.verify(target)
    raw=root.run(f"SET SESSION generated_random_password_length=32; CREATE USER '{APP}'@'127.0.0.1' IDENTIFIED BY RANDOM PASSWORD;")
    parts=raw.splitlines()[0].split('\t');password=parts[2]
    cfg='[client]\nhost=127.0.0.1\nport=3307\nprotocol=tcp\nuser='+APP+'\npassword='+json.dumps(password)+'\ndatabase='+DB+'\ndefault-character-set=utf8mb4\n'
    (SECRET/'app.cnf').write_text(cfg,encoding='utf-8');del password,raw,parts
    root.run(f"GRANT SELECT,INSERT,UPDATE,DELETE ON `{DB}`.* TO '{APP}'@'127.0.0.1'")
    def quote(s):return "'"+s.replace('\\','\\\\').replace("'","''")+"'"
    h=quote(hashed)
    sql=f"""START TRANSACTION;
INSERT INTO customers(customer_id,name,email,password,phone_number,address,created_at) VALUES (1,'Khách Việt','customer@reports.invalid',{h},'0900000000','Fixture',NOW(6));
INSERT INTO restaurants(restaurant_id,name,email,password,phone_number,address,created_at,restaurant_status) VALUES (1,'Bếp Việt','restaurant@reports.invalid',{h},'0900000001','Fixture',NOW(6),1),(2,'Bếp Hai','restaurant2@reports.invalid',{h},'0900000002','Fixture',NOW(6),1);
INSERT INTO drivers(driver_id,name,email,password,phone_number,address,created_at,drive_status) VALUES (1,'Tài xế Một','driver@reports.invalid',{h},'0900000003','Fixture',NOW(6),1),(2,'Tài xế Hai','driver2@reports.invalid',{h},'0900000004','Fixture',NOW(6),1);
INSERT INTO accounts(account_id,email,password_hash,role,status,customer_id,restaurant_id,driver_id) VALUES (1,'admin@reports.invalid',{h},'ADMIN','ACTIVE',NULL,NULL,NULL),(2,'customer@reports.invalid',{h},'CUSTOMER','ACTIVE',1,NULL,NULL),(3,'restaurant@reports.invalid',{h},'RESTAURANT','ACTIVE',NULL,1,NULL),(4,'driver@reports.invalid',{h},'DRIVER','ACTIVE',NULL,NULL,1);
INSERT INTO payment_methods(method_id,method_code,method_name,is_active) VALUES (1,'COD','COD fixture',1);
"""
    # Multiple orders, restaurants/drivers, pending/refunded/cancelled/unpaid, invalid duration and microsecond boundary.
    rows=[(1,'2026-11-01 00:00:00.000000','COMPLETED','SUCCESS',1,1,'DELIVERED',True,True),(2,'2026-11-01 12:00:00','COMPLETED','PENDING',1,1,'DELIVERED',True,True),(3,'2026-11-02 12:00:00','CANCELLED','CANCELLED',2,2,'CANCELLED',False,False),(4,'2026-11-03 12:00:00','DELIVERING','PENDING',2,2,'DELIVERING',True,False),(5,'2026-11-30 23:59:59.999999','COMPLETED','SUCCESS',2,2,'DELIVERED',True,True),(6,'2026-12-01 00:00:00','COMPLETED','SUCCESS',1,1,'DELIVERED',True,True),(7,'2026-10-31 23:59:59.999999','COMPLETED','SUCCESS',1,1,'DELIVERED',True,True),(8,'2026-11-05 12:00:00','COMPLETED','REFUNDED',1,1,'DELIVERED',False,True),(9,'2026-11-06 12:00:00','COMPLETED','SUCCESS',1,1,'DELIVERED',True,True),(10,'2026-11-07 12:00:00','PENDING','PENDING',1,None,'PENDING',False,False)]
    for i,created,status,payment,restaurant,driver,delivery,pickup,done in rows:
        pickup_at=(datetime.fromisoformat(created)+timedelta(minutes=5)).isoformat(sep=' ')
        done_at=(datetime.fromisoformat(created)+timedelta(minutes=25)).isoformat(sep=' ')
        paid=quote(done_at) if payment=='SUCCESS' and i!=9 else 'NULL'
        sql+=f"INSERT INTO orders(order_id,customer_id,restaurant_id,delivery_address,subtotal,shipping_fee,total_amount,created_at,order_status) VALUES ({i},1,{restaurant},'Fixture',100000.00,20000.00,120000.00,'{created}','{status}');\n"
        sql+=f"INSERT INTO payments(payment_id,order_id,payment_method_id,amount,created_at,paid_at,payment_status) VALUES ({i},{i},1,120000,'{created}',{paid},'{payment}');\n"
        sql+=f"INSERT INTO deliveries(delivery_id,order_id,driver_id,pickup_time,delivered_time,delivery_status) VALUES ({i},{i},{driver if driver else 'NULL'},{quote(pickup_at) if pickup else 'NULL'},{quote(done_at) if done else 'NULL'},'{delivery}');\n"
    sql+='COMMIT;';target.run(sql)
    # Keys belong only to this test environment, never Main/A2.4.
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    (SECRET/'jwt-private.pem').write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
    (SECRET/'jwt-public.pem').write_bytes(key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo))
    result={'status':'PASS','database':DB,'port':3307,'schema':schema,'fixtureOrders':len(rows),'adminIsTestFixtureOnly':True,'mainTouched':False,'oldTestSchemasModified':False}
    (WORK/'setup-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
if __name__=='__main__':
    try:main()
    except Exception as e:print(json.dumps({'status':'BLOCKED','errorType':type(e).__name__,'detailsWithheld':True}));sys.exit(1)
