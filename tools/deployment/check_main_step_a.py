"""Approved Step A checks: offline RSA plus read-only Main metadata/JPA. No startup or writes."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import mysql_baseline as m
import setup_main as setup
import run_main_jpa_validate as jpa
import main_runtime_security as runtime

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work-directory',type=Path,required=True)
    parser.add_argument('--application-jar',type=Path,required=True)
    args=parser.parse_args();work=args.work_directory.resolve()
    if work.is_relative_to(m.ROOT):raise m.SafetyError('Evidence must stay outside repository')
    config=json.loads((work/'main-runtime-inputs.json').read_text(encoding='utf-8'))
    env=runtime.load_environment(work/'main-runtime-inputs.json')
    # Never export this environment to an application process in Step A.
    del env['FOOD_DB_PASSWORD']
    credential=Path(config['databaseCredentialFile']);credential_sha=hashlib.sha256(credential.read_bytes()).digest()
    root=m.Client(None,3306,'fooddelivery',login_path='fooddelivery_main')
    before=setup.current(root)
    expected={table:0 for table in before['rowCounts']};expected['payment_methods']=1
    if before['rowCounts']!=expected:raise m.SafetyError('Main no longer matches approved COD-only state')
    prepared=setup.prepare(args.application_jar,work/'read-check')
    source=Path(__file__).with_name('MainRsaReadCheck.java')
    result=subprocess.run([str(jpa.JAVA_HOME/'bin/javac.exe'),'-cp',prepared['classpath'],'-d',str(work/'read-check/jpa/helper-classes'),str(source)],capture_output=True)
    if result.returncode:raise m.SafetyError('RSA helper compilation failed; details withheld')
    result=subprocess.run([str(jpa.JAVA_HOME/'bin/java.exe'),'-cp',prepared['classpath'],'MainRsaReadCheck',config['environment']['FOOD_JWT_PRIVATE_KEY_PATH'],config['environment']['FOOD_JWT_PUBLIC_KEY_PATH'],config['environment']['FOOD_JWT_ISSUER']],capture_output=True)
    messages=[json.loads(line) for line in result.stdout.decode('utf-8',errors='replace').splitlines() if line.startswith('{"status":')]
    if result.returncode or not messages or messages[-1]['status']!='PASS':raise m.SafetyError('Offline Main RSA check failed; details withheld')
    result={'rsa':messages[-1],'appReadOnlyJpa':setup.check_app('cod',credential,prepared),'grants':setup.app_grants(root)}
    after=setup.current(root)
    if after!=before:raise m.SafetyError('Main metadata or row count changed during read-only verification')
    result.update(status='PASS',before=before,after=after,mainUnchanged=True,bootstrapRun=False,websiteStarted=False,test3307Accessed=False,
        appCredentialContentUnchanged=credential_sha==hashlib.sha256(credential.read_bytes()).digest(),
        mysqlVerifyIdentityVerified=False,realHttpsVerified=False)
    if not result['appCredentialContentUnchanged']:raise m.SafetyError('Protected input changed')
    (work/'read-only-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ['before','after','grants']}))

if __name__=='__main__':
    try:main()
    except Exception as failure:
        print(json.dumps({'status':'BLOCKED','errorType':type(failure).__name__,'detailsWithheld':True}));raise SystemExit(1)
