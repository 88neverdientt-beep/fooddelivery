"""HTTPS API rehearsal, pinned to 18091 and the new rehearsal DB only.

Uses the already-installed requests test tool; never disables TLS verification.
Requires a NEW rehearsal fixture (not AdminBootstrap), outside the repository.
No response bodies, passwords, hashes, CSRF or JWT values are logged.
"""
from pathlib import Path
import argparse
import io
import json
import sys
import uuid
import zipfile
import requests
import mysql_baseline as m

BASE = 'https://127.0.0.1:18091'

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--run-directory',type=Path,required=True);args=p.parse_args()
    run=args.run_directory.resolve();private=run/'private';fixture=json.loads((private/'fixture.json').read_text())
    db=m.Client(private/'app.cnf',3307,'fooddelivery_main_rehearsal')
    m.guard(m.inspect(db),'rehearsal',json.loads((run/'setup-proof.json').read_text())['serverUuid'],False);m.verify(db)
    cert=str(private/'tls-cert.pem');records=[];checks=[];tag=uuid.uuid4().hex[:10]
    def check(name,ok):
        checks.append({'name':name,'pass':bool(ok)})
        if not ok:raise AssertionError('Rehearsal check failed: '+name)
    def session():
        s=requests.Session();s.trust_env=False;s.verify=cert;s.headers['Origin']=BASE
        r=call(s,'GET','/auth/csrf',200);s.headers[r.json()['headerName']]=r.json()['token'];s._csrf_managed=True;return s
    def call(s,method,path,expected,body=None):
        # Like the frontend transport, read the CURRENT cookie after authentication.
        # Spring may replace/clear the token when authentication changes.
        current=next((c.value for c in s.cookies if c.name=='XSRF-TOKEN'),None)
        if not current and getattr(s,'_csrf_managed',False) and method not in ['GET','HEAD','OPTIONS'] and path.startswith('/auth/'):
            fresh=call(s,'GET','/auth/csrf',200)
            current=next((c.value for c in s.cookies if c.name=='XSRF-TOKEN'),None)
        if current:s.headers['X-XSRF-TOKEN']=current
        r=s.request(method,BASE+path,json=body,timeout=20)
        ok=r.status_code==expected;records.append({'method':method,'path':path,'expected':expected,'actual':r.status_code,'pass':ok})
        if not ok:raise AssertionError('Unexpected HTTP status; response body withheld')
        return r
    def data(r):return r.json()['data']
    def login(s,email):
        r=call(s,'POST','/auth/login',200,{'email':email,'password':fixture['password']});v=data(r)
        s.headers['Authorization']='Bearer '+v['accessToken'];return v['account']
    def profile(email):return {'name':'Diễn tập '+tag,'email':email,'password':fixture['password'],'phoneNumber':'0900000000','address':'Hà Nội — diễn tập độc lập'}
    def totals():return {t:int(db.run('SELECT COUNT(*) FROM '+t)) for t in ['orders','order_details','payments','cart_items']}
    try:
        public=session()
        call(public,'GET','/admin-management/accounts',401)
        no_csrf=requests.Session();no_csrf.trust_env=False;no_csrf.verify=cert
        call(no_csrf,'POST','/auth/login',403,{'email':fixture['adminEmail'],'password':fixture['password']})
        admin=session();call(admin,'POST','/auth/login',401,{'email':fixture['adminEmail'],'password':'deliberately-wrong-fixture-password'})
        login(admin,fixture['adminEmail']);call(admin,'GET','/auth/me',200)
        check('refresh-cookie-secure-httponly',any(c.name=='fd_refresh' and c.secure and 'HttpOnly' in c._rest for c in admin.cookies))
        r=call(admin,'POST','/auth/refresh',200);admin.headers['Authorization']='Bearer '+data(r)['accessToken']
        customer=session();email='customer-'+tag+'@rehearsal.invalid'
        me=data(call(customer,'POST','/auth/register/customer',201,profile(email)));cid=me['customerId'];login(customer,email)
        before=int(db.run('SELECT COUNT(*) FROM customers'))
        call(customer,'POST','/auth/register/customer',409,profile(email))
        check('duplicate-registration-no-extra-profile',int(db.run('SELECT COUNT(*) FROM customers'))==before)
        call(customer,'POST','/restaurants',403,profile('forbidden-'+tag+'@rehearsal.invalid'))
        call(customer,'GET','/admin-management/restaurants/export.xlsx',403)
        c=data(call(customer,'GET',f'/customers/{cid}',200))
        updated=data(call(customer,'PUT',f'/customers/{cid}',200,{'name':'Khách hàng '+tag,'phoneNumber':'0900000001','address':'Hà Nội','expectedVersion':c['version']}))
        check('customer-jpa-version-increased',updated['version']==c['version']+1)
        call(customer,'PUT',f'/customers/{cid}',409,{'name':'Stale','phoneNumber':'0900000001','address':'Hà Nội','expectedVersion':c['version']})
        rest_email='restaurant-'+tag+'@rehearsal.invalid'
        rest=data(call(admin,'POST','/restaurants',201,{**profile(rest_email),'restaurantStatus':True}));rid=rest['restaurantId']
        restaurant=session();login(restaurant,rest_email)
        call(restaurant,'GET','/restaurant-management/profile',200)
        # Complete create/read/update/delete on a disposable catalog item, no production records.
        temp=data(call(admin,'POST','/food-items',201,{'name':'Tạm '+tag,'category':'Diễn tập','description':'Tạo mới'}));tid=temp['itemId']
        call(admin,'GET',f'/food-items/{tid}',200)
        call(admin,'PUT',f'/food-items/{tid}',200,{'name':'Đã sửa '+tag,'category':'Diễn tập','description':'Cập nhật'})
        call(admin,'DELETE',f'/food-items/{tid}',200);call(admin,'GET',f'/food-items/{tid}',404)
        food=data(call(admin,'POST','/food-items',201,{'name':'Phở Hà Nội '+tag,'category':'Món nước','description':'Dữ liệu mới'}));fid=food['itemId']
        menu=data(call(restaurant,'POST','/restaurant-food-items',201,{'restaurantId':rid,'foodItemId':fid,'price':35000,'isAvailable':True}));mid=menu['restaurantFoodItemId']
        call(restaurant,'GET',f'/restaurant-food-items/{mid}',200)
        call(restaurant,'PUT',f'/restaurant-food-items/{mid}',200,{'price':36000,'isAvailable':True,'expectedPrice':35000,'expectedIsAvailable':True})
        call(restaurant,'PUT',f'/restaurant-food-items/{mid}',409,{'price':37000,'isAvailable':True,'expectedPrice':35000,'expectedIsAvailable':True})
        check('menu-price-read-back-mysql',db.run(f'SELECT price FROM restaurant_food_items WHERE restaurant_food_item_id={mid}')=='36000.00')
        call(customer,'POST',f'/{cid}/cart-items',201,{'restaurantFoodItemId':mid,'quantity':2,'note':'Ít hành'})
        before=totals()
        call(customer,'POST',f'/customers/{cid}/orders',404,{'deliveryAddress':'Hà Nội','paymentMethodId':9223372036854775807})
        check('payment-failure-order-details-payment-rollback-and-cart-retained',totals()==before)
        method=data(call(customer,'GET','/payment-methods',200));cod=next(x for x in method if x['paymentMethodCode']=='COD')['paymentMethodId']
        order=data(call(customer,'POST',f'/customers/{cid}/orders',201,{'deliveryAddress':'Hà Nội','paymentMethodId':cod}));oid=order['orderId']
        check('order-total-real-menu-price',float(order['subtotal'])==72000 and float(order['totalAmount'])==float(order['subtotal'])+float(order['shippingFee']))
        detail=data(call(customer,'GET',f'/orders/{oid}',200));check('order-read-detail-no-delivery-no-lazy-error',detail['orderId']==oid and detail['deliveryOutputDTO'] is None)
        for status in ['CONFIRMED','PREPARING','READY']:call(restaurant,'PATCH',f'/orders/{oid}/status',200,status)
        driver_email='driver-'+tag+'@rehearsal.invalid'
        driver_me=data(call(admin,'POST','/drivers',201,{**profile(driver_email),'licensePlate':'29A-12345','driveStatus':True}));did=driver_me['driverId']
        driver=session();login(driver,driver_email);call(driver,'GET','/driver-management/available',200)
        delivery=int(db.run(f'SELECT delivery_id FROM deliveries WHERE order_id={oid}'))
        call(driver,'POST',f'/deliveries/{delivery}/accept',200,{'driverId':did})
        for status in ['PICKED_UP','DELIVERING','DELIVERED']:call(driver,'PUT',f'/deliveries/{delivery}/status',200,status)
        lifecycle=db.run(f"SELECT CONCAT(o.order_status,':',d.delivery_status,':',p.payment_status,':',p.amount=o.total_amount) FROM orders o JOIN deliveries d ON d.order_id=o.order_id JOIN payments p ON p.order_id=o.order_id WHERE o.order_id={oid}")
        check('cod-completed-delivered-success-mysql',lifecycle=='COMPLETED:DELIVERED:SUCCESS:1')
        call(customer,'GET',f'/orders/{oid}',200);call(driver,'GET',f'/driver-management/deliveries/{delivery}',200)
        downloads=run/'downloads';downloads.mkdir(exist_ok=True)
        for actor,path,name in [(admin,'/admin-management/restaurants/export.xlsx','DanhSachNhaHang.xlsx'),(restaurant,'/restaurant-management/menu/export.xlsx','DanhSachMonAn.xlsx'),(restaurant,'/restaurant-management/orders/export.xlsx','DanhSachDonHang.xlsx'),(admin,'/admin-management/orders/export.xlsx','DanhSachDonHangAdmin.xlsx')]:
            r=call(actor,'GET',path,200)
            with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                text='\n'.join(z.read(n).decode('utf-8') for n in z.namelist() if n.endswith('.xml'))
                check('xlsx-no-secrets:'+name,all(x not in text for x in ['password_hash',fixture['password'],fixture['hash']]))
                # Catalog names are uppercased by the existing FoodItemService.
                check('xlsx-contains-saved-fixture:'+name,tag.casefold() in text.casefold())
            (downloads/name).write_bytes(r.content)
        call(customer,'GET',f'/customers/{cid}/orders/page',200)
        call(admin,'GET','/admin-management/accounts',200)
        old_header=customer.headers['Authorization']
        call(customer,'POST','/auth/logout',204);call(customer,'GET','/auth/me',401)
        login(customer,email);call(customer,'GET','/auth/me',200)
        call(customer,'POST','/auth/logout-all',204)
        check('schema-unchanged-after-http',m.verify(db)=={'tables':16,'primaryKeys':16,'foreignKeys':21,'uniqueConstraints':13,'checks':6})
        (run/'http-fixture-ids.json').write_text(json.dumps({'customerId':cid,'restaurantId':rid,'foodItemId':fid,'menuId':mid,'orderId':oid,'driverId':did,'deliveryId':delivery,'tag':tag},indent=2))
    finally:
        result={'httpPassed':sum(r['pass'] for r in records),'httpFailed':sum(not r['pass'] for r in records),'assertionsPassed':sum(r['pass'] for r in checks),'assertionsFailed':sum(not r['pass'] for r in checks),'requests':records,'assertions':checks}
        (run/'http-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
        print(json.dumps({k:v for k,v in result.items() if k not in ['requests','assertions']}))

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(json.dumps({'status':'FAIL','errorType':type(e).__name__,'detailsWithheld':True}));sys.exit(1)
