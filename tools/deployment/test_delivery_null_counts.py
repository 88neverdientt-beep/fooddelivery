"""Execute the repository's actual grouping SQL with NULL fixtures in SQLite RAM.

No MySQL connections or database files. ANSI COUNT/CASE/GROUP BY semantics only;
this is not evidence for MySQL runtime/JDBC behavior.
"""
from pathlib import Path
import re
import sqlite3
import unittest

class DeliveryNullCountSql(unittest.TestCase):
    def queries(self):
        source=(Path(__file__).resolve().parents[2]/'src/main/java/vn/gaugaugau/fooddelivery/repository/BusinessReportRepository.java').read_text(encoding='utf-8')
        base=re.search(r'DELIVERY_FROM="([^"]+)"',source)[1]
        selects=re.findall(r'jdbc\.queryForList\("(SELECT d\.driver_id[^"]+)"\+DELIVERY_FROM\+q\.where\(\)\+"([^"]+)"',source)
        self.assertEqual(2,len(selects),'Must cover both paginated and exported driver groups')
        return [(select+base+' WHERE o.created_at>=? AND o.created_at<?'+tail,tail) for select,tail in selects]
    def check_fixture(self,fixture):
        with sqlite3.connect(':memory:') as db:
            db.row_factory=sqlite3.Row
            db.executescript('CREATE TABLE orders(order_id INTEGER,created_at TEXT); CREATE TABLE drivers(driver_id INTEGER,name TEXT); CREATE TABLE deliveries(order_id INTEGER,driver_id INTEGER,delivery_status TEXT);')
            for driver in sorted({driver for driver,_ in fixture}):db.execute('INSERT INTO drivers VALUES (?,?)',(driver,'RAM Driver '+str(driver)))
            for order,(driver,status) in enumerate(fixture,1):
                db.execute('INSERT INTO orders VALUES (?,?)',(order,'2026-11-15 12:00:00'));db.execute('INSERT INTO deliveries VALUES (?,?,?)',(order,driver,status))
            expected={driver:{'assigned':sum(d==driver for d,_ in fixture),'delivered':sum(d==driver and s=='DELIVERED' for d,s in fixture),'cancelled':sum(d==driver and s=='CANCELLED' for d,s in fixture)} for driver,_ in fixture}
            for query,tail in self.queries():
                params=['2026-11-01','2026-12-01']+([50,0] if 'LIMIT ?' in tail else [])
                rows=[dict(row) for row in db.execute(query,params)]
                self.assertEqual(len(expected),len(rows))
                for row in rows:
                    for key,value in expected[row['driverId']].items():self.assertEqual(value,row[key],(key,fixture))
                self.assertEqual(sum(row['assigned'] for row in rows),len(fixture))
            self.assertEqual(len(fixture),db.execute('SELECT COUNT(*) FROM deliveries').fetchone()[0])
    def test_null_only_driver(self):self.check_fixture([(1,None),(1,None)])
    def test_mixed_driver(self):self.check_fixture([(1,None),(1,'DELIVERED'),(1,'PENDING')])
    def test_multiple_drivers_one_null_only(self):self.check_fixture([(1,None),(2,'DELIVERED'),(2,'CANCELLED')])
    def test_empty(self):self.check_fixture([])
    def test_all_valid_states(self):self.check_fixture([(1,s) for s in ['PENDING','PICKED_UP','DELIVERING','DELIVERED','CANCELLED']])

if __name__=='__main__':unittest.main()
