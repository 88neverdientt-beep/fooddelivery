"""Start/stop only the loopback reports fixture backend; no Main configuration is loaded."""
from pathlib import Path
import configparser,json,os,socket,subprocess,sys,time
import mysql_baseline as m
WORK=Path('F:/New folder/fooddelivery-admin-reports-20261113')
DB='fooddelivery_admin_reports'
def main():
    config=configparser.ConfigParser(interpolation=None);config.read(WORK/'secrets/app.cnf',encoding='utf-8');c=config['client']
    if (c['host'],c['port'],c['database'],c['user'])!=('127.0.0.1','3307',DB,'fooddelivery_reports_app'):raise m.SafetyError('Wrong fixture target')
    client=m.Client(WORK/'secrets/app.cnf',3307,DB);state=m.inspect(client)
    if state['uuid']!='a87623fb-db83-11f1-83cc-40c2ba627c1b' or state['database']!=DB:raise m.SafetyError('Wrong test instance')
    for port in [18084,19094]:
        with socket.socket() as sock:
            if sock.connect_ex(('127.0.0.1',port))==0:raise m.SafetyError('Reserved test port occupied')
    env={k:v for k,v in os.environ.items() if not k.startswith(('FOOD_','RUN_','SPRING_','STAGE')) and not k.startswith('LOGGING_') and k not in ['JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','DEBUG','TRACE']}
    env.update(FOOD_DB_URL='jdbc:mysql://127.0.0.1:3307/'+DB+'?sslMode=REQUIRED',FOOD_DB_USERNAME=c['user'],FOOD_DB_PASSWORD=json.loads(c['password']),FOOD_JWT_ISSUER='https://127.0.0.1:18447',FOOD_JWT_AUDIENCE='reports-test',FOOD_JWT_PRIVATE_KEY_PATH=str(WORK/'secrets/jwt-private.pem'),FOOD_JWT_PUBLIC_KEY_PATH=str(WORK/'secrets/jwt-public.pem'),FOOD_ADMIN_BOOTSTRAP_ENABLED='false')
    java='C:/Program Files/JetBrains/IntelliJ IDEA 2026.2.2/jbr/bin/java.exe'
    with (WORK/'backend-runtime.log').open('wb') as log:
        p=subprocess.Popen([java,'-Xmx384m','-Duser.timezone=Asia/Ho_Chi_Minh','-jar',str(WORK/'build/target/fooddelivery-0.0.1-SNAPSHOT.jar'),'--debug=false','--trace=false','--logging.level.root=WARN','--logging.level.org.springframework=WARN','--logging.level.org.hibernate=WARN','--server.port=18084','--server.address=127.0.0.1','--management.server.port=19094','--management.server.address=127.0.0.1','--spring.jpa.hibernate.ddl-auto=validate','--spring.sql.init.mode=never','--fooddelivery.jwt.allowed-origins[0]=https://127.0.0.1:18447'],env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    (WORK/'backend-test-pid.json').write_text(json.dumps({'pid':p.pid,'port':18084,'database':DB}))
    for _ in range(50):
        if p.poll() is not None:raise m.SafetyError('Backend exited; inspect sanitized startup log')
        with socket.socket() as sock:
            if sock.connect_ex(('127.0.0.1',18084))==0:print(json.dumps({'backendReady':True,'pid':p.pid,'port':18084,'ddlAuto':'validate','mainStarted':False}));return
        time.sleep(1)
    raise m.SafetyError('Backend startup timeout; inspect owned PID')
if __name__=='__main__':
    try:main()
    except Exception as e:print(json.dumps({'status':'BLOCKED','errorType':type(e).__name__,'detailsWithheld':True}));sys.exit(1)
