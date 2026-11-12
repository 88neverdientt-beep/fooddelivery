"""No server connection, subprocess, credentials or persistent database writes."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import mysql_baseline as m

class Guards(unittest.TestCase):
    def state(self, profile='rehearsal'):
        port, database = m.TARGETS[profile]
        return dict(port=port,database=database,version='8.0.46',uuid='a'*36,
                    datadir=m.TEST_DATADIR if profile=='rehearsal' else 'C:/MySQL80/Data/',
                    tables=0,routines=0,events=0,triggers=0)
    def test_correct_rehearsal(self):
        m.guard(self.state(),'rehearsal','a'*36,True)
    def test_correct_main_preflight_is_read_only(self):
        m.guard(self.state('main'),'main','a'*36,True)
    def test_wrong_ports(self):
        for profile in m.TARGETS:
            s=self.state(profile);s['port']=3306 if profile=='rehearsal' else 3307
            with self.assertRaises(m.SafetyError):m.guard(s,profile,'a'*36,True)
    def test_old_project_and_a24_rejected(self):
        for database in ['hanoi_food','fooddelivery_coursework_a24','fooddelivery']:
            s=self.state();s['database']=database
            with self.assertRaises(m.SafetyError):m.guard(s,'rehearsal','a'*36,True)
    def test_uuid_mismatch(self):
        with self.assertRaises(m.SafetyError):m.guard(self.state(),'rehearsal','b'*36,True)
    def test_mysql_version(self):
        s=self.state();s['version']='8.0.45'
        with self.assertRaises(m.SafetyError):m.guard(s,'rehearsal','a'*36,True)
    def test_wrong_datadir(self):
        for profile in m.TARGETS:
            s=self.state(profile);s['datadir']='C:/Other/' if profile=='rehearsal' else m.TEST_DATADIR
            with self.assertRaises(m.SafetyError):m.guard(s,profile,'a'*36,True)
    def test_nonempty_even_one_table(self):
        s=self.state();s['tables']=1
        with self.assertRaises(m.SafetyError):m.guard(s,'rehearsal','a'*36,True)
    def test_other_objects(self):
        for obj in ['routines','events','triggers']:
            s=self.state();s[obj]=1
            with self.assertRaises(m.SafetyError):m.guard(s,'rehearsal','a'*36,True)
    def test_verify_allows_installed_schema(self):
        s=self.state();s['tables']=16;m.guard(s,'rehearsal','a'*36,False)
    def test_option_file_rejects_init_command_and_includes(self):
        for bad in ['init-command=SELECT 1','!include other.cnf']:
            with tempfile.TemporaryDirectory() as d:
                p=Path(d)/'client.cnf';p.write_text('[client]\nhost=127.0.0.1\nport=3307\n'+bad+'\n')
                with self.assertRaises(m.SafetyError):m.option_file(p,3307)
    def test_option_file_rejects_wrong_endpoint(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'client.cnf';p.write_text('[client]\nhost=127.0.0.1\nport=3306\n')
            with self.assertRaises(m.SafetyError):m.option_file(p,3307)
    def test_baseline_is_reviewed_schema_only(self):
        sql=m.baseline_sql();self.assertEqual(16,sql.count('CREATE TABLE `'))
        self.assertEqual(21,sql.count('FOREIGN KEY'))
        self.assertEqual(13,sql.count('UNIQUE KEY'))
        self.assertEqual(6,sql.count(' CHECK '))
        self.assertNotIn('INSERT INTO',sql);self.assertNotIn('AUTO_INCREMENT=',sql)
    def test_drift_refused(self):
        manifest=json.loads(m.MANIFEST.read_text());manifest['baselineSha256']='bad'
        real_read=Path.read_text
        def read(path,*a,**kw):
            return json.dumps(manifest) if path==m.MANIFEST else real_read(path,*a,**kw)
        with patch.object(Path,'read_text',read):
            with self.assertRaises(m.SafetyError):m.baseline_sql()
    def test_schema_comparison_catches_same_counts_different_column(self):
        sig=json.loads(m.MANIFEST.read_text())['signature']
        altered=copy.deepcopy(sig);altered['columns'][0]['nullable']='NO' if altered['columns'][0]['nullable']=='YES' else 'YES'
        with patch.object(m,'signature',return_value=altered):
            with self.assertRaises(m.SafetyError):m.verify(None)

if __name__=='__main__':unittest.main()
