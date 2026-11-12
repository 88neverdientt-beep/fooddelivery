# Food Delivery Main — tài khoản ứng dụng và COD

Ngày12/11/2026, Asia/Saigon. Lượt setup bắt đầu23:04:29 UTC+7.

**Kết luận: PASS cho tạo tài khoản MySQL ứng dụng, quyền tối thiểu và cấu hình COD.** Schema giữ nguyên; chỉ có1 dòng payment_methods. Không tạo ADMIN/hồ sơ/đơn hàng hoặc khởi chạy website. Checkout đầu-cuối chưa chạy vì giới hạn không tạo dữ liệu nghiệp vụ.

## 1. Trước thao tác

Đã đọc runbook và main-baseline-apply-result. Login Path fooddelivery_main dưới HIEU xác thực operator đúng Main127.0.0.1:3306, MySQL8.0.46, UUID `c89cf662-c8bc-11f1-bc80-40c2ba627c1b`, database fooddelivery. Không dùng .cnf quản trị cũ hoặc môi trường3307.

Schema trước setup khớp16 bảng/16PK/21FK/13UNIQUE/6CHECK/45 index, mọi bảng0 dòng. Username fooddelivery_app chưa tồn tại ở bất kỳ host nào; mandatory roles rỗng. Hai script setup khớp byte đã diễn tập/relocation:

- database/setup/002_fooddelivery_app.sql: SHA-256 `cbee94a0bb1920f5fa53532f4a46f8088908247c51aba65803629d9292c8d284`.
- database/setup/003_cod.sql: SHA-256 `6ed1e8b0e9d0cca32c301ac5c28f7671f921d341189b92d7c1473c5e03bea674`.

Không sửa nội dung SQL. Công cụ Main riêng setup_main.py điều phối các câu lệnh nguyên bản; mysql_baseline.Client cung cấp Login Path/target guards. CLI setup cũ trong mysql_baseline.py vẫn chưa bật với Login Path, không bỏ guard hoặc quay lại credential quản trị cũ.

## 2. Tài khoản thực tế và bảo vệ credential

Đã CREATE USER đúng một lần: **fooddelivery_app@127.0.0.1**, plugin mặc định caching_sha2_password; không khóa, không expired.

Mật khẩu ngẫu nhiên **32 ký tự do MySQL sinh** bằng IDENTIFIED BY RANDOM PASSWORD. Chỉ đặt generated_random_password_length=32 trong phiên CREATE USER; phiên mới sau setup vẫn có default20, không thay cấu hình global.

Password trả về chỉ được bắt trong RAM, không forward stdout/log/report. File đích được reserve bằng open(x) trước CREATE USER; credential được ghi/flush/fsync ngay sau CREATE USER, trước GRANT, để giữ được thông tin nếu GRANT lỗi. Không password trên command line hoặc environment, không nội dung credential trong SQL/source/report.

Credential duy nhất lưu ngoài Git tại:

`F:/New folder/fooddelivery-main-secrets/mysql-app.cnf`

Thư mục secret tắt kế thừa ACL, chỉ user Windows hiện hành và SYSTEM có quyền. File kế thừa ACL giới hạn này, không overwrite file cũ. Option file chỉ trỏ TCP127.0.0.1:3306/fooddelivery bằng fooddelivery_app, TLS REQUIRED; không dùng root làm tài khoản backend. Chưa tạo file runtime JWT/HTTPS hoặc bật ứng dụng.

Không đưa file này vào commit, report, backup dữ liệu công khai hoặc chat. Báo cáo chỉ cung cấp vị trí, không password/hash/nội dung file.

## 3. SHOW GRANTS và quyền tối thiểu

Đã thực hiện SHOW GRANTS FOR tài khoản app bằng operator; app cũng thực hiện SHOW GRANTS trên chính kết nối JDBC của nó. Kết quả quyền:

```sql
GRANT USAGE ON *.* TO `fooddelivery_app`@`127.0.0.1`;
GRANT SELECT, INSERT, UPDATE, DELETE ON `fooddelivery`.* TO `fooddelivery_app`@`127.0.0.1`;
```

Đây là kết quả đọc quyền, không phải lệnh chạy thêm. USAGE biểu thị không có global privilege. Metadata xác minh chỉ4 schema privileges đúng database, IS_GRANTABLE=NO,0role kế thừa,0dynamic grant và mandatory roles vẫn rỗng. Không quyền DDL, FILE, quản trị, GRANT OPTION hoặc database ứng dụng khác; không tạo account host wildcard.

**TCP/JDBC probe PASS với CURRENT_USER fooddelivery_app@127.0.0.1**, cùng port/version/UUID/database Main và TLS REQUIRED. Credential app cấp trực tiếp cho ConnectorJ qua stdin/RAM từ option file bảo vệ; không dựa vào default Login Path root cho kết nối app. Root chỉ là operator SQL setup, không là backend identity.

## 4. COD thực tế và khả năng dùng cho checkout

Sau TCP probe và grants PASS, thực thi duy nhất INSERT của003 trong transaction, không upsert hoặc UPDATE dòng có sẵn:

- method_id:1 do MySQL sinh;
- method_code:COD;
- method_name:Thanh toán khi nhận hàng;
- is_active:1.

Trước insert yêu cầu payment_methods còn rỗng; UNIQUE(method_code) giữ nguyên để chặn đua tạo trùng. Sau insert đúng1 dòng, không thêm phương thức test/giả.

Kiểm tra headless bằng tài khoản app, JDBC read-only và artifact hiện có:

- Hibernate ddl-auto=validate PASS với16entity.
- Khởi tạo **PaymentMethodRepository thật** bằng Spring Data JPA, không mock.
- `findByIsActiveTrueAndPaymentMethodCodeOrderByPaymentMethodIdAsc("COD")` trả đúng1 lựa chọn active; đây là query CustomerReadService sử dụng cho checkout.
- `findById` trả đúng COD active/tên tiếng Việt; đây là lookup PaymentService dùng trước khi tạo Payment.
- Không SpringApplication, HTTP server, JWT/ADMIN bootstrap, entity persist hoặc Order/Payment writer.

**PASS mức cấu hình và đọc COD qua repository thật.** Không tuyên bố checkout đầu-cuối PASS trên Main: cần Customer/Restaurant/menu/cart/order, hiện chưa được phép tạo. Luồng nghiệp vụ đầy đủ sẽ kiểm thử sau khi có phê duyệt dữ liệu/phạm vi riêng.

## 5. Trạng thái cuối và kiểm thử

- Schema/index/reference không đổi:16 bảng,16PK,21FK,13UNIQUE,6CHECK,45 index.
- payment_methods:1 dòng COD; **15 bảng còn lại đều0 dòng**.
- accounts/auth_sessions/refresh_tokens:0; customers/restaurants/drivers:0; orders/details/payments/deliveries:0. MySQL fooddelivery_app khác với Account ADMIN của ứng dụng; không tạo ADMIN.
-60 Python safety/unit test PASS,0FAIL, không kết nối DB;9 test mới về script pinning, serialize credential, minimal grants, duplicate guard và partial failure.
- Checker biên dịch PASS trước CREATE USER; TCP app PASS, SHOW GRANTS PASS,16-entity JPA/repository COD PASS.
-10 điều kiện hậu kiểm PASS,0FAIL.

Operator giữ journal một lần và từ chối account/credential/attempt đã tồn tại. Nếu lỗi giữa CREATE USER/GRANT/insert, giữ credential/trạng thái và chỉ đọc để báo cáo, không reset/retry/drop. Lượt thực tế không có lỗi; account/grant/insert đều thành công một lần.

## 6. Bảo toàn, file và bằng chứng

Cả5 file backup Main trước DDL giữ nguyên SHA. SQL/reference trong database/ và proof baseline cũ không đổi. Không chạy baseline hoặc migration lịch sử, không thay hanoi_food/3307, không stop/restart MySQL80, không commit/push/deploy. Các tiến trình checker đã kết thúc; không có website mới được khởi chạy.

Thêm tools/deployment/setup_main.py, test_setup_main.py, MainPaymentMethodReadCheck.java. Refactor công cụ MainJpaValidate.java để chia sẻ cấu hình/connection read-only cho app; default kiểm tra root cũ giữ nguyên. Không sửa Java ứng dụng/frontend/dependency hoặc hai SQL setup.

Evidence không chứa credential tại:

`F:/New folder/fooddelivery-main-setup-20261112/`

Gồm prepare-result.json, before-setup.json, setup-attempt.json, final-verification.json và class/library checker. Credential nằm ở thư mục secret riêng nêu trên, không trong evidence/report. SHOW GRANTS được lưu sau khi kiểm tra không có authentication fields.

## 7. Dừng và bước còn lại

Đã hoàn thành đúng phạm vi app account + COD. Không chạy lại setup vì account và reference row đã tồn tại. Nếu cần chỉ đọc đối chiếu, không tự reset password hoặc dùng upsert để bỏ qua guard.

Chờ phê duyệt cấu hình JWT/RSA, HTTPS/origin/proxy, runtime credential và ADMIN bootstrap. Kiểm tra hiện tại dùng TLS REQUIRED; runtime VERIFY_IDENTITY/CA/SAN vẫn là gate riêng, không tự thay cấu hình MySQL80. Chưa khởi chạy backend/frontend chính thức hoặc kiểm thử ghi nghiệp vụ Main.
