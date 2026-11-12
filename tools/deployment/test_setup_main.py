"""Mock-only setup safety tests; no real account creation, grant or database access."""
import configparser
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock,patch
import setup_main as s

class SetupMainSafety(unittest.TestCase):
    def test_immutable_templates_scope(self):
        create,grant,cod,hashes=s.scripts()
        self.assertIn('IDENTIFIED BY RANDOM PASSWORD',create)
        self.assertEqual(1,create.count('CREATE USER'));self.assertNotIn('IF NOT EXISTS',create)
        self.assertIn('GRANT SELECT, INSERT, UPDATE, DELETE ON `fooddelivery`.*',grant)
        self.assertIn("('COD','Thanh toán khi nhận hàng',b'1')",cod)
        self.assertNotIn('UPDATE',cod);self.assertEqual(2,len(hashes))
    def test_credential_roundtrip_with_quotes_and_backslash(self):
        for password in ['X'*32,('X'*29)+'"\\!']:
            cfg=configparser.ConfigParser(interpolation=None);cfg.read_string(s.credential_text(password))
            self.assertEqual(password,json.loads(cfg['client']['password']))
            self.assertEqual('REQUIRED',cfg['client']['ssl-mode'])
    def test_bad_credential_size_and_control_characters_refused(self):
        for password in ['x'*20,'x'*31+'\n']:
            with self.assertRaises(s.m.SafetyError):s.credential_text(password)
    def grant_client(self,bad=None):
        rows=[{'database':'fooddelivery','privilege':p,'grantable':'NO'} for p in sorted(s.PRIVILEGES)]
        if bad=='database':rows[0]['database']='otherdb'
        if bad=='grant':rows[0]['grantable']='YES'
        responses=['\n'.join(json.dumps(r) for r in rows),'USAGE','0','0',"GRANT USAGE ON *.* TO `fooddelivery_app`@`127.0.0.1`\nGRANT SELECT, INSERT, UPDATE, DELETE ON `fooddelivery`.* TO `fooddelivery_app`@`127.0.0.1`"]
        if bad=='global':responses[1]='USAGE\nCREATE'
        if bad=='role':responses[2]='1'
        client=Mock();client.run.side_effect=responses;return client
    def test_exact_four_schema_grants(self):self.assertEqual(4,len(s.app_grants(self.grant_client())['schemaPrivileges']))
    def test_other_database_grant_option_global_or_role_refused(self):
        for bad in ['database','grant','global','role']:
            with self.assertRaises(s.m.SafetyError):s.app_grants(self.grant_client(bad))
    def workflow(self,directory,grant_fails=False,existing_user=False,existing_secret=False):
        directory=Path(directory);secret=directory/'app.cnf'
        if existing_secret:secret.write_text('preserve-existing')
        schema={'tables':16,'primaryKeys':16,'foreignKeys':21,'uniqueConstraints':13,'checks':6}
        names=json.loads(s.m.MANIFEST.read_text())['tableOrder'];state={'created':False,'cod':False,'commands':[]}
        def run(sql):
            state['commands'].append(sql)
            if 'FROM mysql.user' in sql:return '1' if existing_user or state['created'] else '0'
            if sql=='SELECT @@mandatory_roles':return ''
            if 'CREATE USER' in sql:state['created']=True;return 'fooddelivery_app\t127.0.0.1\t'+('X'*32)
            if sql.startswith('GRANT'):
                if grant_fails:raise s.m.SafetyError('Simulated grant failure 1142')
                return ''
            if sql=='SELECT COUNT(*) FROM payment_methods':return '0'
            if sql.startswith('START TRANSACTION'):state['cod']=True;return ''
            if sql.startswith('SELECT JSON_OBJECT'):return json.dumps({'id':1,'code':'COD','name':'Thanh toán khi nhận hàng','active':1})
            if sql.startswith('SELECT COUNT(*) FROM `'):return '0'
            raise AssertionError('Unexpected SQL')
        client=Mock();client.run.side_effect=run
        def current(_):
            rows={name:0 for name in names};rows['payment_methods']=int(state['cod']);return {'schema':schema,'rowCounts':rows}
        args=['setup_main.py','--work-directory',str(directory),'--application-jar','unused.jar','--credential-output',str(secret),'--apply','--acknowledge','fooddelivery_app+COD@127.0.0.1:3306/fooddelivery']
        with patch.object(s.sys,'argv',args),patch.object(s.m,'Client',return_value=client),patch.object(s,'current',side_effect=current),patch.object(s,'prepare',return_value={'classpath':'unused'}),patch.object(s,'app_grants',return_value={'verified':True}),patch.object(s,'check_app',side_effect=lambda mode,*a:{'status':'PASS','mode':mode}),contextlib.redirect_stdout(io.StringIO()):
            if grant_fails or existing_user or existing_secret:
                with self.assertRaises(s.m.SafetyError):s.main()
            else:s.main()
        return state,secret
    def test_one_account_one_cod_no_other_mutations(self):
        with tempfile.TemporaryDirectory() as d:
            state,secret=self.workflow(d);self.assertTrue(secret.is_file())
            self.assertEqual(1,sum('CREATE USER' in c for c in state['commands']))
            self.assertEqual(1,sum(c.startswith('START TRANSACTION') for c in state['commands']))
            self.assertFalse(any('DROP' in c or 'ALTER USER' in c or 'CREATE TABLE' in c for c in state['commands']))
            self.assertEqual('PASS',json.loads((Path(d)/'setup-attempt.json').read_text())['status'])
    def test_grant_failure_preserves_credential_stops_before_cod(self):
        with tempfile.TemporaryDirectory() as d:
            state,secret=self.workflow(d,grant_fails=True);self.assertTrue(secret.stat().st_size>0);self.assertFalse(state['cod'])
            report=json.loads((Path(d)/'setup-attempt.json').read_text());self.assertEqual('FAIL',report['status'])
            self.assertTrue(report['credentialSavedOutsideGit']);self.assertFalse(report['automaticReset']);self.assertFalse(report['automaticDrop'])
    def test_existing_account_not_reset_or_granted(self):
        with tempfile.TemporaryDirectory() as d:
            state,_=self.workflow(d,existing_user=True);self.assertFalse(any('CREATE USER' in c or c.startswith('GRANT') for c in state['commands']))
    def test_existing_secret_not_overwritten(self):
        with tempfile.TemporaryDirectory() as d:
            state,secret=self.workflow(d,existing_secret=True);self.assertEqual('preserve-existing',secret.read_text());self.assertEqual([],state['commands'])

if __name__=='__main__':unittest.main()
