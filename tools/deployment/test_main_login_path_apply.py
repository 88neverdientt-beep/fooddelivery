"""Mock-only Main operator regression; NEVER connects to MySQL or executes SQL."""
import argparse
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock,patch
import mysql_baseline as m
import preflight_main_login_path as p

UUID='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

class MainApplySafety(unittest.TestCase):
    def test_login_path_uses_no_defaults_no_password_and_tls(self):
        with patch.object(m.getpass,'getuser',return_value='HIEU'),patch.object(m,'option_file',side_effect=AssertionError('Must not read cnf')):
            c=m.Client(None,3306,'fooddelivery',login_path='fooddelivery_main')
        for flag in ['--no-defaults','--login-path=fooddelivery_main','--ssl-mode=REQUIRED','--skip-reconnect','--host=127.0.0.1','--port=3306','--database=fooddelivery']:
            self.assertIn(flag,c.command)
        self.assertFalse(any('password=' in x or 'defaults-file=' in x for x in c.command))
    def test_wrong_user_rejected(self):
        with patch.object(m.getpass,'getuser',return_value='Other'):
            with self.assertRaises(m.SafetyError):m.Client(None,3306,'fooddelivery',login_path='fooddelivery_main')
    def test_login_path_rejects_cnf_other_target_or_path(self):
        for defaults,port,db,login in [(Path('old.cnf'),3306,'fooddelivery','fooddelivery_main'),(None,3307,'fooddelivery','fooddelivery_main'),(None,3306,'hanoi_food','fooddelivery_main'),(None,3306,'fooddelivery','other')]:
            with self.assertRaises(m.SafetyError):m.Client(defaults,port,db,login_path=login)
    def test_setup_actions_not_enabled_for_login_path(self):
        for action in ['seed-cod','provision-app','backup']:
            with patch.object(m,'Client') as client:
                with self.assertRaises(m.SafetyError):m.main(['--profile','main','--login-path','fooddelivery_main','--expected-server-uuid',UUID,'--action',action])
                client.assert_not_called()
    def test_batch_has_exact_baseline_once_and_all_guards(self):
        sql=m.baseline_sql();batch=m.apply_sql(3306,'fooddelivery',UUID,sql)
        self.assertTrue(batch.endswith(sql));self.assertEqual(1,batch.count(sql))
        for fragment in ['GET_LOCK','IS_USED_LOCK','@@session.foreign_key_checks=1','@@session.unique_checks=1','information_schema.triggers',"DATABASE()='fooddelivery'"]:
            self.assertIn(fragment,batch)
        self.assertNotIn('DROP TABLE',batch);self.assertNotIn('FOREIGN_KEY_CHECKS=0',batch)
    def test_uuid_sql_injection_rejected(self):
        with self.assertRaises(m.SafetyError):m.apply_sql(3306,'fooddelivery',"x'; DROP TABLE x;",m.baseline_sql())
    def test_backup_inside_git_or_corrupted_is_rejected(self):
        with self.assertRaises(m.SafetyError):m.verify_main_backup(m.ROOT/'fake',UUID)
        with tempfile.TemporaryDirectory() as d:
            directory=Path(d);(directory/'preflight-backup.json').write_text(json.dumps({'status':'PASS','backupCreated':True}))
            (directory/'fooddelivery-before-baseline.sql').write_bytes(b'corrupted')
            (directory/'fooddelivery-before-baseline.sql.sha256').write_text('wrong  backup.sql')
            with self.assertRaises(m.SafetyError):m.verify_main_backup(directory,UUID)
    def fake_apply(self,directory,fail=False,existing=False,missing_backup=False):
        directory=Path(directory);restore=directory/'restore.json';restore.write_text(json.dumps({'status':'PASS','all16TableDataDigestsMatch':True,'integrityFailed':0,'dumpSha256':'541735cc459e7cd4095da06433c627ea937971085341b4b8aac3bb7ce8072ed2'}))
        audit=directory/'audit';audit.mkdir()
        if existing:(audit/'apply-attempt.json').write_text('{}')
        args=['--profile','main','--login-path','fooddelivery_main','--expected-server-uuid',UUID,'--action','apply','--acknowledge','fooddelivery@127.0.0.1:3306']
        if not missing_backup:args+=['--verified-backup-directory',str(directory/'backup'),'--verified-restore-report',str(restore),'--evidence-directory',str(audit)]
        state={'port':3306,'version':'8.0.46','uuid':UUID,'database':'fooddelivery','datadir':'C:/MySQL80/Data/','tables':0,'routines':0,'events':0,'triggers':0}
        client=Mock();batches=[]
        def sql(command):
            if command.startswith('SELECT GET_LOCK'):
                batches.append(command)
                if fail:raise m.SafetyError('MySQL operation failed; code=1064')
                return '1'
            if command.startswith('SELECT table_name'):return 'customers'
            if command.startswith('SELECT COUNT(*)'):return '0'
            raise AssertionError('Unexpected SQL')
        client.run.side_effect=sql
        schema={'tables':16,'primaryKeys':16,'foreignKeys':21,'uniqueConstraints':13,'checks':6}
        with patch.object(m,'Client',return_value=client),patch.object(m,'inspect',return_value=state),patch.object(m,'verify',return_value=schema),patch.object(m,'verify_main_backup',return_value={'verified':True}),patch.object(p,'inspect',return_value={}),patch.object(p,'guard'),contextlib.redirect_stdout(io.StringIO()):
            if fail or existing or missing_backup:
                with self.assertRaises((m.SafetyError,FileExistsError)):m.main(args)
            else:m.main(args)
        return batches,audit
    def test_missing_backup_prevents_any_ddl(self):
        with tempfile.TemporaryDirectory() as d:
            batches,_=self.fake_apply(d,missing_backup=True);self.assertEqual([],batches)
    def test_existing_attempt_never_reapplies(self):
        with tempfile.TemporaryDirectory() as d:
            batches,_=self.fake_apply(d,existing=True);self.assertEqual([],batches)
    def test_success_is_one_batch_and_no_seed(self):
        with tempfile.TemporaryDirectory() as d:
            batches,audit=self.fake_apply(d);self.assertEqual(1,len(batches))
            result=json.loads((audit/'apply-attempt.json').read_text());self.assertEqual('PASS',result['status']);self.assertEqual(0,sum(result['rowCounts'].values()))
    def test_partial_failure_only_inspects_never_retries_or_drops(self):
        with tempfile.TemporaryDirectory() as d:
            batches,audit=self.fake_apply(d,fail=True);self.assertEqual(1,len(batches))
            result=json.loads((audit/'apply-attempt.json').read_text());self.assertEqual('FAIL',result['status']);self.assertEqual(['customers'],result['actualTables'])
            self.assertFalse(result['automaticRetry']);self.assertFalse(result['automaticDrop'])

if __name__=='__main__':unittest.main()
