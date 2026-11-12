"""Offline SQL relocation checks. No credential access, subprocess or DB calls."""
from pathlib import Path
import hashlib
import json
import unittest
import xml.etree.ElementTree as ET
import mysql_baseline as m

class DatabaseLayout(unittest.TestCase):
    def manifest(self):
        return json.loads((m.ROOT/'docs/coursework/sql-reorganization-checksums.json').read_text(encoding='utf-8'))
    def test_all_sql_and_reference_bytes_preserved(self):
        rows=self.manifest()['files'];self.assertEqual(8,len(rows))
        for row in rows:
            path=m.ROOT/row['currentPath']
            self.assertTrue(path.is_file(),row['currentPath'])
            self.assertEqual(row['beforeSha256'],row['afterSha256'])
            self.assertEqual(row['beforeSha256'],hashlib.sha256(path.read_bytes()).hexdigest(),row['currentPath'])
    def test_exact_database_tree(self):
        expected={r['currentPath'].removeprefix('database/') for r in self.manifest()['files']}|{'README.md'}
        actual={p.relative_to(m.ROOT/'database').as_posix() for p in (m.ROOT/'database').rglob('*') if p.is_file()}
        self.assertEqual(expected,actual)
    def test_old_locations_removed(self):
        for row in self.manifest()['files']:self.assertFalse((m.ROOT/row['originalPath']).exists())
    def test_operator_uses_new_locations(self):
        self.assertEqual(m.ROOT/'database/baseline/001_fooddelivery_baseline.sql',m.BASELINE)
        self.assertEqual(m.ROOT/'database/schema-reference.json',m.MANIFEST)
        self.assertTrue(m.baseline_sql())
        source=(m.ROOT/'tools/deployment/mysql_baseline.py').read_text(encoding='utf-8')
        for name in ['002_fooddelivery_app.sql','003_cod.sql']:
            self.assertIn('database/setup/'+name,source)
    def test_maven_copies_migrations_only_for_tests(self):
        ns={'m':'http://maven.apache.org/POM/4.0.0'}
        pom=ET.parse(m.ROOT/'pom.xml')
        configured=[]
        for r in pom.findall('m:build/m:testResources/m:testResource',ns):
            directory=r.findtext('m:directory',namespaces=ns)
            if directory=='database/migrations':
                configured.append(r)
                self.assertEqual('database/migrations',r.findtext('m:targetPath',namespaces=ns))
                self.assertEqual(['*.sql'],[x.text for x in r.findall('m:includes/m:include',ns)])
                self.assertNotEqual('true',r.findtext('m:filtering',namespaces=ns))
        self.assertEqual(1,len(configured))
        self.assertIsNone(pom.find('m:build/m:resources',ns))
    def test_java_migration_test_uses_new_classpath(self):
        source=(m.ROOT/'src/test/java/vn/gaugaugau/fooddelivery/auth/AuthMigrationMySqlTest.java').read_text(encoding='utf-8')
        self.assertIn('new ClassPathResource("database/migrations/"+file)',source)
        self.assertIn('RUN_STAGE2_AUTH_SCHEMA_TESTS',source)
        self.assertIn('ApprovedMySqlTestTarget.assertTarget(jdbc)',source)
    def test_manifest_still_pins_rehearsed_canonical_sql(self):
        expected=json.loads(m.MANIFEST.read_text(encoding='utf-8'))['baselineSha256']
        self.assertEqual('78173e7f31856cd4b8a7f8a42cc4127fc971ad8e00c176c56346e52d3fefb893',expected)
        self.assertEqual(expected,hashlib.sha256(m.BASELINE.read_text(encoding='utf-8').encode()).hexdigest())

if __name__=='__main__':unittest.main()
