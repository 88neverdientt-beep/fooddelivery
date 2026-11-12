# Food Delivery Main — preflight và backup bằng Login Path

Ngày12/11/2026, Asia/Saigon. Bắt đầu snapshot lúc21:55:49 UTC+7.

**Kết luận: PASS cho preflight và backup Main trong phạm vi đã duyệt. Chưa áp dụng baseline hoặc triển khai ứng dụng.** Lỗi xác thực1045 của lượt trước đã được giải quyết bằng Login Path, không dùng lại tệp .cnf cũ.

**Cập nhật bước sau:** baseline001 đã được phê duyệt và áp dụng một lần,16 bảng rỗng và JPA validate PASS; xem [main-baseline-apply-result.md](main-baseline-apply-result.md). Báo cáo preflight này giữ trạng thái lịch sử trước DDL; backup5 file không thay đổi, không phải snapshot schema sau áp dụng.

## 1. Xác thực và đúng đích

- Windows user:HIEU; Login Path:`fooddelivery_main`.
- MySQL client dùng --no-defaults, Login Path, ép TCP127.0.0.1:3306 và database fooddelivery. Không đọc/in nội dung file xác thực, không dùng mysql80-readonly.cnf hoặc password trên command line.
- CURRENT_USER():root@localhost; đây là operator preflight/backup, không phải tài khoản chạy backend.
- Hostname:hieudz, khớp tên máy Windows; MySQL8.0.46.
- Server UUID:`c89cf662-c8bc-11f1-bc80-40c2ba627c1b`.
- Datadir:`C:/ProgramData/MySQL/MySQL Server 8.0/Data/`, tách khỏi test instance.
- Đúng database fooddelivery. Không truy cập application database khác hoặc cổng3307.
- Kết nối thao tác/bản dump ép ssl-mode=REQUIRED; client đọc xác nhận TLSv1.3/TLS_AES_256_GCM_SHA384.

Không dùng mysql_config_editor print, không sao chép login file hoặc đưa credential vào log/repository/report.

## 2. Schema và cấu hình Main thực tế

Trước và sau backup đều0 table/view,0routine,0event,0trigger. Không có dữ liệu nghiệp vụ hoặc object bất ngờ; không có kết nối Main khác trong lần quan sát. Metadata server/schema không đổi trong cửa sổ backup.

- Database charset:utf8mb4; collation:**utf8mb4_unicode_ci**; default encryption:NO.
- Server charset:utf8mb4; collation:utf8mb4_0900_ai_ci.
- Engine mặc định:InnoDB; transactions/savepoints hỗ trợ; innodb_strict_mode=ON, row format dynamic, page size16384byte.
- SQL mode:ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION.
- read_only=OFF; super_read_only=OFF; lower_case_table_names=1.
- time_zone=SYSTEM; system_time_zone=SE Asia Standard Time. Không thay timezone.
- Binlog=ON, formatROW; GTID=OFF. Chưa kiểm chứng retention/PITR.
- Các collation cần thiết utf8mb4_0900_ai_ci, utf8mb4_0900_as_cs và ascii_bin có sẵn.
- Operator được xác minh có SELECT/SHOW VIEW/EVENT/TRIGGER và các quyền CREATE/ALTER/INDEX/REFERENCES/CREATE TEMPORARY TABLES cần cho bước sau; không sử dụng quyền ghi/DDL trong lượt này.

**Khác biệt collation không bị tự sửa:** database Main mặc định unicode_ci khác mốc diễn tập, nhưng cả16 CREATE TABLE của baseline khai báo rõ utf8mb4_0900_ai_ci; email Account và session ID cũng có collation riêng như bản đã kiểm thử. Vì vậy baseline không phụ thuộc collation mặc định của database cho các bảng này. Không cần tự ALTER DATABASE để làm giống test; giữ nguyên metadata gốc và kiểm lại schema thực tế sau DDL nếu được duyệt.

## 3. Kiểm tra và cố định baseline

Không thực thi DDL. File001 vẫn đúng16 bảng,16PK/21FK/13UNIQUE/6CHECK. Không USE, database DDL, qualified table names, DML, CREATE USER hoặc GRANT trong baseline.

- SHA-256 canonical UTF-8/LF khớp manifest đã diễn tập: `78173e7f31856cd4b8a7f8a42cc4127fc971ad8e00c176c56346e52d3fefb893`.
- SHA-256 byte thực tế: `8a64e0e4d3cfe1d05ddac6b8e9f69fef8eb5ecda8ad3e5defa54837ae72d6b9d`,11.952byte.
- Manifest lịch sử dùng canonical text; không tuyên bố có hash byte lịch sử khác ngoài hash đã ghi trong lượt preflight trước. Không đổi newline/nội dung SQL.
- Đã lưu một bản byte-exact `001_reviewed_baseline.sql` trong thư mục evidence để pin artifact cho lần xin duyệt DDL. Đây là **artifact review**, không phải bản sao lưu dữ liệu và không được tự thực thi.

Baseline vẫn phải chạy qua operator có guard đúng UUID/port/database/schema rỗng, không qua Workbench/SOURCE trực tiếp. Operator apply hiện có dùng --defaults-file; trước bước DDL cần chuẩn bị/kiểm chứng đường xác thực Login Path giữ nguyên các guard, không quay lại credential file cũ hoặc bỏ guard để vượt lỗi. Chưa sửa hoặc chạy nhánh apply trong lượt này.

## 4. Backup logic đã tạo

Thư mục ngoài Git, ACL giới hạn cho Windows user hiện hành và SYSTEM:

`F:/New folder/fooddelivery-main-backups/20261112-LoginPath-01/`

Backup chính:

`fooddelivery-before-baseline.sql`

- Kích thước:**1.399byte**.
- SHA-256:**`9bb19e741215f1e29b43f681c71cc39cfcc3f7f44a1af9ef6c7df30cdcbde510`**.
- Mysqldump8.0 hiện có, Login Path đúng user, --single-transaction, --skip-lock-tables, --routines, --events, --triggers, --hex-blob, --no-tablespaces, --set-gtid-purged=OFF, --skip-add-drop-table.
- Chỉ đối số database fooddelivery; không --all-databases hoặc sao chép Data directory, không backup dữ liệu hanoi_food/test.
- Không khóa toàn server, dừng MySQL80, thay cấu hình hoặc chạy backend.
- Native mysqldump không có --connect-timeout trong binary này; đã kiểm tra help trước khi backup và chỉ đặt timeout đó cho mysql reader. Không có lượt dump lỗi/retry vì option không hỗ trợ.

Database rỗng nên dump không có CREATE TABLE hoặc INSERT; đây là output thật của mysqldump đã xác thực, có header đúng database và completion marker. Đã lưu SHOW CREATE DATABASE fooddelivery trong metadata JSON, gồm collation/encryption gốc, vì dump single-schema này không chứa CREATE DATABASE/USE.

Các file đi kèm:

- `fooddelivery-before-baseline.sql.sha256`;
- `preflight-backup.json`: identity/settings/objects trước-sau, quyền operator, SHOW CREATE DATABASE, trạng thái và checksum;
- `001_reviewed_baseline.sql`: artifact review nói trên;
- `independent-verification.json`.

## 5. Xác minh backup và test công cụ

**8 phép xác minh file độc lập PASS,0FAIL**, không kết nối MySQL:

- Kích thước khớp metadata; SHA khớp cả metadata và sidecar.
- Phân tích18 câu lệnh thực thi trong dump: đều SET session để lưu/khôi phục trạng thái client; không có SET GLOBAL, database DDL, bảng hoặc dữ liệu ngoài dự kiến.
- Snapshot SHOW CREATE DATABASE được giữ đúng; schema trước/sau rỗng.
- Bản DDL review byte-exact khớp hash đã pin.

**9 unit test công cụ preflight/backup PASS,0FAIL**, không truy cập credential/DB: sai namespace/port/UUID/operator, schema có object, kết nối đang hoạt động, transport không mã hóa, query ghi bị từ chối, backup sai scope/thiếu completion/data bất ngờ và baseline/collation.

Không restore backup Main vào3307 hoặc bất kỳ database nào trong lượt này. Gate restore135 checks trước đó áp dụng cho dump rehearsal; không tính thành kiểm thử mới của snapshot Main. File Main hiện được kiểm chứng checksum/nội dung cùng metadata rỗng trước/sau.

## 6. Rủi ro và điều kiện cần giữ

- Đây là snapshot trước DDL của database rỗng, không phải backup toàn server hoặc của hanoi_food. Sau khi có dữ liệu thật cần chiến lược backup/restore/PITR riêng.
- Import dump rỗng không tự xóa các bảng DDL đã tạo dở. DDL MySQL có implicit commit: nếu bước sau lỗi, dừng/giữ bằng chứng và xin duyệt sửa tiến tới hoặc cleanup giới hạn; không tự DROP/rerun/restore đè.
- Preflight là snapshot theo thời điểm. Trước apply phải kiểm lại UUID/port/version/schema vẫn rỗng, hash artifact không đổi và không có writer/DDL khác. Không coi PASS hôm nay là quyền chạy vào schema đã thay đổi.
- Transport backup đã mã hóa nhưng không khẳng định xác minh CA/hostname certificate: client dùng REQUIRED. Server require_secure_transport hiện OFF. Không đổi server; cấu hình JDBC VERIFY_IDENTITY/CA/SAN của backend Main vẫn là gate riêng, chưa nghiệm thu.
- Chưa tạo fooddelivery_app, COD, ADMIN, RSA/TLS/runtime/proxy chính thức; chưa chạy ứng dụng hoặc smoke test Main.

## 7. Bảo toàn và bước cần duyệt

MySQL80 vẫn hoạt động; không stop/restart, DDL/DML/account/grant, không đọc/sửa hanoi_food hoặc môi trường3307. Không sửa Java/frontend, commit/push/deploy.

Tạo hai script: `tools/deployment/preflight_main_login_path.py`, `tools/deployment/test_preflight_main_login_path.py`; báo cáo này và cập nhật link trạng thái trong runbook/báo cáo blocker cũ. Không sửa DDL baseline hoặc operator apply.

**Đủ điều kiện trình duyệt riêng việc áp dụng baseline001 lên fooddelivery/3306**, với UUID và artifact hash đã pin, sau khi hoàn thiện đường Login Path của operator và kiểm tra guard. Phê duyệt này chưa bao gồm tạo app account/COD/ADMIN hoặc khởi chạy Main. Lượt preflight/backup dừng tại đây chờ phê duyệt DDL.
