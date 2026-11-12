"""Read-only readiness check; no database connection and no secret values printed."""
from pathlib import Path
import json
import os
import re
import sys
from urllib.parse import urlsplit, parse_qs

def main():
    issues=[]
    required=['FOOD_DB_URL','FOOD_DB_USERNAME','FOOD_DB_PASSWORD','FOOD_JWT_ISSUER',
              'FOOD_JWT_AUDIENCE','FOOD_JWT_PRIVATE_KEY_PATH','FOOD_JWT_PUBLIC_KEY_PATH','FOOD_WEB_ORIGIN']
    for name in required:
        # Do not retrieve the password; existence is enough for this preparation check.
        if name not in os.environ:issues.append('Missing '+name)
    url=os.environ.get('FOOD_DB_URL','')
    if url:
        match=re.fullmatch(r'jdbc:mysql://127\.0\.0\.1:3306/fooddelivery(?:\?([^#]*))?',url)
        if not match:issues.append('Datasource must be the exact main loopback database')
        elif parse_qs(match[1] or '').get('sslMode')!=['VERIFY_IDENTITY']:
            issues.append('MySQL identity verification / trusted CA configuration needs review')
    if 'FOOD_DB_USERNAME' in os.environ and os.environ['FOOD_DB_USERNAME']!='fooddelivery_app':
        issues.append('Unexpected main application username')
    origin=os.environ.get('FOOD_WEB_ORIGIN','')
    if origin:
        u=urlsplit(origin)
        if u.scheme!='https' or not u.hostname or u.username or u.password or u.path or u.query or u.fragment:
            issues.append('Use a precise HTTPS origin without credentials/path/query/fragment')
    for name in ['FOOD_JWT_PRIVATE_KEY_PATH','FOOD_JWT_PUBLIC_KEY_PATH']:
        if name in os.environ and not Path(os.environ[name]).is_file():issues.append('Missing key file for '+name)
    if os.environ.get('FOOD_ADMIN_BOOTSTRAP_ENABLED','').lower()=='true':
        issues.append('Bootstrap must be disabled during normal startup')
    print(json.dumps({'status':'BLOCKED' if issues else 'CONFIG_PRESENT_NOT_LIVE_VERIFIED',
                      'issues':issues,'databaseConnected':False,'secretValuesPrinted':False}))
    return 1 if issues else 0

if __name__=='__main__':sys.exit(main())
