# Food Delivery Main — kết quả áp dụng baseline

Ngày12/11/2026, Asia/Saigon.

**PASS: baseline001 đã áp dụng đúng một lần lên fooddelivery/MySQL80 tại127.0.0.1:3306.** Schema khớp reference, Hibernate/JPA validate16entity PASS, toàn bộ16 bảng còn rỗng. Chưa khởi chạy website/backend nghiệp vụ hoặc thực hiện các bước setup khác.

Cập nhật bước sau: app account và COD đã được phê duyệt/thực hiện; schema giữ nguyên, payment_methods có1COD và15 bảng khác rỗng. Xem [main-app-cod-setup-result.md](main-app-cod-setup-result.md). Các số0 dòng bên dưới là snapshot lịch sử sau baseline, không sửa proof cũ.

## 1. Guard và đúng đích

Đã đọc runbook và báo cáo baseline/rehearsal/restore/preflight/backup/relocation mới nhất. Xác thực bằng Login Path fooddelivery_main dưới Windows HIEU; CURRENT_USER root@localhost là operator, không phải tài khoản runtime backend.

Main xác minh: MySQL8.0.46, hostname hieudz, TCP127.0.0.1:3306, database fooddelivery, UUID `c89cf662-c8bc-11f1-bc80-40c2ba627c1b`, datadir `C:/ProgramData/MySQL/MySQL Server 8.0/Data/`. Client ép --no-defaults/Login Path/target/TLS REQUIRED/--skip-reconnect, không dùng mysql80-readonly.cnf hoặc password trên command line.

Ngay trước DDL, schema vẫn0table/view/routine/event/trigger. SQL strict mode, InnoDB, charset/collation hỗ trợ, quyền operator, transport và không có writer Main khác đều PASS. Không kết nối3307 hoặc dùng hanoi_food.

## 2. Backup, artifact và khôi phục

Giữ nguyên `F:/New folder/fooddelivery-main-backups/20261112-LoginPath-01`:

- Dump1.399byte, SHA-256 `9bb19e741215f1e29b43f681c71cc39cfcc3f7f44a1af9ef6c7df30cdcbde510`, khớp metadata/sidecar.
- Metadata khớp independent-verification, cùng UUID và đúng Main rỗng trước/sau snapshot.
- DDL review byte-exact trong backup khớp baseline hiện tại.
- Proof restore rehearsal đã PASS135 checks/16 bảng; chỉ đọc file proof, không chạy restore hoặc truy cập3307.
- Sau thao tác, SHA của cả5 file backup Main không đổi.

SQL: `database/baseline/001_fooddelivery_baseline.sql`.

- Canonical UTF-8/LF SHA-256: `78173e7f31856cd4b8a7f8a42cc4127fc971ad8e00c176c56346e52d3fefb893`.
- Byte SHA-256: `8a64e0e4d3cfe1d05ddac6b8e9f69fef8eb5ecda8ad3e5defa54837ae72d6b9d`.
- schema-reference.json byte SHA-256: `f306e32a5f22f74029db7c381163a23af01f7e14c61a206f0dbaa4d5da3c204f`.

Không sửa SQL/reference hoặc hash để vượt guard. Baseline không USE/DDL database/qualified namespace khác/DML/seed/account/grant.

Đã xác nhận giới hạn khôi phục: dump rỗng không tự xóa các bảng DDL tạo dở; DDL có implicit commit. Nếu lỗi phải dừng và báo bảng thực tế, không retry/DROP/restore đè tự động. Lượt này không có lỗi DDL nên không thực hiện nhánh khôi phục.

## 3. Áp dụng đúng một lần

Operator bổ sung Login Path nhưng giữ target/hash/empty-schema guards. Main apply bắt buộc Login Path đúng HIEU, backup/restore proof hợp lệ, acknowledgement đúng đích và evidence directory mới. Login Path chỉ cho preflight/apply/verify; không cho setup account/COD.

Marker apply-attempt.json tạo bằng open(x) trước SQL, không dùng lại attempt cũ. Một kết nối giữ advisory lock và temporary CHECK gate kiểm lại UUID/port/version/database/schema rỗng cùng foreign_key_checks/unique_checks=1 trước baseline. Bảng gate là temporary, không thuộc16 bảng thường và tự mất khi client đóng.

**Đã gửi một batch baseline, client exit0; không --force/reconnect/retry hoặc chạy migration lịch sử.** Nếu lỗi, operator chỉ SELECT tên bảng thực tế để báo cáo; test mock chứng minh không retry/DROP. Không có seed hoặc INSERT nghiệp vụ; chỉ INSERT số1 vào temporary gate để kiểm điều kiện.

## 4. Schema/index sau áp dụng

- 16 bảng,16 PRIMARY KEY,21 FOREIGN KEY,13 UNIQUE,6 CHECK.
- 45 index:16 PRIMARY,13 UNIQUE,16 non-unique;46 index-column entries do composite index. Tất cả BTREE, visible.
- Toàn bộ21 FK ở trong fooddelivery,0 tham chiếu schema khác.
- 6 CHECK enforced. Cột/type/nullability/default/collation, index/prefix/order/unique, FK actions và CHECK clauses khớp database/schema-reference.json.
- Mặc định database vẫn utf8mb4_unicode_ci; bảng/cột dùng collation khai báo trong baseline, không ALTER DATABASE.
- Mọi bảng đều0 dòng, bao gồm accounts/auth_sessions/refresh_tokens/payment_methods. Không COD, ADMIN hoặc hồ sơ/dữ liệu nghiệp vụ.

## 5. JPA validate không ghi dữ liệu

JDBC không tự đọc Login Path. Công cụ native my_print_defaults được gọi với --show chỉ trong subprocess **capture vào RAM**, không forward stdout/stderr. Credential đi qua stdin pipe tới JVM ngắn hạn, không ghi vào file, argv, environment hoặc log. Không custom-decode login file. Library logging tắt trước khi cấp credential; không lưu message/stack/raw JDBC output.

JDBC probe trước DDL PASS. Sau DDL checker dùng:

- JDK25.0.4, Hibernate7.4.5.Final/ConnectorJ từ artifact đã build, không đổi dependency.
- 142 Java ứng dụng hiện tại khớp source artifact; JAR SHA `82e8dd67f6c361d57fcd8199face059225be0b26b2bc0f3ad7c3c3b123ce1b89`.
- Đủ13 entity nghiệp vụ và3 auth, physical naming snake_case, default catalog fooddelivery.
- Hibernate hbm2ddl.auto=validate; SessionFactory là JPA EntityManagerFactory, metamodel đủ16entity.
- DataSource readOnly=true; proxy chặn SQL ghi/batch/callable/unwrap. Parser write guard được thử cục bộ, không gửi CREATE probe lên MySQL.
- Không SpringApplication, HTTP server, service nghiệp vụ, entity persist, JWT/key/bootstrap hoặc seed.

**JPA validate PASS,16entity.** Toàn bộ16 bảng còn0 dòng trước/sau. Các tiến trình JVM kiểm tra đã kết thúc; không dùng root chạy backend chính thức.

## 6. Kiểm thử và bằng chứng

- 51 Python unit/guard test PASS,0FAIL, không kết nối DB; gồm11 test mới cho Login Path/target/HIEU/backup/marker/partial-failure/no retry/no DROP.
- Main preflight và JDBC probe PASS.
- SQL batch một lần PASS; full schema/reference/index và8 điều kiện hậu kiểm PASS.
- Headless Hibernate/JPA validate PASS; không chạy JUnit integration writers trên Main.

Evidence: `F:/New folder/fooddelivery-main-baseline-20261112/`:

- before-apply.json, apply-attempt.json;
- post-schema.json, final-verification.json;
- jpa/probe-result.json, jpa/validate-result.json cùng class/library checker.

JSON không chứa password/hash/token hoặc output credential native. Không thay evidence rehearsal/restore/Main backup trước đó.

## 7. File và bảo toàn

Sửa mysql_baseline.py; thêm test_main_login_path_apply.py, MainJpaValidate.java, run_main_jpa_validate.py trong tools/deployment. Bổ sung báo cáo và cập nhật runbook/README/link trạng thái. Không sửa Java ứng dụng/frontend, dependency, SQL/reference hoặc backup Main.

Không CREATE USER/grant fooddelivery_app, COD, ADMIN, migration lịch sử, website/commit/push/deploy. MySQL80 vẫn Running, không stop/restart. Không tác động hanoi_food hoặc dữ liệu3307.

## 8. Dừng và bước cần duyệt tiếp

**Main hiện có16 bảng hợp lệ và rỗng. Không apply lại hoặc chạy empty-schema preflight cho trạng thái này.** Nếu cần, dùng action verify chỉ đọc.

Cần phê duyệt riêng cho fooddelivery_app, COD, credential/runtime/RSA/TLS/HTTPS/proxy, ADMIN bootstrap và chạy/smoke-test ứng dụng. JDBC kiểm tra dùng TLS REQUIRED; runtime VERIFY_IDENTITY/CA/SAN và backup/PITR sau khi có dữ liệu vẫn chưa nghiệm thu.

Lượt này dừng sau baseline/JPA validate, chờ phê duyệt tiếp theo.
