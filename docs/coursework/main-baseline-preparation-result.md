# Food Delivery Main — kết quả chuẩn bị baseline và diễn tập

Ngày nghiệm thu:12/11/2026, Asia/Saigon.

**PASS cho baseline và phạm vi diễn tập đã phê duyệt. Chưa triển khai Main; chưa kết luận production readiness.** Runtime Main, restore và ADMIN bootstrap còn các gate/phê duyệt riêng. Không truy cập MySQL80 bằng SQL trong lượt này; không dùng `hanoi_food`.

**Cập nhật sau báo cáo chuẩn bị,12/11/2026:** gate restore đã được phê duyệt và hoàn tất PASS trên database mới `fooddelivery_restore_verification` tại3307. Chi tiết trong [main-restore-verification-result.md](main-restore-verification-result.md). Các mô tả “chưa restore” bên dưới là trạng thái lịch sử lúc kết thúc giai đoạn chuẩn bị; Main và ADMIN bootstrap vẫn chưa triển khai.

## 1. File đã tạo trong repository

Không sửa Java source, frontend, dependency, pom hoặc test JUnit hiện hữu. Tạo15 file:

1. `database/baseline/001_fooddelivery_baseline.sql`
2. `database/setup/002_fooddelivery_app.sql`
3. `database/setup/003_cod.sql`
4. `database/schema-reference.json`
5. `deploy/application-main.example.yml`
6. `deploy/main.env.example`
7. `deploy/nginx-main.windows.example.conf`
8. `tools/deployment/mysql_baseline.py`
9. `tools/deployment/test_mysql_baseline.py`
10. `tools/deployment/rehearsal_checks.py`
11. `tools/deployment/rehearsal_http.py`
12. `tools/deployment/check_main_runtime.py`
13. `tools/deployment/Invoke-AdminBootstrap.ps1`
14. `docs/coursework/main-baseline-runbook.md`
15. Báo cáo này.

Đối chiếu lại291 file ứng dụng với manifest tích hợp A2.4:0 file thay đổi. Mọi build được thực hiện trong bản sao bên ngoài repository, không ghi đè JAR/dist đang có ở source chính.

## 2. Baseline và tương thích JPA

Đọc SHOW CREATE TABLE và information_schema của A2.4, không đọc/copy bản ghi Account, hash, token hoặc dữ liệu nghiệp vụ. Baseline chỉ gồm16 CREATE TABLE theo thứ tự phụ thuộc, loại counter AUTO_INCREMENT từ test, không có seed hoặc schema-qualified SQL trỏ về A2.4.

Kết quả MySQL8.0.46 tại DB diễn tập mới:

- 16 bảng/16 PRIMARY KEY;
- 21 FOREIGN KEY;
- 13 UNIQUE;
- 6 CHECK, enforced;
- cột/type/nullability/default/collation, index, FK actions và CHECK clause khớp đầy đủ manifest A2.4.

Giữ nguyên native ENUM cho Order/Delivery/Payment và VARCHAR cho role/status của Account. Giữ BIGINT signed, DECIMAL(12,2), DATETIME(6), BIT(1), CHAR(36) ascii_bin, BINARY(32), version default0 và accounts.created_at defaultCURRENT_TIMESTAMP(6). Không thêm ràng buộc nghiệp vụ mới.

Backend thực tế đã khởi động và khởi tạo EntityManagerFactory thành công bằng **ddl-auto=validate**, auth persistence bật và OSIV=false. Không dùng Hibernate create/update. Không chạy migration auth/version cũ trên Main hoặc rehearsal mới.

## 3. Chốt chặn triển khai

Operator mặc định chỉ đọc preflight. Pin TCP/host/port/database, MySQL8.0.46, server UUID và datadir diễn tập. Từ chối schema không rỗng hoặc có view/routine/event/trigger, option file nguy hiểm, baseline lệch hash hoặc sai acknowledgement.

Apply dùng cùng một kết nối với advisory lock và temporary CHECK gate trước CREATE; không --force, tự reconnect, retry, tắt FK, IF NOT EXISTS hay DROP. File SQL thô phải được gọi qua operator; chạy thủ công sẽ bỏ qua guard, đã ghi rõ trong SQL/runbook.

Tạo tài khoản app và COD là hai action riêng sau schema verify. Username đã có thì dừng, không tự reset/ALTER. Password ngẫu nhiên của MySQL được bắt trong bộ nhớ và lưu option file bảo vệ ngoài Git, không in ra terminal/report. App chỉ DML trong schema đích; đã xác minh tài khoản diễn tập không tạo được bảng.

## 4. Môi trường diễn tập được phê duyệt

- MySQL độc lập8.0.46 tại127.0.0.1:3307.
- Datadir `F:/New folder/food-delivery-mysql-test/data/`, chạy bằng --no-defaults, không dùng cấu hình/dịch vụ MySQL80.
- Database mới `fooddelivery_main_rehearsal`; user mới `fooddelivery_rehearsal_app`, không dùng lại tài khoản A2.4.
- Backend HTTPS loopback18091, management HTTPS19101, JDK25.0.4 và Maven3.9.16.
- RSA JWT và certificate HTTPS mới hoàn toàn; trust certificate chỉ trong HTTP client thử nghiệm, không cài vào hệ thống. Không bỏ Secure/CSRF hoặc tắt HTTPS verification trong client.
- Mọi fixture mới nằm trong rehearsal. Account ADMIN fixture chỉ tạo sau khi schema đã verify; không gọi AdminBootstrap và không tạo ADMIN Main.

Thư mục bằng chứng:

`F:/New folder/food-delivery-mysql-test/main-baseline-rehearsal-20261112/`

Thư mục `private/` giới hạn ACL cho user Windows hiện hành và SYSTEM, chứa option file, fixture, khóa/certificate/config và dump. Không đưa chúng vào repository hoặc báo cáo.

## 5. Kết quả kiểm thử

Các con số là kết quả lượt nghiệm thu cuối, tách từng loại để không cộng HTTP request thành JUnit test:

- **Maven clean package: PASS**, chạy offline bằng JDK25.0.4; không đổi dependency.
- **JUnit:218 phát hiện;95 PASS,0 FAILURE,0 ERROR,123 SKIPPED.** Các suite MySQL có opt-in/whitelist lịch sử không được bật để tránh chúng ghi nhầm schema cũ. Không sửa whitelist hoặc làm yếu assertion JUnit; phần rehearsal mới dùng harness riêng có pin đích.
- **Python guard unit test:15 PASS,0 FAIL.** Kiểm tra sai port/database/UUID/version/datadir, non-empty, objects ngoài dự kiến, option-file injection, hash drift và schema khác cấu trúc dù cùng số lượng.
- **MySQL constraint/transaction probe:117 PASS,0 FAIL.** Toàn bộ21FK/13UNIQUE/6CHECK/16PK và53 cột NOT NULL ngoài PK; còn lại là rollback, bảo vệ parent, account/session, lặp baseline và quyền DML. Mỗi probe có seed hợp lệ trong transaction và rollback khi lỗi; số dòng trước/sau giữ nguyên.
- **HTTPS:63 request đạt kỳ vọng,0 sai status;17 assertion dữ liệu/cookie/XLSX PASS.** Bao gồm response lỗi dự kiến401/403/404/409; đây không phải lỗi nghiệm thu.
- **PowerShell bootstrap wrapper:0 lỗi parse.** Chỉ parse và kiểm tra class/PropertiesLauncher trong JAR, không chạy bootstrap.
- **Main runtime check:BLOCKED đúng kỳ vọng** vì8 biến bắt buộc chưa được cấp trong tiến trình Main. Đây là cấu hình còn thiếu, không được báo là runtime Main đã PASS.

Đã thực hiện login/refresh/logout/logout-all, từ chối không CSRF và sai role, đăng ký Customer, duplicate registration, CAS stale409, ADMIN tạo Restaurant/Driver, catalog CRUD, menu create/read/update và stale409. Không tự sửa application code khi harness cần điều chỉnh.

## 6. Rollback và dữ liệu thực tế

Checkout với paymentMethodId không tồn tại trả404 sau khi service đã lưu Order trước bước createPayment. Đối chiếu MySQL trước/sau: không tăng Order/OrderDetail/Payment, cart_items giữ nguyên. Checkout COD hợp lệ sau đó thành công.

Luồng thật: Customer → Cart → Order → Restaurant CONFIRMED/PREPARING/READY → Driver nhận/lấy/giao → COD → COMPLETED. SQL xác nhận đồng thời `Order COMPLETED`, `Delivery DELIVERED`, `Payment SUCCESS`, payment.amount=order.total_amount.

Transaction SQL16 bảng hợp lệ rollback sạch. Khi INSERT Account trùng email sau INSERT Customer trong cùng transaction, Customer mới không còn sau lỗi. Không có probe FK/UNIQUE/CHECK để lại dữ liệu dở dang.

Các lượt điều tra harness được giữ nguyên, không xóa lịch sử fixture. DB sau cùng có7 Account (1ADMIN,2CUSTOMER,2RESTAURANT,2DRIVER),2Customer,2Restaurant,2Driver,2menu,2Order/2OrderDetail/2Delivery/2Payment; cả2 đơn COMPLETED,0cart_items. Một đơn thuộc lượt điều tra trước, một đơn thuộc lượt nghiệm thu cuối; đều được tạo và hoàn tất bằng API thật.

## 7. LAZY, cascade và xuất Excel

Order detail đọc được trước khi có Delivery và sau khi hoàn tất; profile/menu/history/driver detail đọc được với OSIV=false. Không phát hiện LazyInitializationException trong các request nghiệm thu. Đây là phạm vi đã chạy, không khẳng định bao phủ mọi endpoint/transition/concurrency của toàn hệ thống.

Metadata FK actions giữ nguyên A2.4; probe DELETE parent Customer và Account đang có Session bị từ chối, không xóa lan dữ liệu. Cascade JPA ứng dụng không bị sửa.

Bốn download thuộc ba chức năng Excel: ADMIN restaurants, RESTAURANT menu, RESTAURANT orders, ADMIN orders. ZIP/XML hợp lệ, chứa fixture đã lưu và không chứa password/hash của fixture hoặc cột password_hash. Tên file đúng ba loại hiện có; file order ADMIN lưu tên riêng trong bằng chứng để tránh ghi đè download RESTAURANT. Lượt này không mở Microsoft Excel native hoặc chạy lại matrix browser/pagination A2.4; không lấy kết quả lịch sử làm PASS mới cho những phần đó.

## 8. Vấn đề gặp và xử lý

- Maven clean compile trong sandbox bị AccessDenied ở JAR micrometer-commons cache. Đã xác minh nguyên nhân, xin quyền chạy ngoài sandbox và clean package lại thành công; không đổi dependency/Java.
- Tài khoản DML MySQL trả mã FK tổng quát1216/1217 trong probe. Harness chấp nhận hai mã FK tương ứng1216/1452 hoặc1217/1451, vẫn kiểm tra đúng định nghĩa/column và rollback; không nới constraint.
- Harness HTTP đầu tiên giữ CSRF token cũ sau authenticated request. Điều tra xác nhận cookie bị clear; harness lấy token mới giống transport frontend. Không sửa SecurityConfiguration/cookie/CSRF để vượt lỗi.
- Tag catalog được FoodItemService hiện tại chuẩn hóa uppercase. Assertion fixture được điều chỉnh theo hành vi đó; file Excel vẫn khớp giá trị lưu trong MySQL. Không thay nghiệp vụ tên món.
- Stop-Process lỗi nội bộ trên máy; đã xác minh lại đúng PID/command line và dừng backend bằng CIM sau approval công cụ. Không dừng tiến trình khác.

## 9. Backup, rollback và phần chưa kiểm chứng

Đã dump rehearsal bằng operator bảo vệ:28.855byte, SHA-256 `541735cc459e7cd4095da06433c627ea937971085341b4b8aac3bb7ce8072ed2`. Dump ở private/, không có bản trong Git. Chưa restore vào database thứ hai vì chưa được duyệt đích restore; SHA/mã thoát0 không thay thế phép thử restore.

Runbook mô tả snapshot database rỗng trước DDL, quản lý DDL implicit commit/partial failure, không tự DROP hoặc retry, rollback artifact tương thích và rủi ro mất ghi mới khi restore cũ. Trước Main phải nghiệm thu đích restore độc lập và phương án khôi phục; không giả định có PITR/binlog đã được kiểm chứng.

Chưa kiểm chứng Main preflight thực tế, TLS MySQL80/CA/SAN, quyền app Main, keys và HTTPS origin Main, hostname/trust, nginx Windows config test, frontend build/browser trên runtime Main, backup Main hoặc ADMIN bootstrap. Mẫu cấu hình chưa được kích hoạt. Quy trình credential Java Properties cần tuân thủ Unicode escape khi dùng mật khẩu ngoài ASCII.

## 10. Bảo toàn và dọn tiến trình

- Không SQL/DDL/DML vào3306 trong lượt này; không dùng hoặc sửa hanoi_food, không tạo fooddelivery_app hoặc ADMIN Main.
-16 bảng A2.4 giữ nguyên CHECKSUM TABLE và SHA-256 SHOW CREATE trước/sau. Chỉ đọc schema/metadata làm reference.
- MySQL80 vẫn Running, không stop/restart hoặc đổi cấu hình.
- Đã dừng backend diễn tập đúng PID. Instance test do lượt này khởi động đã được shutdown bằng SQL sau khi xác minh UUID/datadir và0 kết nối khác; không dừng MySQL80 hoặc backend khác.
- Giữ database rehearsal, dump, source/build, logs, fixture và downloads để đối chiếu. Không commit/push/deploy.

## 11. Phê duyệt cần có để đi tiếp

1. Chấp thuận baseline sau review và duyệt đích restore độc lập để kiểm chứng khôi phục.
2. Cho phép SELECT preflight/backup Main và áp dụng001 trên đúng fooddelivery/3306 trong cửa sổ đã chốt.
3. Cho phép riêng tạo fooddelivery_app và nạp COD sau schema nghiệm thu.
4. Duyệt cấu hình TLS/RSA/HTTPS origin/hostname/runtime/proxy và mọi thay đổi hệ thống thật sự cần thiết.
5. Duyệt ADMIN bootstrap một lần bằng thông tin người dùng tự chọn.
6. Duyệt khởi chạy Main và smoke test; ghi auth/ghi nghiệp vụ chỉ trong phạm vi được duyệt.

Chi tiết thao tác và guard ở `main-baseline-runbook.md`. Giai đoạn chuẩn bị dừng tại đây; không tự chuyển sang triển khai Main.
