"""Offline safety/config tests. All credentials and keys here are temporary fixtures."""
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
import main_runtime_security as runtime
import setup_main

class MainRuntimeSecurity(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory();self.addCleanup(self.directory.cleanup)
        self.root=Path(self.directory.name)
        for name in ['private.pem','public.pem']:(self.root/name).write_text('fixture-not-a-real-key')
        self.env={'FOOD_DB_URL':'jdbc:mysql://127.0.0.1:3306/fooddelivery?sslMode=VERIFY_IDENTITY','FOOD_DB_USERNAME':'fooddelivery_app','FOOD_DB_PASSWORD':'fixture-only',
            'FOOD_JWT_ISSUER':'https://fooddelivery.localhost:8443','FOOD_JWT_AUDIENCE':'fooddelivery-main','FOOD_WEB_ORIGIN':'https://fooddelivery.localhost:8443',
            'FOOD_JWT_PRIVATE_KEY_PATH':str(self.root/'private.pem'),'FOOD_JWT_PUBLIC_KEY_PATH':str(self.root/'public.pem')}
    def invalid(self,key,value):
        changed=dict(self.env);changed[key]=value;self.assertTrue(runtime.validate_environment(changed))
    def test_complete_fields(self):self.assertEqual([],runtime.validate_environment(self.env))
    def test_missing_fields(self):
        for key in runtime.REQUIRED:self.invalid(key,'')
    def test_datasource_pinned(self):
        for url in ['jdbc:mysql://127.0.0.1:3307/fooddelivery','jdbc:mysql://localhost:3306/fooddelivery','jdbc:mysql://127.0.0.1:3306/hanoi_food?sslMode=VERIFY_IDENTITY','jdbc:mysql://127.0.0.1:3306/fooddelivery_other?sslMode=VERIFY_IDENTITY']:
            self.invalid('FOOD_DB_URL',url)
    def test_no_tls_downgrade_or_extra_session_options(self):
        for query in ['sslMode=REQUIRED','sslMode=DISABLED','sslMode=VERIFY_IDENTITY&sessionVariables=foreign_key_checks=0','sslMode=VERIFY_IDENTITY#fragment','sslMode=VERIFY_IDENTITY&sslMode=REQUIRED']:
            self.invalid('FOOD_DB_URL','jdbc:mysql://127.0.0.1:3306/fooddelivery?'+query)
    def test_no_root_backend(self):self.invalid('FOOD_DB_USERNAME','root')
    def test_https_precise_origin(self):
        for origin in ['http://fooddelivery.localhost:8443','https://*.localhost','https://user:fixture@fooddelivery.localhost','https://fooddelivery.localhost/path','https://fooddelivery.localhost?x=1','https://fooddelivery.localhost#fragment']:
            self.invalid('FOOD_WEB_ORIGIN',origin)
    def test_issuer_must_match_reviewed_public_origin(self):self.invalid('FOOD_JWT_ISSUER','https://different.test')
    def test_bootstrap_disabled(self):self.invalid('FOOD_ADMIN_BOOTSTRAP_ENABLED','true')
    def test_frontend_same_origin(self):self.invalid('VITE_API_BASE_URL','http://127.0.0.1:18090')
    def test_missing_key(self):self.invalid('FOOD_JWT_PRIVATE_KEY_PATH',str(self.root/'missing'))
    def test_loader_credentials_stay_in_memory(self):
        secret=self.root/'mysql.cnf';secret.write_text(setup_main.credential_text('f'*32),encoding='utf-8')
        config=self.root/'runtime.json';config.write_text(json.dumps({'databaseCredentialFile':str(secret),'environment':{k:v for k,v in self.env.items() if k!='FOOD_DB_PASSWORD'}}))
        loaded=runtime.load_environment(config);self.assertEqual('f'*32,loaded['FOOD_DB_PASSWORD']);self.assertNotIn('f'*32,config.read_text());self.assertEqual('false',loaded['FOOD_ADMIN_BOOTSTRAP_ENABLED'])
    def test_no_overwrite_existing_keys(self):
        secret=self.root/'secret';secret.mkdir();output=self.root/'output';output.mkdir();key=secret/'main-jwt-private.pem';key.write_text('preserve-fixture')
        with patch('cryptography.hazmat.primitives.asymmetric.rsa.generate_private_key') as generator:
            with self.assertRaises(runtime.m.SafetyError):runtime.prepare(secret,output,self.env['FOOD_WEB_ORIGIN'])
            generator.assert_not_called()
        self.assertEqual('preserve-fixture',key.read_text())
    def test_no_preparation_inside_repository(self):
        with self.assertRaises(runtime.m.SafetyError):runtime.prepare(runtime.m.ROOT,self.root,self.env['FOOD_WEB_ORIGIN'])
    def test_runtime_yaml_is_validate_loopback_and_external(self):
        text=(runtime.m.ROOT/'deploy/application-main.example.yml').read_text()
        for expected in ['ddl-auto: validate','mode: never','address: 127.0.0.1','port: 18090','port: 19100','forward-headers-strategy: none','${FOOD_DB_PASSWORD}','${FOOD_WEB_ORIGIN}']:self.assertIn(expected,text)
        for forbidden in ['ddl-auto: update','ddl-auto: create','username: root','address: 0.0.0.0']:self.assertNotIn(forbidden,text)
    def test_nginx_preserves_cookie_scope_and_private_backend(self):
        text=(runtime.m.ROOT/'deploy/nginx-main.windows.example.conf').read_text()
        for expected in ['listen 127.0.0.1:8443 ssl','server_name fooddelivery.localhost','proxy_pass http://127.0.0.1:18090/','proxy_cookie_path /auth /api/auth','proxy_next_upstream off','ssl_protocols TLSv1.2 TLSv1.3']:self.assertIn(expected,text)
        self.assertNotIn('19100',text);self.assertNotIn('ssl_verify_client off',text);self.assertNotIn('3307',text)

if __name__=='__main__':unittest.main()
