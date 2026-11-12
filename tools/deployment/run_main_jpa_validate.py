"""Headless JPA validation using current model bytecode and in-memory Login Path credentials.

Native my_print_defaults output is captured ONLY in memory and sent to a short-lived
JVM over stdin. Never print, persist or place credentials in argv/environment/logs.
No SpringApplication, HTTP listener, business service, entity persist or schema writer.
"""
from pathlib import Path
import argparse
import base64
import getpass
import hashlib
import json
import subprocess
import sys
import zipfile
import mysql_baseline as m

JAVA_HOME=Path('C:/Program Files/JetBrains/IntelliJ IDEA 2026.2.2/jbr')
NATIVE=Path('C:/Program Files/MySQL/MySQL Server 8.0/bin/my_print_defaults.exe')

def prepare(jar,work):
    frozen=jar.parent.parent/'src/main/java';current=m.ROOT/'src/main/java'
    paths=list(current.rglob('*.java'))
    if len(paths)!=len(list(frozen.rglob('*.java'))) or any(not (frozen/p.relative_to(current)).is_file() or p.read_bytes()!=(frozen/p.relative_to(current)).read_bytes() for p in paths):
        raise m.SafetyError('Frozen application artifact does not match current Java source')
    classes=work/'application-classes';libs=work/'libs';helper=work/'helper-classes'
    for p in [classes,libs,helper]:p.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(jar) as z:
        for name in z.namelist():
            if name.endswith('/'):continue
            if name.startswith('BOOT-INF/classes/'):
                target=classes/name.removeprefix('BOOT-INF/classes/')
                if not target.resolve().is_relative_to(classes.resolve()):raise m.SafetyError('Invalid artifact path')
            elif name.startswith('BOOT-INF/lib/') and name.endswith('.jar'):target=libs/Path(name).name
            else:continue
            target.parent.mkdir(parents=True,exist_ok=True)
            content=z.read(name)
            if not target.exists() or target.read_bytes()!=content:target.write_bytes(content)
    cp=str(classes)+';'+str(libs/'*')+';'+str(helper)
    source=Path(__file__).with_name('MainJpaValidate.java')
    compiled=subprocess.run([str(JAVA_HOME/'bin/javac.exe'),'-cp',cp,'-d',str(helper),str(source)],capture_output=True)
    if compiled.returncode:raise m.SafetyError('JPA checker compilation failed; raw compiler output withheld')
    return cp,{'applicationJavaFilesMatched':len(paths),'applicationJarSha256':hashlib.sha256(jar.read_bytes()).hexdigest(),
               'checkerSourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--mode',choices=['probe','validate'],required=True)
    p.add_argument('--application-jar',type=Path,required=True)
    p.add_argument('--work-directory',type=Path,required=True)
    p.add_argument('--expected-server-uuid',required=True)
    args=p.parse_args();work=args.work_directory.resolve()
    if work.is_relative_to(m.ROOT) or getpass.getuser().casefold()!='hieu':raise m.SafetyError('Use an external work directory under Windows HIEU')
    work.mkdir(parents=True,exist_ok=True)
    report={'status':'STARTED','mode':args.mode,'webServerStarted':False,'credentialsLoggedOrPersisted':False,
            'credentialTransport':'native Login Path -> captured RAM -> JVM stdin','test3307Accessed':False}
    try:
        client=m.Client(None,3306,'fooddelivery',login_path='fooddelivery_main')
        state=m.inspect(client);m.guard(state,'main',args.expected_server_uuid,empty=args.mode=='probe')
        if args.mode=='validate':
            report['schema']=m.verify(client)
            names=json.loads(m.MANIFEST.read_text(encoding='utf-8'))['tableOrder']
            before={name:int(client.run('SELECT COUNT(*) FROM `'+name+'`')) for name in names}
            if any(before.values()):raise m.SafetyError('Expected schema-only Main before validation')
        cp,proof=prepare(args.application_jar.resolve(),work);report.update(proof)
        # NEVER forward native stdout/stderr. --show is used only inside this captured subprocess.
        native=subprocess.run([str(NATIVE),'--no-defaults','--login-path=fooddelivery_main','--show','client'],capture_output=True)
        if native.returncode:raise m.SafetyError('Native Login Path access failed; output withheld')
        options={}
        for line in native.stdout.decode('utf-8').splitlines():
            if line.startswith('--') and '=' in line:
                key,_,value=line[2:].partition('=');options[key]=value
        if options.get('user')!='root' or 'password' not in options:raise m.SafetyError('Expected native Login Path fields unavailable')
        payload=base64.b64encode(options['user'].encode())+b'\n'+base64.b64encode(options['password'].encode())+b'\n'
        options.clear();del native
        result=subprocess.run([str(JAVA_HOME/'bin/java.exe'),'-Dorg.jboss.logging.provider=slf4j','-cp',cp,
                               'MainJpaValidate',args.mode,args.expected_server_uuid],input=payload,capture_output=True)
        del payload
        messages=[]
        for line in result.stdout.decode('utf-8',errors='replace').splitlines():
            if line.startswith('{"status":'):messages.append(json.loads(line))
        allowed={'status','mode','jdbcReadOnly','writeBlockedBeforeExecution','webServerStarted',
                 'entities','ddlAuto','businessEntitiesPersisted','errorType','detailsWithheld'}
        if not messages or any(set(row)-allowed for row in messages):raise m.SafetyError('Unexpected checker response; output withheld')
        report['jpa']=messages[-1]
        if result.returncode or report['jpa']['status']!='PASS':raise m.SafetyError('Headless JPA check failed; raw JDBC details withheld')
        if args.mode=='validate':
            after={name:int(client.run('SELECT COUNT(*) FROM `'+name+'`')) for name in names}
            if before!=after or any(after.values()):raise m.SafetyError('Unexpected Main row counts after validation')
            report['all16TablesRemainEmpty']=True;report['rowCounts']=after
        report['status']='PASS'
    except m.SafetyError as e:
        report.update(status='BLOCKED',reason=str(e));raise
    except Exception:
        report.update(status='BLOCKED',reason='Unexpected failure; raw credential/JDBC details withheld');raise
    finally:
        (work/(args.mode+'-result.json')).write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps({k:v for k,v in report.items() if k!='rowCounts'}))

if __name__=='__main__':
    try:main()
    except Exception:sys.exit(1)
