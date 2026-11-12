"""Restore safety and read-only checker regression tests; no real DB connection."""
import contextlib
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock,patch
import verify_restore as v

class RestoreSafety(unittest.TestCase):
    def state(self):
        return {'port':3307,'version':'8.0.46','uuid':'test-uuid',
                'database':v.TARGET,'datadir':v.m.TEST_DATADIR}
    def test_exact_test_target(self):v.server_guard(self.state(),'test-uuid')
    def test_main_and_a24_contexts_rejected(self):
        for database in ['fooddelivery','hanoi_food','fooddelivery_coursework_a24']:
            state=self.state();state['database']=database
            with self.assertRaises(v.m.SafetyError):v.server_guard(state,'test-uuid')
    def test_wrong_port_uuid_version_datadir(self):
        for key,value in [('port',3306),('uuid','wrong'),('version','8.0.45'),('datadir','C:/Main/Data/')]:
            state=self.state();state[key]=value
            with self.assertRaises(v.m.SafetyError):v.server_guard(state,'test-uuid')
    def test_changed_dump_refused(self):
        dump=Mock();dump.read_bytes.return_value=b'changed'
        with patch.object(v,'DUMP',dump):
            with self.assertRaises(v.m.SafetyError):v.audit_dump()
    def valid_dump(self):
        names=json.loads(v.m.MANIFEST.read_text())['tableOrder']
        return '\n'.join('CREATE TABLE `'+name+'` (id BIGINT);' for name in names)
    def audit(self,sql):
        raw=sql.encode();dump=Mock();dump.read_bytes.return_value=raw
        with patch.object(v,'DUMP',dump),patch.object(v,'EXPECTED_SHA',hashlib.sha256(raw).hexdigest()):
            return v.audit_dump()
    def test_reviewed_table_set(self):self.assertEqual(self.valid_dump(),self.audit(self.valid_dump()))
    def test_forbidden_scope_commands(self):
        for command in ['USE other;', 'CREATE DATABASE other;', 'DROP TABLE `orders`;',
                        'SELECT * FROM `other`.`orders`;', 'SOURCE other.sql', '\\! shell',
                        '/*! SET @@GLOBAL.GTID_PURGED=1 */;', 'DEFINER=root']:
            with self.assertRaises(v.m.SafetyError):self.audit(command+'\n'+self.valid_dump())
    def test_duplicate_table_set_refused(self):
        with self.assertRaises(v.m.SafetyError):self.audit(self.valid_dump()+'\nCREATE TABLE `accounts` (id BIGINT);')
    def test_escaped_check_metadata_is_not_executed_verbatim(self):
        signature={'foreignKeys':[],'indexes':[],'columns':[],
                   'checks':[{'name':'ck_accounts_role','table':'accounts','enforced':'YES',
                              'clause':r"(`role` = _utf8mb4\'ADMIN\')"}]}
        class ReadOnly:
            def run(self,sql):
                self_outer.assertTrue(sql.startswith('SELECT '))
                self_outer.assertNotIn("\\'",sql)
                return '1' if "method_code='COD'" in sql else '0'
        self_outer=self
        with patch.object(v.m,'signature',return_value=signature):
            result=v.integrity(ReadOnly());self.assertTrue(all(x['pass'] for x in result))
    def test_verify_existing_only_selects(self):
        outer=self
        class ReadOnly:
            def __init__(self,defaults,port,database):self.database=database;outer.assertEqual(3307,port)
            def run(self,sql):
                outer.assertTrue(sql.lstrip().startswith('SELECT '), 'Read-only mode attempted mutation')
                return '1'
        def state(client):
            s=self.state();s['database']=client.database;return s
        with tempfile.TemporaryDirectory() as d:
            base=Path(d);proof=base/'main-baseline-rehearsal-20261112';proof.mkdir()
            (proof/'setup-proof.json').write_text(json.dumps({'serverUuid':'test-uuid'}))
            args=['verify_restore.py','--defaults-file','unused.cnf','--evidence-directory',str(base/'evidence'),'--verify-existing']
            with patch.object(v,'BASE',base),patch.object(v.sys,'argv',args),patch.object(v,'audit_dump',return_value='not executed'),patch.object(v.m,'Client',ReadOnly),patch.object(v.m,'inspect',side_effect=state),patch.object(v.m,'verify',return_value={'tables':16}),patch.object(v.m,'signature',return_value={}),patch.object(v,'data_snapshot',return_value={}),patch.object(v,'integrity',return_value=[{'pass':True}]),contextlib.redirect_stdout(io.StringIO()):
                v.main()
            result=json.loads((base/'evidence/restore-result.json').read_text())
            self.assertEqual('PASS',result['status']);self.assertFalse(result['restoreAttempted'])
            self.assertTrue(result['verificationOnlyNoWrites'])

if __name__=='__main__':unittest.main()
