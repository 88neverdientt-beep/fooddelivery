# Food Delivery — xác minh restore dump diễn tập

Ngày:12/11/2026, Asia/Saigon.

**Kết luận: PASS cho restore và kiểm tra toàn vẹn của bản dump diễn tập đã phê duyệt.** Đã đóng gate restore của giai đoạn chuẩn bị baseline. Chưa triển khai hoặc nghiệm thu runtime Main.

## 1. Môi trường và nguồn duy nhất

- MySQL8.0.46 độc lập, TCP127.0.0.1:3307, datadir `F:/New folder/food-delivery-mysql-test/data/`, UUID đối chiếu bằng chứng setup diễn tập trước.
- Database mới: `fooddelivery_restore_verification`. Từ chối dùng lại target đã tồn tại; không DROP hoặc làm sạch tự động.
- Dump duy nhất: `F:/New folder/food-delivery-mysql-test/main-baseline-rehearsal-20261112/private/rehearsal-backup.sql`.
- Kích thước:28.855byte; SHA-256 `541735cc459e7cd4095da06433c627ea937971085341b4b8aac3bb7ce8072ed2`, khớp bản đã tạo và ghi nhận trước đó.
- Nguồn đối chiếu chỉ đọc: `fooddelivery_main_rehearsal`. Không tạo dump mới; không đọc/copy dữ liệu A2.4.
- Dùng tài khoản operator hiện có của instance test để restore, không tạo MySQL account hoặc chạy backend bằng root. Không chạy ADMIN bootstrap.

## 2. Chốt chặn và trình tự

1. Đã đọc runbook và main-baseline-preparation-result trước khi thao tác.
2. Xác nhận dump hash chính xác và đúng16 CREATE TABLE. Không có USE, DDL database, DROP TABLE, qualified table name, DEFINER, client SOURCE/shell hoặc @@GLOBAL trong dump đã duyệt.
3. Khởi động đúng instance test đang dừng bằng --no-defaults/datadir riêng; xác minh port/version/UUID/datadir trước CREATE DATABASE.
4. Kiểm tra target chưa tồn tại, tạo duy nhất database restore mới sau phê duyệt.
5. Nạp nguyên dump một lần bằng mysql batch, --skip-reconnect, không --force. Trong cùng phiên có temporary CHECK gate xác nhận đúng namespace/port/UUID và schema rỗng trước nhập.
6. Đối chiếu metadata đầy đủ và dấu vân tay mọi hàng/cột; kiểm tra toàn vẹn chỉ bằng SELECT. Không sửa dữ liệu hoặc restore lại.

Dump mysqldump có cơ chế tạm tắt FK checks để nạp thứ tự bảng; việc bật lại không thay thế kiểm tra orphan. Vì vậy đã kiểm riêng toàn bộ21 FK, namespace FK và dữ liệu sau nhập. Kết nối kiểm tra sau restore có foreign_key_checks=1.

## 3. Cấu trúc sau restore

- 16 bảng,16 PRIMARY KEY,21 FOREIGN KEY,13 UNIQUE,6 CHECK enforced.
- Cột/type/nullability/default/collation, index, FK delete/update actions, CHECK expressions và engine/collation khớp manifest baseline và nguồn diễn tập.
- Tất cả FK tham chiếu bảng trong `fooddelivery_restore_verification`; không trỏ ngược về nguồn, A2.4 hoặc Main.
- Giữ ID, version, kiểu tiền, native enum và cấu hình auth; không thêm hoặc nới constraint để đạt kết quả.

## 4. Dữ liệu được đối chiếu

**Cả16 bảng khớp số dòng và SHA-256 dữ liệu theo thứ tự PK**, tính trên mọi cột, phân biệt NULL/non-NULL, byte nhị phân và chuỗi. Chỉ lấy digest do MySQL tính, không in password/hash/token hoặc bản ghi bí mật ra terminal/report. Nguồn diễn tập không thay đổi giữa hai lần đọc trước/sau kiểm chứng.

Số dòng phục hồi:

- accounts7; auth_sessions13; refresh_tokens16;
- customers2; restaurants2; drivers2;
- food_items2; restaurant_food_items2;
- carts2; cart_items0;
- orders2; order_details2; deliveries2; payments2;
- payment_methods1; ratings0.

Đây là Account/session/token và dữ liệu fixture của **rehearsal**, không phải A2.4 hoặc tài khoản chính thức. Không dùng database restore/dump này làm dữ liệu khởi tạo Main.

## 5. Kết quả kiểm tra

**135 kiểm tra toàn vẹn PASS,0 FAIL**, gồm:

- 1 kiểm tra namespace của các FK;
- 21 kiểm tra orphan theo từng FK;
- 29 kiểm tra trùng cho16 PK và13 UNIQUE, giữ đúng quy tắc NULL của unique;
- 69 kiểm tra cột NOT NULL, gồm cả PK;
- 6 biểu thức CHECK không có hàng vi phạm và metadata xác nhận enforced;
- 8 kiểm tra bổ sung: tính tiền chi tiết, tổng chi tiết với Order, tổng tiền/phí, số tiền Payment, lifecycle Completed/Delivered/Success và timestamps, refresh expiry trong session, định dạng BCrypt và giá menu;
- 1 kiểm tra cấu hình COD: đúng một COD đang hoạt động với tên tiếng Việt đúng.

**9 unit test của công cụ PASS,0 FAIL**, không kết nối DB. Bao gồm sai port/UUID/version/datadir/database, dump thay đổi, lệnh sai phạm vi, bộ bảng trùng/thiếu, lỗi escape CHECK và chế độ verify-existing chỉ cho SELECT.

Không chạy lại Maven/JUnit, frontend/browser hoặc authentication trên target restore. Kết quả những phần đó của giai đoạn chuẩn bị trước không được tính thành kiểm thử mới trong lượt này.

## 6. Vấn đề đã phát hiện và xử lý

Lần đầu SQL import đã thành công, cấu trúc và digest16 bảng đã khớp; bộ kiểm tra tiếp theo dừng ở biểu thức CHECK lấy từ information_schema có quote delimiter dạng escape `\'`, dẫn tới mysql client báo Unknown command. Đây là lỗi của bộ kiểm tra, không phải lỗi import hoặc dữ liệu hỏng.

Đã giữ nguyên bằng chứng FAIL ban đầu, dừng mọi thao tác ghi, chẩn đoán chỉ bằng SELECT và sửa cách chuyển biểu diễn metadata thành biểu thức SQL trong script. Sau đó chỉ chạy **--verify-existing**, không tạo lại bảng/database, không import lần hai hoặc chỉnh dữ liệu. Toàn bộ135 phép kiểm tra đọc sau đó PASS; có regression test cho lỗi này.

Nếu SQL restore thực sự lỗi hoặc các phép đối chiếu còn sai, script dừng và giữ nguyên trạng thái để báo cáo; không tự DROP/retry/repair.

## 7. File và bằng chứng

Tạo:

- `tools/deployment/verify_restore.py`: pin dump/target/instance, restore một lần và chế độ SELECT-only verify-existing.
- `tools/deployment/test_verify_restore.py`:9 unit test an toàn/hồi quy.
- Báo cáo này.

Cập nhật `main-baseline-runbook.md` và `main-baseline-preparation-result.md` để liên kết kết quả restore đã hoàn tất, giữ nguyên kết quả lịch sử.

Bằng chứng ngoài Git tại:

`F:/New folder/food-delivery-mysql-test/restore-verification-20261112/`

- `preflight-result.json`;
- `initial-restore-and-check-result.json`: kết quả import/schema/data thành công nhưng checker ban đầu lỗi;
- `readonly-diagnostic.json`;
- `restore-result.json`: kết quả cuối PASS,135 checks và digest16 bảng;
- `cleanup-result.json`, log MySQL và PID file.

Giữ dump gốc tại private/, không sao chép dump chứa credential hashes vào repository. Không thay đổi source Java/frontend, dependency hoặc whitelist integration test cũ.

## 8. An toàn và dọn môi trường

- Không kết nối3306 hoặc thay đổi fooddelivery/Main, hanoi_food, dịch vụ/cấu hình MySQL80.
- Không truy vấn dữ liệu hoặc sửa database A2.4. Script chỉ cho database context information_schema, rehearsal và restore target.
- Không tạo tài khoản MySQL, ADMIN mới qua bootstrap hoặc thay đổi quyền.
- MySQL80 vẫn Running tại lần kiểm tra cuối.
- Không khởi động backend/frontend. Instance test do lượt này khởi động đã shutdown sau khi xác minh đúng UUID/datadir và0 kết nối khác; giữ database restore và toàn bộ bằng chứng.
- Không commit/push/deploy, không tự chuyển sang Main.

## 9. Mức sẵn sàng triển khai Main

Đã chứng minh dump cụ thể này phục hồi được schema/data đầy đủ trên MySQL8.0.46 độc lập. **Gate restore diễn tập đã PASS; có thể trình duyệt bước preflight/backup và áp dụng baseline Main.**

Chưa đủ điều kiện khởi chạy Main ngay: còn cần phê duyệt thao tác3306, xác minh schema Main vẫn rỗng và quyền operator, snapshot Main trước DDL, tạo fooddelivery_app/COD, chốt TLS MySQL/CA/SAN, RSA/HTTPS origin/proxy/runtime và ADMIN bootstrap riêng. Backup/PITR/restore dữ liệu production phát sinh về sau và recovery khi DDL Main lỗi một phần chưa được thử nghiệm trong lượt này.

Lượt này kết thúc ở xác minh restore; chưa triển khai chính thức.
