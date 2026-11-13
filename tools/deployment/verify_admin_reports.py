"""Raw SQL -> real HTTP -> XLSX comparison on the approved fixture schema only; negative probes restored in finally."""
from pathlib import Path
import json,sys,urllib.parse,zipfile,io,xml.etree.ElementTree as ET
from http.client import HTTPConnection
from decimal import Decimal,ROUND_HALF_UP
import mysql_baseline as m
WORK=Path('F:/New folder/fooddelivery-admin-reports-20261113')
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
checks=[]
def check(name,condition):
    checks.append({'name':name,'pass':bool(condition)})
    if not condition:raise m.SafetyError('Assertion failed: '+name)
def http(path,token=None,method='GET',data=None,extra=None):
    c=HTTPConnection('127.0.0.1',18084,timeout=30);headers={} if extra is None else dict(extra)
    if token:headers['Authorization']='Bearer '+token
    if data is not None:headers['Content-Type']='application/json';data=json.dumps(data)
    c.request(method,path,data,headers);r=c.getresponse();body=r.read();status=r.status;c.close();return status,body
def login(email,password):
    _,b=http('/auth/csrf');csrf=json.loads(b)['token']
    status,b=http('/auth/login',method='POST',data={'email':email,'password':password},extra={'X-XSRF-TOKEN':csrf,'Cookie':'XSRF-TOKEN='+csrf})
    check('fixture-login-'+email.split('@')[0],status==200);return json.loads(b)['data']['accessToken']
def cells(data,sheet):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            if name.endswith('.xml'):ET.fromstring(z.read(name))
        doc=ET.fromstring(z.read('xl/worksheets/sheet'+str(sheet)+'.xml'))
        check('xlsx-no-formulas-'+str(sheet),not doc.findall('.//s:f',NS))
        return [[c.find('s:is/s:t',NS).text if c.get('t')=='inlineStr' else c.findtext('s:v',default='',namespaces=NS) for c in row.findall('s:c',NS)] for row in doc.findall('s:sheetData/s:row',NS)]
def main():
    c=m.Client(WORK/'secrets/app.cnf',3307,'fooddelivery_admin_reports');state=m.inspect(c)
    check('pinned-isolated-database',state['port']==3307 and state['database']=='fooddelivery_admin_reports' and state['uuid']=='a87623fb-db83-11f1-83cc-40c2ba627c1b')
    # Deliberately independent SQL: separate raw tables, no aggregate SQL copied from implementation.
    orders=[json.loads(x) for x in c.run("SELECT JSON_OBJECT('id',order_id,'created',DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s.%f'),'status',order_status,'restaurant',restaurant_id,'amount',total_amount,'subtotal',subtotal,'shipping',shipping_fee) FROM orders ORDER BY order_id").splitlines()]
    payments={x['order']:x for x in [json.loads(x) for x in c.run("SELECT JSON_OBJECT('order',order_id,'status',payment_status,'amount',amount,'paid',paid_at) FROM payments").splitlines()]}
    deliveries={x['order']:x for x in [json.loads(x) for x in c.run("SELECT JSON_OBJECT('order',order_id,'driver',driver_id,'status',delivery_status,'pickup',pickup_time,'done',delivered_time) FROM deliveries").splitlines()]}
    auth=json.loads((WORK/'secrets/fixture-auth.json').read_text());admin=login('admin@reports.invalid',auth['password'])
    paths=['/admin-management/reports/'+k+suffix for k in ['orders','delivery'] for suffix in ['', '/export.xlsx']]
    for path in paths:check('anonymous-401-'+path,http(path)[0]==401)
    role_tokens={}
    for role in ['customer','restaurant','driver']:
        token=login(role+'@reports.invalid',auth['password']);role_tokens[role]=token
        for path in paths:check(role+'-403-'+path,http(path,token)[0]==403)
    cases=[{}, {'restaurantId':'1'},{'restaurantId':'2'},{'status':'COMPLETED'},{'status':'CANCELLED'},{'restaurantId':'999'}]
    def read(kind,params):
        status,b=http('/admin-management/reports/'+kind+'?'+urllib.parse.urlencode(params),admin);check('http200-'+kind+'-'+str(params),status==200);return json.loads(b)['data']
    for index,filters in enumerate(cases):
        params={'from':'2026-11-01','to':'2026-11-30',**filters};report=read('orders',params)
        selected=[o for o in orders if '2026-11-01'<=o['created']<'2026-12-01' and (not filters.get('restaurantId') or str(o['restaurant'])==filters['restaurantId']) and (not filters.get('status') or o['status']==filters['status'])]
        paid=[o for o in selected if o['status']=='COMPLETED' and payments[o['id']]['status']=='SUCCESS' and payments[o['id']]['paid'] and payments[o['id']]['amount']==o['amount'] and o['amount']==o['subtotal']+o['shipping']]
        check('independent-count-'+str(index),report['summary']['total']==len(selected));check('independent-completed-'+str(index),report['summary']['completed']==sum(o['status']=='COMPLETED' for o in selected));check('independent-money-'+str(index),Decimal(str(report['summary']['amount']))==sum((Decimal(str(o['amount'])) for o in paid),Decimal(0)));check('independent-shipping-'+str(index),Decimal(str(report['summary']['shipping']))==sum((Decimal(str(o['shipping'])) for o in paid),Decimal(0)))
        check('series-money-'+str(index),sum(Decimal(str(d['amount'])) for d in report['series'])==Decimal(str(report['summary']['amount'])))
        check('series-days-wall-clock-'+str(index),all(len(d['day'])==10 and d['day'].startswith('2026-11-') for d in report['series']))
        if index in [0,4,5]:
            status,b=http('/admin-management/reports/orders/export.xlsx?'+urllib.parse.urlencode(params),admin);check('orders-xlsx200-'+str(index),status==200)
            (WORK/('orders-'+str(index)+'.xlsx')).write_bytes(b);s=cells(b,1);d=cells(b,2);check('orders-xlsx-row-count-'+str(index),len(d)-9==len(selected));check('orders-xlsx-summary-'+str(index),any(row[0]=='Giá trị hoàn thành đã thanh toán hợp lệ (VND)' and Decimal(row[1])==Decimal(str(report['summary']['amount'])) for row in s))
    report=read('orders',{'from':'2026-11-01','to':'2026-11-30','size':'2','page':'1'});check('database-pagination',len(report['details']['items'])==2 and report['details']['totalElements']==8 and [r['orderId'] for r in report['details']['items']]==[8,5]);check('page-independent-kpi',report['summary']['amount']==240000)
    for params,expected in [({'driverId':'1'},4),({'driverId':'2'},3),({'status':'CANCELLED'},1),({'driverId':'999'},0)]:
        r=read('delivery',{'from':'2026-11-01','to':'2026-11-30',**params});check('delivery-filter-'+str(params),r['summary']['total']==expected)
    r=read('delivery',{'from':'2026-11-01','to':'2026-11-30'});check('delivery-oracle',r['summary']['total']==8 and r['summary']['assigned']==7 and r['summary']['delivered']==5 and r['summary']['cancelled']==1 and r['summary']['averageSeconds']==1200 and r['summary']['validDurationCount']==4 and r['summary']['successRate']==71.43);check('driver-grouping',sum(d['assigned'] for d in r['drivers']['items'])==7 and len(r['drivers']['items'])==2)
    r=read('delivery',{'from':'2026-11-01','to':'2026-11-30','size':'1','driverPage':'1'});check('driver-independent-pagination',r['drivers']['page']==1 and r['drivers']['items'][0]['driverId']==2 and r['details']['page']==0)
    for kind in ['orders','delivery']:
        r=read(kind,{'from':'2026-11-30','to':'2026-11-30'});check('microsecond-inclusive-'+kind,r['summary']['total']==1)
        r=read(kind,{'from':'2026-12-02','to':'2026-12-02'});check('zero-denominator-'+kind,r['summary'].get('completionRate',r['summary'].get('successRate')) is None)
        for bad in [{'from':'2026-02-30'},{'from':'2026-01-01','to':'2026-12-31'},{'size':'51'},{'page':'-1'},{'status':'FAILED'},{'sort':'id;DROP TABLE orders'}]:check('validation400-'+kind+'-'+str(bad),http('/admin-management/reports/'+kind+'?'+urllib.parse.urlencode(bad),admin)[0]==400)
    for filters,name in [({},'all'),({'driverId':'999'},'empty'),({'status':'DELIVERED'},'filtered')]:
        params={'from':'2026-11-01','to':'2026-11-30',**filters};r=read('delivery',params);status,b=http('/admin-management/reports/delivery/export.xlsx?'+urllib.parse.urlencode(params),admin);check('delivery-xlsx200-'+name,status==200);(WORK/('delivery-'+name+'.xlsx')).write_bytes(b);check('delivery-xlsx-count-'+name,len(cells(b,2))-9==r['details']['totalElements']);cells(b,1)
    # Negative probes affect only this new approved fixture schema, restored even on assertion failure.
    try:
        c.run('UPDATE payments SET amount=119999.00 WHERE payment_id=1')
        check('mismatched-payment-excluded',read('orders',{'from':'2026-11-01','to':'2026-11-30'})['summary']['amount']==120000)
    finally:c.run('UPDATE payments SET amount=120000.00 WHERE payment_id=1')
    try:
        c.run('UPDATE deliveries SET delivered_time=DATE_SUB(pickup_time,INTERVAL 1 SECOND) WHERE delivery_id=9')
        check('negative-duration-excluded',read('delivery',{'from':'2026-11-01','to':'2026-11-30'})['summary']['validDurationCount']==3)
    finally:c.run('UPDATE deliveries SET delivered_time=DATE_ADD(pickup_time,INTERVAL 20 MINUTE) WHERE delivery_id=9')
    for path,token,name in [('/admin-management/restaurants/export.xlsx',admin,'legacy-restaurants'),('/restaurant-management/menu/export.xlsx',role_tokens['restaurant'],'legacy-menu'),('/admin-management/orders/export.xlsx',admin,'legacy-admin-orders'),('/restaurant-management/orders/export.xlsx',role_tokens['restaurant'],'legacy-restaurant-orders')]:
        status,b=http(path,token);check(name+'-http200',status==200)
        with zipfile.ZipFile(io.BytesIO(b)) as z:check(name+'-xlsx',bool(z.read('xl/workbook.xml')))
        (WORK/(name+'.xlsx')).write_bytes(b)
    result={'status':'PASS','pass':len(checks),'fail':0,'checks':checks,'database':'fooddelivery_admin_reports','mainTouched':False};(WORK/'http-sql-excel-results.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='checks'}))
if __name__=='__main__':
    try:main()
    except Exception as e:
        (WORK/'http-sql-excel-failure.json').write_text(json.dumps({'checks':checks,'errorType':type(e).__name__},indent=2));print(json.dumps({'status':'FAIL','lastCheck':checks[-1] if checks else None,'errorType':type(e).__name__,'detailsWithheld':True}));sys.exit(1)
