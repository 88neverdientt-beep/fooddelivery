"""Prepare Main signing keys/configuration ONLY. No database writes or process startup.

All private material stays in the already ACL-protected external secret directory.
The environment loader never prints the DB password and has no CLI export mode.
"""
from pathlib import Path
import argparse
import configparser
import json
import os
from urllib.parse import urlsplit,parse_qs
import mysql_baseline as m

REQUIRED={'FOOD_DB_URL','FOOD_DB_USERNAME','FOOD_DB_PASSWORD','FOOD_JWT_ISSUER',
          'FOOD_JWT_AUDIENCE','FOOD_JWT_PRIVATE_KEY_PATH','FOOD_JWT_PUBLIC_KEY_PATH','FOOD_WEB_ORIGIN'}

def validate_environment(env):
    issues=[]
    for key in sorted(REQUIRED):
        if not env.get(key):issues.append('Missing '+key)
    url=env.get('FOOD_DB_URL','')
    if not url.startswith('jdbc:mysql://127.0.0.1:3306/fooddelivery?'):
        issues.append('Datasource must be the exact Main TCP database')
    else:
        query=parse_qs(url.split('?',1)[1])
        if query!={'sslMode':['VERIFY_IDENTITY']} or '#' in url:issues.append('Use the reviewed MySQL VERIFY_IDENTITY URL without extra parameters')
    if env.get('FOOD_DB_USERNAME')!='fooddelivery_app':issues.append('Backend must use fooddelivery_app')
    origin=urlsplit(env.get('FOOD_WEB_ORIGIN',''))
    if origin.scheme!='https' or not origin.hostname or origin.username or origin.password or origin.path or origin.query or origin.fragment or '*' in origin.netloc:
        issues.append('One precise HTTPS frontend origin is required')
    if env.get('FOOD_JWT_ISSUER')!=env.get('FOOD_WEB_ORIGIN'):issues.append('Main issuer/public origin must match this deployment proposal')
    if env.get('FOOD_ADMIN_BOOTSTRAP_ENABLED','false').lower()!='false':issues.append('Bootstrap must remain disabled')
    if env.get('VITE_API_BASE_URL','/api')!='/api':issues.append('Frontend must use same-origin /api')
    for key in ['FOOD_JWT_PRIVATE_KEY_PATH','FOOD_JWT_PUBLIC_KEY_PATH']:
        if env.get(key) and not Path(env[key]).is_file():issues.append('Key file missing: '+key)
        elif env.get(key) and Path(env[key]).resolve().is_relative_to(m.ROOT):issues.append('Main key must remain outside repository: '+key)
    return issues

def load_environment(config_path):
    config=json.loads(Path(config_path).read_text(encoding='utf-8'))
    credential=Path(config['databaseCredentialFile']).resolve()
    if credential.is_relative_to(m.ROOT):raise m.SafetyError('Credential source must remain outside Git')
    options=configparser.ConfigParser(interpolation=None);options.read(credential,encoding='utf-8')
    values=options['client']
    if any(values.get(k)!=v for k,v in {'host':'127.0.0.1','port':'3306','user':'fooddelivery_app','database':'fooddelivery'}.items()):
        raise m.SafetyError('Unexpected credential datasource target')
    env=dict(config['environment'])
    env['FOOD_DB_PASSWORD']=json.loads(values['password'])
    env['FOOD_ADMIN_BOOTSTRAP_ENABLED']='false'
    env['VITE_API_BASE_URL']='/api'
    issues=validate_environment(env)
    if issues:raise m.SafetyError('Prepared runtime fields invalid: '+','.join(issues))
    return env

def prepare(secret,output,origin):
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    secret=secret.resolve();output=output.resolve()
    if secret.is_relative_to(m.ROOT) or output.is_relative_to(m.ROOT) or not secret.is_dir() or not output.is_dir():
        raise m.SafetyError('Use pre-created ACL-protected directories outside Git')
    private=secret/'main-jwt-private.pem';public=secret/'main-jwt-public.pem'
    config_path=output/'main-runtime-inputs.json'
    if any(p.exists() for p in [private,public,config_path]):raise m.SafetyError('Existing Main key/config must not be overwritten or rotated')
    candidate={'FOOD_DB_URL':'jdbc:mysql://127.0.0.1:3306/fooddelivery?sslMode=VERIFY_IDENTITY',
       'FOOD_DB_USERNAME':'fooddelivery_app','FOOD_JWT_ISSUER':origin,'FOOD_JWT_AUDIENCE':'fooddelivery-main',
       'FOOD_JWT_PRIVATE_KEY_PATH':str(private).replace('\\','/'),'FOOD_JWT_PUBLIC_KEY_PATH':str(public).replace('\\','/'),
       'FOOD_WEB_ORIGIN':origin}
    parsed=urlsplit(origin)
    if parsed.scheme!='https' or not parsed.hostname or parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password or '*' in parsed.netloc:
        raise m.SafetyError('Invalid proposed HTTPS origin')
    # OS/OpenSSL CSPRNG; PKCS#8 private and SubjectPublicKeyInfo public match JwtConfiguration.
    pair=rsa.generate_private_key(public_exponent=65537,key_size=3072)
    with private.open('xb') as file:file.write(pair.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
    with public.open('xb') as file:file.write(pair.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo))
    config={'state':'PREPARED_NOT_STARTED','originIsProposal':True,'databaseCredentialFile':str(secret/'mysql-app.cnf'),
            'environment':candidate,'backendLoopbackPort':18090,'managementLoopbackPort':19100,
            'httpsCertificate':str(secret/'main-https-cert.pem'),'httpsPrivateKey':str(secret/'main-https-key.pem'),
            'httpsTrustVerified':False,'mysqlIdentityTrustVerified':False,'adminBootstrapApproved':False}
    with config_path.open('x',encoding='utf-8') as file:json.dump(config,file,indent=2)
    env=load_environment(config_path)
    return {'status':'PREPARED','rsaBits':pair.key_size,'privateKeyPath':str(private),'publicKeyPath':str(public),
            'runtimeInputsPath':str(config_path),'requiredVariableNamesPresent':sorted(REQUIRED),
            'environmentFieldValidation':not validate_environment(env),'credentialContentsPrinted':False,
            'keysOrPasswordsLogged':False,'databaseConnected':False,'mainWebsiteStarted':False,
            'realHttpsReady':False,'mysqlVerifyIdentityReady':False,'originIsProposal':True}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--secret-directory',type=Path,required=True);p.add_argument('--prepared-directory',type=Path,required=True);p.add_argument('--origin',required=True)
    a=p.parse_args();result=prepare(a.secret_directory,a.prepared_directory,a.origin)
    (a.prepared_directory/'preparation-result.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(json.dumps({'status':'BLOCKED','errorType':type(e).__name__,'detailsWithheld':True}));raise SystemExit(1)
