"""No database or credential access; safety checks for the Main backup operator."""
import copy
import unittest
from unittest.mock import patch
import preflight_main_login_path as p

class MainBackupSafety(unittest.TestCase):
    def state(self):
        return {'identity':{'port':3306,'version':'8.0.46','uuid':'main-uuid',
                           'database':'fooddelivery','account':'root@localhost','hostname':'fixture-pc',
                           'datadir':'C:/MySQL80/Data/'},
                'schema':{'charset':'utf8mb4','collation':'utf8mb4_unicode_ci'},
                'objects':dict(tablesAndViews=0,routines=0,events=0,triggers=0),
                'settings':dict(sqlMode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION',defaultEngine='InnoDB',
                                innodbStrict=1,rowFormat='dynamic',pageSize=16384,readOnly=0,superReadOnly=0),
                'innodb':[{'transactions':'YES'}],'collations':[{}, {}, {}],
                'tls':{'Ssl_cipher':'fixture-encrypted'},'otherConnections':[]}
    def guard(self,state):
        with patch.dict(p.os.environ,{'COMPUTERNAME':'fixture-pc'}):p.guard(state,'main-uuid')
    def test_database_unicode_default_is_preserved(self):self.guard(self.state())
    def test_wrong_namespace_port_uuid_and_operator(self):
        for key,value in [('port',3307),('database','hanoi_food'),('database','fooddelivery_coursework_a24'),
                          ('uuid','wrong'),('version','8.0.45'),('account','other@localhost')]:
            s=self.state();s['identity'][key]=value
            with self.assertRaises(p.Refused):self.guard(s)
    def test_any_persistent_object_refused(self):
        for key in self.state()['objects']:
            s=self.state();s['objects'][key]=1
            with self.assertRaises(p.Refused):self.guard(s)
    def test_active_connection_and_plaintext_refused(self):
        s=self.state();s['otherConnections']=[{'command':'Query','count':1}]
        with self.assertRaises(p.Refused):self.guard(s)
        s=self.state();s['tls']={}
        with self.assertRaises(p.Refused):self.guard(s)
    def test_mysql_read_helper_refuses_writes(self):
        with patch.object(p.subprocess,'run') as run:
            for sql in ['CREATE TABLE x(id INT)','INSERT INTO x VALUES(1)','GRANT SELECT ON *.* TO x']:
                with self.assertRaises(p.Refused):p.mysql(sql)
            run.assert_not_called()
    def empty_dump(self):
        return b'-- MySQL dump 10.13\n-- Host: 127.0.0.1    Database: fooddelivery\n-- Server version 8.0.46\n/*!40101 SET NAMES utf8mb4 */;\n-- Dump completed on 2026-11-12\n'
    def test_realistic_empty_backup_valid(self):
        self.assertEqual(0,p.verify_empty_dump(self.empty_dump())['dataStatementCount'])
    def test_wrong_or_incomplete_backup_refused(self):
        for raw in [b'',self.empty_dump().replace(b'fooddelivery',b'otherdb'),self.empty_dump().replace(b'Dump completed on',b'Incomplete')]:
            with self.assertRaises(p.Refused):p.verify_empty_dump(raw)
    def test_unexpected_data_or_namespace_refused(self):
        for extra in [b'CREATE TABLE `orders`(id INT);',b'INSERT INTO `orders` VALUES(1);',
                      b'USE other;',b'CREATE DATABASE other;',b'SELECT * FROM `other`.`orders`;']:
            with self.assertRaises(p.Refused):p.verify_empty_dump(self.empty_dump()+extra)
    def test_reviewed_collations_and_manifest(self):
        result=p.baseline_check();self.assertEqual(16,result['explicitTableCollations'])
        self.assertEqual((16,21,13,6),tuple(result[k] for k in ['pk','fk','unique','check']))

if __name__=='__main__':unittest.main()
