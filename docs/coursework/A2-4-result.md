# A2.4 — Integration test, Excel export và demo readiness

**Kết luận: PASS cho phạm vi tích hợp A2.1–A2.3 trên một bộ build và môi trường A2.4 đã phê duyệt.** Ngày kiểm chứng12/11/2026, Asia/Saigon. Demo đang được giữ chạy; chưa chuyển sang giai đoạn tiếp theo, không commit/push/deploy. Đây là nghiệm thu tích hợp cục bộ, không phải kết luận production readiness.

## 1. Môi trường kiểm thử

JDK25.0.4 của IntelliJ, Maven3.9.16 từ cache, Node24.20.0. MySQL8.0.46 binary hiện có, instance riêng127.0.0.1:3307, datadir `F:/New folder/food-delivery-mysql-test/data/`. Database mới **fooddelivery_coursework_a24**, chỉ bootstrap16 bảng từ schema-only và tạo fixture mới sau phê duyệt. App user coursework_a24_app chỉ SELECT/INSERT/UPDATE/DELETE trên DB này, không DDL/global privilege. Hibernate **ddl-auto=validate**, OSIV=false.

Backend127.0.0.1:18083, management19093, preview127.0.0.1:4176. Sau phê duyệt bổ sung, gateway HTTPS127.0.0.1:18446 dùng certificate test sẵn có và chuyển tiếp tới đúng preview4176. Chỉ thêm origin HTTPS trong config riêng A2.4; không đổi Secure/CSRF/JWT hoặc config production, không cài certificate vào hệ thống.

Dùng127.0.0.1 cho demo mới để cookie tách khỏi localhost4173. Không restart MySQL test vì instance đã chạy và đã xác minh port/datadir/PID. MySQL80/3306 không được dùng để kết nối kiểm thử hoặc ghi dữ liệu.

## 2. Phiên bản frontend/backend và kiểm tra4173

Đã đọc A2-1-result, A2-2-result, A2-3-result, git status và source hiện tại trước thao tác. **4173 là build A2.1 cũ**: served index trùng `frontend/dist` cũ; JAR cũ có RestaurantExcelController nhưng không có MenuExcelController/OrderExcelController; JS cũ không chứa hai export menu/order. PID4173 là node16952, backend cũ java3332; đã xác minh command line thuộc workspace và giữ nguyên.

Build tích hợp mới chứa đủ ba controller export, CheckoutIdDeserializer/CartQuantityDeserializer và toàn bộ source hiện tại A2.1–A2.3. Một JAR, một frontend-dist được cố định bằng hash trước khi mở demo; mọi E2E/download dùng đúng artifact đó. TLS gateway không build lại frontend/backend; hash JAR/asset/source sau cùng vẫn khớp. HTTP4176 và HTTPS18446 trả index giống byte;4173 vẫn trả index cũ.

Application source SHA-256: `d5a8bc8187db4c3bc57042812531a950550684e029d967cdabfd4b6372fc7e0a`.

Backend JAR SHA-256: `e29b805eeebb8ad75df01a5cb26e82e7bf00443ba9524a3528b501ce97472f79`.

Chi tiết từng file frontend/source tại `logs/integrated-version.json`. JAR và frontend production build nằm riêng trong thư mục thử nghiệm, không ghi đè artifact A2.1 đang phục vụ. HEAD vẫn `0315de8566d299472b28b2f10bb50326c7d6b9aa`; không tạo commit/tag để đặt tên phiên bản, fingerprint dùng working tree có các thay đổi chưa commit.

## 3. File thay đổi

Trong repo, chỉ điều chỉnh test/harness target và báo cáo:

- `src/test/java/vn/gaugaugau/fooddelivery/auth/CheckoutPersistenceMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/MenuPersistenceMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantCreationMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/MySqlStage1IntegrationTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/ApprovedMySqlTestTarget.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/AuthPersistenceMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/Phase8ConcurrencyMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/SecurityMySqlIntegrationTest.java`
- `docs/coursework/A2-4-result.md`


Tổng9 file. Không thay source ứng dụng, UI nghiệp vụ, dependency/manifest/lock, entity, schema/migration hoặc writer Order/Payment/Delivery trong A2.4.

Helper test mở thêm đúng database A2.4, giữ default/opt-in lịch sử và guard port/datadir/database trước ghi. Ba suite coursework không còn phải ghi hard-code vào A2.1/A2.2/A2.3 khi diễn tập tích hợp. Stage1, auth persistence và security có opt-in A2.4 riêng; migration/legacy preflight vẫn tắt. Ma trận security được cập nhật71→76 endpoint (thêm5 API export/lookup A2.1–A2.3) và resolver foodItemId; giữ đủ sáu actor, kiểm status và checksum không đổi cho request bị từ chối.

Ngoài repo: `F:/New folder/food-delivery-mysql-test/coursework-a24-20261112/` chứa setup.py, run-junit.py, run-frontend.py, start.py/start-https.py; tools/integrated-browser.cjs, verify-download.py, final-verification.py, readiness.py, inspect-processes.py, verify-excel.ps1, HTTPS gateway và WSL bridge/launcher; cùng config/credential riêng, artifact, logs và downloads. Không đưa giá trị password/key vào repo hoặc báo cáo.

## 4. Kết quả tích hợp A2.1–A2.3

Chuỗi Chromium thực tế:

1. ADMIN đăng nhập, dùng form hiện hữu tạo Restaurant+Account; double-click xác nhận chỉ một POST cho thao tác. GET lại đúng ID; nhà hàng mới **0 đơn/0 món**, không giả doanh thu hay dữ liệu tự sinh.
2. Nhà hàng mới đăng nhập, chọn món catalog do ADMIN chuẩn bị qua API thật, dùng form thêm menu, GET lại bản ghi. Kiểm tra double-click, mất response sau commit và catalog cũ nhận409; chỉ đối chiếu GET, không tự POST lại.
3. CUSTOMER đăng nhập, mở trang món công khai, chọn số lượng và thêm **hai món bằng UI**, xem cart rồi checkout bằng form; double-click chỉ một POST, GET detail và thấy trong history. Nhà hàng/ADMIN đọc được dữ liệu đúng quyền.
4. Chuẩn bị thêm fixture hợp lệ qua các API hiện có để vượt page20/12; mỗi đơn đều từ Cart→checkout thật, không INSERT đơn/tổng tiền giả cho kết quả UI.
5. Đơn đầu #645 đi qua Restaurant CONFIRMED/PREPARING/READY, Driver nhận/lấy/giao, COD→COMPLETED/SUCCESS/DELIVERED. Đơn nhiều món vẫn một dòng trong Excel.
6. Checkout #669 commit thật, cố tình mất response và tạm lỗi GET, full reload rồi đối chiếu lại: đúng một đơn, không phát lại POST. Dữ liệu thành công lấy từ MySQL; fault injection chỉ chèn lỗi mạng/GET503 để kiểm recovery.

Nhóm demo hiện tại **DEMOA244F99EA18**:23 nhà hàng,17 món của Restaurant chính,24 đơn của nhà hàng chính,25 đơn quản trị thuộc nhóm (thêm1 đơn nhà hàng đối chứng). Dữ liệu unit/integration và lượt harness trung gian cũng được giữ trong DB mới để đối chiếu; dùng q=tag dưới đây khi demo, không trộn các nhóm fixture khi kết luận số liệu. Tất cả là dữ liệu thử nghiệm mới, không dữ liệu production.

## 5. Ba loại Excel trên bốn trang UI

| Trang và quyền | File tải đúng tên | Đầy đủ theo lọc | Rỗng | Lọc có dữ liệu |
|---|---|---:|---:|---:|
| ADMIN /admin/restaurants | DanhSachNhaHang.xlsx |23 dòng|0|4 đóng cửa/ACTIVE|
| RESTAURANT /restaurant/menu | DanhSachMonAn.xlsx |17 dòng|0|4 ngừng bán|
| RESTAURANT /restaurant/orders | DanhSachDonHang.xlsx |24 dòng|0|1 COMPLETED trong ngày|
| ADMIN /admin/orders | DanhSachDonHang.xlsx |25 dòng|0|1 COMPLETED trong ngày|

Mỗi browser kiểm12 lượt tải (4 trang×3 trường hợp). Trang full được mở ở **trang2**, nhưng file chứa toàn bộ23/17/24/25 bản ghi, vượt page20/12. Export request không có page/size; q/sort/status/date/activity vẫn đúng state URL/UI. Theo dõi download: chuyển trang không tự tải, nhấn nút mới có đúng một download. Header/tên file/MIME và dữ liệu thật được kiểm.

Restaurant xuất9 cột A2.1, menu7 cột A2.2, order11 cột A2.3. ID text giữ chính xác; menu có1 cột tiền numeric, order có3 cột tiền numeric/VND; order một dòng mỗi đơn, không JOIN detail làm nhân tổng tiền. Ngày là text dd/MM/yyyy HH:mm:ss theo LocalDateTime DB/backend, trạng thái tiếng Việt. Không xuất password/hash/token. Order không đưa địa chỉ/phone/email khách vào file.

## 6. Đối chiếu MySQL và toàn vẹn

**36/36 file** được so từng dòng theo ID và **từng ô** với SELECT độc lập qua MySQL CLI bằng user giới hạn, ngay thời điểm tải; dùng Decimal cho tiền, so date/status/sort/phạm vi đầy đủ. IDs/tập kết quả tương ứng cũng giống nhau giữa ba browser. Sau cùng kiểm toàn bộ tiền demo: detail subtotal=quantity×unit_price; Order subtotal=sum(details); total=subtotal+15000; Payment.amount=total, không thiếu Payment.

Kết quả:0 sai lệch tính tiền,0 lifecycle COMPLETED sai,0 account email/menu pair/payment-order/delivery-order trùng,0 OrderDetail/Payment/Delivery mồ côi trong phép kiểm. Order #645 có2 detail; đơn mất response đúng1 dòng. FK và UNIQUE thực tế được test toàn suite; schema có16 PRIMARY KEY,21 FK,13 UNIQUE,6 CHECK. Không sửa constraint để đạt PASS.

App grants được kiểm chỉ USAGE toàn cục và DML DB A2.4. Backend proxy request ID xác minh trước ghi; SELECT DATABASE/@@port/@@datadir cũng xác nhận đúng môi trường. Root test chỉ dùng bootstrap và checksum đọc, không dùng tài khoản MySQL80.

## 7. Phân quyền

Ma trận26 suite bao gồm kiểm **76 endpoint×6 actor** qua MockMvc kết hợp MySQL thật: anonymous, CUSTOMER, RESTAURANT, DRIVER, ADMIN, account disabled. Endpoint mới đã nằm trong matrix, request bị từ chối phải giữ snapshot dữ liệu.

E2E còn gửi request HTTP/HTTPS thật: CUSTOMER không export ADMIN hay Restaurant, Restaurant không export ADMIN; anonymous401; sai role403; nhà hàng đối chứng không đọc private order/own-lookup hoặc forge restaurantId của nhà hàng chính (404). Hai negative input quantity/paymentMethodId thập phân bị400.14 negative API checks được giữ ở api-chromium-progress.json.

Không coi việc đọc catalog/menu công khai của nhà hàng khác là vi phạm ownership; đó là hợp đồng công khai hiện hữu. Private order/export/mutation được kiểm theo principal. CUSTOMER không có nút export quản trị được bổ sung.

## 8. Chống gửi trùng và giới hạn

Đã kiểm trên cùng build: double-click tạo nhà hàng, thêm menu, checkout; mất response sau commit đối với cả ba form; menu409 từ catalog cũ; checkout full reload, giữ marker và chỉ GET lại. DB có đúng một Account/profile cho email, một cặp menu và một Order cho thao tác đã đối chiếu. Toàn suite MySQL còn kiểm checkout đồng thời (một thành công/một409), rollback và quyền sở hữu.

Giữ các giới hạn A2.3: chưa có idempotency key server; không cam kết exactly-once sau khi xóa/tamper sessionStorage hoặc refill cart rồi gửi client tùy chỉnh. Checkout marker chỉ chứa hash/IDs, không raw địa chỉ/cart/token. Reconciliation chỉ đọc50 đơn mới nhất;0/nhiều kết quả hoặc dữ liệu khớp đã thay đổi thì tiếp tục khóa, không chọn bừa và không POST lại. Preflight giá không khóa giá đến lúc server xử lý; server vẫn tính theo giá hiện hành, không đổi chính sách. A2.1/A2.2 còn dựa vào UNIQUE email/cặp menu ở DB, không gọi khóa button là idempotency bền vững.

## 9. JUnit/frontend/E2E và Microsoft Excel

- **JUnit toàn bộ discovery:218 test,213 PASS,0 FAIL,0 ERROR,5 SKIPPED**,26 suite; Maven package PASS.
- **AuthMigrationMySqlTest:4 SKIPPED** vì yêu cầu migration/routine và trạng thái legacy riêng, ngoài phạm vi A2.4 bootstrap. **AuthPreflightMySqlTest:1 SKIPPED** vì hard-code fixture88 hash của Stage1 cũ; không kích hoạt kết nối legacy chỉ để tăng số test. Không xóa/bỏ assertion hoặc báo SKIPPED là PASS.
- **Frontend toàn bộ:340 PASS,0 FAIL,0 SKIPPED**,47 suite. Typecheck, ESLint, formatter check và Vite production build exit0; build riêng giữ nguyên dist4173.
- **Chromium158.0.8127.18 Windows:8/8 case tổng hợp PASS**,12 downloads, HTTP4176.
- **Firefox159.0 Linux portable:2/2 case tổng hợp PASS**,12 downloads, HTTP4176. Firefox Windows khởi chạy được nhưng crash lúc tạo page; bản Linux đã có sẵn được dùng thay, không cài mới.
- **WebKit27.2 Windows:2/2 case tổng hợp PASS**,12 downloads, HTTPS18446. HTTP WebKit trả403 ở refresh vì cookie Secure không được gửi; UI dừng an toàn trước form login. HTTPS dùng cùng JAR/frontend và chính sách Secure/CSRF giữ nguyên. Đây là kiểm engine WebKit, chưa chạy ứng dụng Safari macOS.
- **Native Microsoft Excel12.0:36/36 workbook mở read-only PASS**, FileFormat51, Unicode/header/shape/numeric VND đúng, HasFormula=false, hyperlink0; SHA trước/sau giống nhau. Dữ liệu chứa =SUM và =HYPERLINK vẫn text nguyên văn. Chỉ một tiến trình PowerShell Bypass được duyệt cho kiểm36 file; không đổi policy lưu trên máy, không lưu workbook hoặc cài certificate.

12 case tổng hợp và36 lượt download là hai đơn vị đếm khác nhau. Không cộng các request MockMvc thành HTTP socket thật. Không tuyên bố đã chạy toàn bộ E2E lịch sử70 case; ma trận A2.4 chuyên biệt ở trên là bộ E2E đã chạy.

Lượt đầu phát hiện harness chưa nhận target A2.4/đếm endpoint cũ; đã sửa target/resolver và tăng đúng76 endpoint, không nới kiểm role. Seed ban đầu thiếu created_at đã dừng trước chèn, sau đó seed trong transaction. Harness enum request thiếu JSON content type gây415 đã sửa; fixture/log/private credential của lượt đó giữ riêng, không xóa dữ liệu. WSL ban đầu bị sandbox chặn, chạy lại sau duyệt; shell LF đã sửa, dùng portable runtime và cache riêng A2.4. Các lượt lỗi trước vẫn lưu trong logs, không thay bằng kết quả PASS giả.

## 10. URL demo mới nhất và cách thử

**HTTP demo:** [http://127.0.0.1:4176](http://127.0.0.1:4176). **HTTPS test/demo:** [https://127.0.0.1:18446](https://127.0.0.1:18446). Giữ nguyên127.0.0.1 trong URL để không dùng chung cookie với localhost4173. Certificate HTTPS là certificate thử nghiệm cục bộ; harness chỉ bỏ kiểm certificate trong context đúng origin này, không cài trust/cert hệ thống. HTTP đã kiểm Chrome/Firefox; WebKit cần HTTPS để dùng cookie Secure.

Sau đăng nhập đúng vai trò:

- ADMIN nhà hàng: [/admin/restaurants?q=DEMOA244F99EA18](http://127.0.0.1:4176/admin/restaurants?q=DEMOA244F99EA18). Tạo nhà hàng hoặc thử Xuất Excel.
- RESTAURANT thực đơn: [/restaurant/menu?q=DEMOA244F99EA18](http://127.0.0.1:4176/restaurant/menu?q=DEMOA244F99EA18). Thêm món từ catalog, chỉnh giá/trạng thái, Xuất Excel.
- RESTAURANT đơn: [/restaurant/orders?q=DEMOA244F99EA18](http://127.0.0.1:4176/restaurant/orders?q=DEMOA244F99EA18). Có24 đơn của mình, có đơn hoàn tất #645.
- ADMIN đơn: [/admin/orders?q=DEMOA244F99EA18](http://127.0.0.1:4176/admin/orders?q=DEMOA244F99EA18). Có25 đơn trong nhóm, gồm đơn nhà hàng đối chứng.
- CUSTOMER xem [nhà hàng demo](http://127.0.0.1:4176/restaurants/2379), chọn món → giỏ → checkout → lịch sử. Dùng tài khoản CUSTOMER bên dưới. Đăng xuất trước khi đổi vai trò.

Không coi4173 là bản mới: nó vẫn phục vụ A2.1 và được giữ nguyên theo phê duyệt. Các writer regression chạy trước khi seed demo; không chạy lại writer suite song song với phiên demo đang dùng.

## 11. Tài khoản demo (chỉ định danh)

- **ADMIN**: `a24-admin-35bd03d1a7e0@test.example`; Account #995.
- **RESTAURANT**: `restaurant.demoa244f99ea18@test.example`; Account #1021 / Restaurant #2379.
- **CUSTOMER**: `customer.demoa244f99ea18@test.example`; Account #1044 / Customer #1325.
- **DRIVER**: `driver.demoa244f99ea18@test.example`; Account #1045 / Driver #3235.


Tất cả ACTIVE, profile liên kết đúng và được đối chiếu SQL. Mật khẩu sinh ngẫu nhiên cho môi trường, lưu riêng ngoài repo tại `F:/New folder/food-delivery-mysql-test/coursework-a24-20261112/credentials.json`; không ghi giá trị trong báo cáo/log/Git, không có password mặc định trong source. Định danh được lưu riêng dạng không-secret tại logs/demo-identities.json.

## 12. Ảnh và bằng chứng đúng build mới

Bốn ảnh đã chụp/xem lại từ URL4176, không dùng ảnh A2.1/A2.2/A2.3 cũ:

- [ADMIN – Nhà hàng](<../../../food-delivery-mysql-test/coursework-a24-20261112/logs/chromium-restaurants-export.png>).
- [RESTAURANT – Thực đơn](<../../../food-delivery-mysql-test/coursework-a24-20261112/logs/chromium-menu-export.png>).
- [RESTAURANT – Đơn hàng](<../../../food-delivery-mysql-test/coursework-a24-20261112/logs/chromium-restaurant-orders-export.png>).
- [ADMIN – Đơn hàng](<../../../food-delivery-mysql-test/coursework-a24-20261112/logs/chromium-admin-orders-export.png>).

Mẫu tải thật:

- [DanhSachNhaHang.xlsx](<../../../food-delivery-mysql-test/coursework-a24-20261112/downloads/chromium/restaurants/full/DanhSachNhaHang.xlsx>).
- [DanhSachMonAn.xlsx](<../../../food-delivery-mysql-test/coursework-a24-20261112/downloads/chromium/menu/full/DanhSachMonAn.xlsx>).
- [DanhSachDonHang.xlsx – nhà hàng](<../../../food-delivery-mysql-test/coursework-a24-20261112/downloads/chromium/restaurant-orders/full/DanhSachDonHang.xlsx>).
- [DanhSachDonHang.xlsx – ADMIN](<../../../food-delivery-mysql-test/coursework-a24-20261112/downloads/chromium/admin-orders/full/DanhSachDonHang.xlsx>).

Mỗi file có .proof.json riêng: IDs, row count, SHA, so từng ô SQL. Bằng chứng tổng: integrated-version.json, manual4173-proof.json, junit-summary.json, frontend-unit.json/frontend-gates.json, browser-matrix-summary.json, browser-{engine}-proof.json, native-excel-manifest.json, excel-native-proof.json, final-database-proof.json, app-grants-proof.json, demo-readiness-proof.json, verified-source.json và secret-scan-proof.json trong logs. Trace/video auth tắt; ảnh chụp sau form password, không ghi token/body mật khẩu.

## 13. MySQL80, dữ liệu cũ và trạng thái bàn giao

**17 schema/269 bảng cũ trên instance3307** giữ nguyên CHECKSUM TABLE và SHA SHOW CREATE, gồm14 schema/221 bảng nền cùng16 bảng mỗi A2.1/A2.2/A2.3. Không có khác biệt ở cả ba DB coursework cũ. Đây là checksum instance test, không tuyên bố đã kết nối để checksum MySQL80.

MySQL80 vẫn Running, PID MySQL test34132 và PID4173/backend cũ giữ nguyên. Không stop/restart/ghi service3306; không đổi schema cũ hoặc dữ liệu lịch sử. Chỉ DB A2.4 và account test giới hạn mới được tạo theo duyệt. Các báo cáo/source/artifact A2.1–A2.3 được bảo toàn.

Theo phê duyệt giữ demo: backendPID18224/port18083, previewPID1672/port4176 và TLSgatewayPID30792/port18446 đang chạy, chỉ bind loopback; management19093. MySQL test dùng chung vẫn chạy cho A2.1. Dữ liệu/log/downloads/config riêng được giữ lại. Không tự dừng phiên demo hoặc thay4173 khi kết thúc báo cáo.

## 14. Hạn chế còn lại

Ngoài giới hạn chống trùng mục8, chưa chạy Safari macOS thật/ma trận mọi hệ điều hành/phiên bản Office, chưa load test hoặc benchmark dataset hàng triệu dòng. Test boundary chia sheet thuộc regression writer, không sinh triệu dòng giả. Frontend tải Blob có bộ nhớ theo kích thước file; lỗi stream sau header có thể tạo download không hoàn chỉnh, nên ZIP/Excel/SQL mới là bằng chứng hoàn tất.

5 JUnit đặc thù migration/legacy vẫn SKIPPED có lý do. Firefox Windows có lỗi runtime đã ghi nhận; kết luận Firefox áp dụng runtime Linux đã chạy. HTTPS là gateway test có certificate thử nghiệm, không phải cấu hình TLS production được triển khai. Các dữ liệu/checksum/counter là snapshot tại nghiệm thu; demo được giữ chạy nên thao tác mới của người dùng sẽ làm tăng dữ liệu A2.4 sau thời điểm này.

## 15. Kết luận

**PASS A2.4**: ba chức năng A2.1–A2.3 được kiểm chứng liên thông trên cùng một JAR/frontend build và DB A2.4 riêng; bốn trang có nút export đúng role,36 file đủ/rỗng/lọc khớp MySQL và mở được trong Microsoft Excel. Form, persistence, ownership, chống trùng trong các trường hợp hỗ trợ và guard dữ liệu cũ đều đạt. URL demo mới/định danh tài khoản/ảnh và giới hạn được ghi rõ. Dừng công việc sau A2.4, chờ phê duyệt giai đoạn tiếp theo; không làm ERD/3NF/SQL nộp bài/BTL và không commit/push/deploy.
