# Food Delivery Main — baseline và runtime, chờ duyệt triển khai

Ngày 12/11/2026. Giai đoạn chuẩn bị ban đầu không có thao tác MySQL80/3306.

**Main hiện tại:** baseline001 đã áp dụng một lần; schema16 bảng/16PK/21FK/13UNIQUE/6CHECK/45index và JPA validate PASS. Sau phê duyệt tiếp, fooddelivery_app@127.0.0.1 đã có4DML trên fooddelivery.*, COD active id1 là dòng duy nhất trong payment_methods;15 bảng khác vẫn rỗng, chưa ADMIN/website. Xem [baseline](main-baseline-apply-result.md) và [app/COD setup](main-app-cod-setup-result.md). Không apply hoặc setup lại.

**Vị trí SQL hiện tại:** database/baseline/, database/setup/, database/migrations/ và database/schema-reference.json. Byte SQL/reference không đổi; xem [sql-reorganization-result.md](sql-reorganization-result.md) và [database/README.md](../../database/README.md). Các snapshot/backup cũ giữ nguyên, không sửa lại evidence để đổi đường dẫn.

**Lịch sử trước DDL:** preflight/backup Main bằng Login Path fooddelivery_main đã PASS khi chưa có bảng; bản backup này giữ nguyên. Xem [main-preflight-backup-login-path-result.md](main-preflight-backup-login-path-result.md). Operator nay hỗ trợ Login Path cho preflight/apply/verify dưới HIEU; không dùng mysql80-readonly.cnf. Guard apply không cho chạy lại trên schema đã tạo.

## Phạm vi và hiện trạng

Đích chính: MySQL8.0.46, TCP127.0.0.1:3306, schema `fooddelivery` hiện16 bảng và1 dòng reference COD; không dữ liệu nghiệp vụ/Auth. `hanoi_food` bị loại trừ hoàn toàn. Không kết nối3307 trong các bước Main; reference/proof diễn tập chỉ đọc từ file đã giữ.

Đích diễn tập được phê duyệt riêng: `fooddelivery_main_rehearsal`, TCP127.0.0.1:3307, datadir `F:/New folder/food-delivery-mysql-test/data/`. Tài khoản `fooddelivery_rehearsal_app` mới, chỉ DML trong schema mới. Fixture ADMIN trong DB này chỉ phục vụ test, tạo sau khi schema đã được verify; không chạy AdminBootstrap.

## Bộ baseline

- `database/baseline/001_fooddelivery_baseline.sql`: đúng16 bảng, CREATE theo thứ tự FK; không data, không counter AUTO_INCREMENT từ test, không IF NOT EXISTS, không tắt FK, không DROP.
- `database/schema-reference.json`: cấu trúc chuẩn A2.4 gồm cột/type/null/default/collation, index/UNIQUE, FK/delete/update, CHECK/enforcement, engine/collation và SHA-256 baseline.
- Schema vật lý giữ native ENUM của Order/Delivery/Payment, VARCHAR của Account role/status, BIGINT signed, DECIMAL(12,2), DATETIME(6), bit(1), CHAR(36) ascii_bin và BINARY(32).
- Giữ nguyên nullability/default đã nghiệm thu; không thêm CHECK giá/số lượng/điểm hoặc unique pair chưa có trong hệ thống.
- Bốn cột version có default0. `accounts.created_at` có CURRENT_TIMESTAMP(6) để tương thích INSERT tối giản của AdminBootstrap.
- Mốc bắt buộc:16PK/21FK/13UNIQUE/6CHECK. Verify so định nghĩa đầy đủ, không chỉ đếm.

Source hiện không có Flyway/Liquibase hoặc baseline tự chạy. Giữ `ddl-auto=validate`, OSIV=false, `spring.sql.init.mode=never`. Script auth/version cũ có guard3307 khác, không dùng cho Main. Database mới không cần backfill legacy.

## Operator có chốt chặn

`tools/deployment/mysql_baseline.py` mặc định chỉ `preflight` đọc metadata. Chỉ hai profile cố định:

- main:127.0.0.1:3306/fooddelivery;
- rehearsal:127.0.0.1:3307/fooddelivery_main_rehearsal và datadir độc lập chính xác.

Main dùng --login-path fooddelivery_main dưới Windows HIEU, --no-defaults và TLS REQUIRED. Option file vẫn được giữ cho tác vụ test lịch sử, với whitelist và kiểm tra host/port; hai phương thức loại trừ nhau. CLI ép TCP/host/port/database, không reconnect/--force/retry. Login Path hiện chỉ cho preflight/apply/verify, chưa cho setup account/COD.

Preflight/apply dừng nếu có bất kỳ table/view, routine, event hoặc trigger. Kiểm tra version8.0.46, UUID, datadir. Apply cần acknowledgement chính xác `<database>@127.0.0.1:<port>` và SHA baseline khớp manifest. Trong cùng kết nối DDL, advisory lock và temporary CHECK gate kiểm lại UUID/port/database/schema rỗng ngay trước CREATE. Temporary gate không nằm trong16 bảng thường; operator cần CREATE TEMPORARY TABLES. Phải loại trừ các DDL writer khác trong cửa sổ triển khai; advisory lock chỉ phối hợp các operator cùng tuân thủ.

**Không chạy file001 bằng Workbench/SOURCE/mysql trực tiếp:** làm vậy sẽ bỏ qua guard. Không có cơ chế chống người quản trị cố tình bỏ guard hoặc sửa cả SQL và manifest; đây là bộ artifact cần review, không phải sandbox chống DBA.

Main đã áp dụng theo phê duyệt riêng, có backup/restore proof và attempt journal bắt buộc. Chỉ kiểm tra lại schema bằng lệnh đọc sau đây, không apply lại:

```text
python -B tools/deployment/mysql_baseline.py --profile main --login-path fooddelivery_main --expected-server-uuid "c89cf662-c8bc-11f1-bc80-40c2ba627c1b" --action verify
```

Không đưa password vào argument. Lỗi driver bị rút gọn thành mã; không in stdout chứa credential.

## Tài khoản app và COD: các bước riêng

**Đã thực hiện sau phê duyệt:** setup_main.py dùng hai SQL nguyên bản, lưu credential ngoài Git trước GRANT, kiểm quyền/TCP và repository COD thật bằng app. Credential ở F:/New folder/fooddelivery-main-secrets/mysql-app.cnf, không đưa nội dung vào log/chat. Không chạy lại setup, tạo lại user hoặc insert COD nữa. Phần dưới mô tả cơ chế script gốc; Main dùng operator setup riêng, không bật setup qua CLI Login Path cũ của mysql_baseline.py.

`002_fooddelivery_app.sql` dùng `IDENTIFIED BY RANDOM PASSWORD`; chỉ gọi qua action `provision-app`, sau verify schema và phê duyệt tạo tài khoản. Không chạy SQL này trực tiếp vì MySQL trả password trong result set. Operator bắt kết quả trong bộ nhớ rồi ghi option file mới ngoài Git, không echo. Từ chối nếu username đã tồn tại ở bất kỳ host nào, không reset hoặc ALTER tài khoản cũ.

Quyền app: SELECT/INSERT/UPDATE/DELETE trên `fooddelivery.*`, host127.0.0.1. Không root, DDL, GRANT OPTION, FILE hoặc routine/global privileges. Cần xác minh CURRENT_USER/SHOW GRANTS sau tạo; không tạo tài khoản cho `%` để vượt lỗi host.

Thư mục output secrets phải có ACL giới hạn trước khi chạy. Không overwrite option file. CREATE USER và GRANT có thể commit riêng: nếu lỗi giữa chừng, giữ evidence, dừng và xin duyệt khôi phục; không tự DROP/reset/retry.

`003_cod.sql` là dữ liệu cấu hình tối thiểu: method_code COD, tên tiếng Việt, active1, không hard-code method_id. Action `seed-cod` chỉ chạy sau verify/ack; từ chối COD đã tồn tại, không UPDATE giá trị hiện hữu. Chưa chạy trên Main.

## Runtime chính thức

- Mẫu `deploy/application-main.example.yml` và `deploy/main.env.example`, nạp ngoài repo trong tiến trình chính thức sau duyệt.
- Backend loopback18090, management loopback19100, frontend đề xuất `https://hanoifood.localhost:8443`. Kiểm tra cổng/hostname thực tế trước khi kích hoạt.
- `FOOD_DB_URL` trỏ chính xác3306/fooddelivery, username fooddelivery_app. `FOOD_DB_PASSWORD` cấp ngoài Git; không đưa vào frontend, report hoặc shell argument.
- JDBC mẫu yêu cầu VERIFY_IDENTITY: phải xác minh CA, certificate và hostname MySQL thực tế. Chưa kiểm chứng TLS MySQL80; không tự sửa server certificate hoặc chuyển sang DISABLED. Đây là gate cần giải quyết trước chạy chính thức.
- RSA JWT riêng tối thiểu2048 bit: private PKCS#8, public X.509, cùng cặp; issuer/audience riêng. Không dùng test key. Access10m/refresh7d theo chính sách hiện tại.
- HTTPS certificate frontend riêng, không cùng khóa JWT. Cookie Secure/HttpOnly/SameSite/CSRF giữ nguyên. Mẫu mapping FOOD_WEB_ORIGIN sang allowed-origins phải được nạp; không chỉ đặt biến rồi cho rằng application.properties tự dùng biến đó.
- `check_main_runtime.py` chỉ kiểm tra presence/đích/origin/file tồn tại, không kết nối DB hoặc đọc password/key content. Trạng thái CONFIG_PRESENT không chứng minh CA, cặp RSA, quyền DB hoặc HTTPS hoạt động.
- `nginx-main.windows.example.conf` là mẫu Windows chưa chạy: serve SPA production build, `/api` bỏ tiền tố, rewrite cookie path, không retry mutation; không proxy management. Chưa chọn/cài binary, chạy nginx config test, cấp certificate hoặc sửa trust/hosts/firewall. Phải duyệt và kiểm chứng những bước này.
- Vite preview/staging gateway cũ không dùng làm runtime chính thức. Không ghi đè JAR/dist đang phục vụ demo. Đóng gói cặp artifact mới và cố định hash; source chính có các file chưa commit, không lấy Git HEAD thay cho working tree đã nghiệm thu.
- Dùng JDK25.0.4/Maven3.9.16 theo từng process, không đổi Java toàn hệ thống. Không bật strict precondition mode khác chính sách hiện hành.

## ADMIN bootstrap, chưa thực hiện

`Invoke-AdminBootstrap.ps1` chỉ gọi CLI `AdminBootstrap.java` hiện có, dùng PropertiesLauncher trong JAR. Script yêu cầu approval switch riêng, hash JAR, target URL/username đúng, schema verify và credential file ngoài Git. Không khởi động HTTP server; bật opt-in trong phạm vi tiến trình rồi khôi phục biến môi trường.

Sau nghiệm thu schema và phê duyệt riêng, người dùng tự chọn email/password. Chính sách tối thiểu12 ký tự, tối đa72byte UTF-8, BCrypt12. File credential dùng định dạng Java Properties: `Properties.load(InputStream)` không mặc định UTF-8; ký tự ngoài ASCII cần Unicode escape đúng, không lưu UTF-8 rồi giả định sẽ được đọc nguyên dạng. Không đưa mật khẩu vào command hoặc report.

Công cụ từ chối khi đã có bất kỳ ADMIN nào, kể cả DISABLED; không phải công cụ khôi phục tài khoản. Sau thành công, kiểm tra login/logout và bảo vệ/xử lý file credential theo chính sách đã duyệt; không để opt-in bật trong backend thường trực. Script PowerShell mới chỉ được parse; không tự dùng ExecutionPolicy Bypass khi Windows chặn.

## Backup/khôi phục

Action `backup` cũ vẫn dùng option file cho test; Login Path không bật action này. Backup Main trước DDL đã tạo qua preflight_main_login_path.py và được giữ nguyên. Cấu trúc Main nay có16 bảng nên không chạy lại empty-schema preflight/backup đó. Các backup sau baseline cần kế hoạch/phạm vi riêng; không ghi đè snapshot trước DDL. Không coi mã thoát0 hoặc SHA là bằng chứng restore thành công.

Trước DDL Main: xác nhận database vẫn rỗng; lưu metadata/schema snapshot, server UUID/config cần thiết và artifact hashes; duyệt cửa sổ không có writer/DDL khác. Khi có dữ liệu về sau, kiểm tra toàn bộ InnoDB và chính sách RPO/RTO/binlog trước chọn single-transaction.

DDL có implicit commit. Nếu lỗi một phần: không chạy tiếp, không `--force`, không tự DROP bảng/database hoặc dùng create-drop. Ghi lại bảng nào đã tạo; operator kiểm tra và xin duyệt phương án làm sạch có giới hạn hoặc sửa tiến tới. Giữ bản snapshot gốc và schema ngoài Git.

Khôi phục phải được diễn tập vào đích độc lập mới được duyệt, không A2.4/Main đang có dữ liệu. **Cập nhật12/11/2026:** người dùng đã phê duyệt `fooddelivery_restore_verification` trên3307; dump diễn tập đã restore thành công một lần,16 bảng khớp schema/data và135 kiểm tra toàn vẹn PASS. Xem [main-restore-verification-result.md](main-restore-verification-result.md). Không dùng dump fixture này để nạp dữ liệu Main. Khi đã có ghi mới, không phục hồi đè snapshot cũ làm mất giao dịch; cần PITR/delta/đối soát và phê duyệt riêng. Rollback app dùng cặp artifact tương thích schema, không mặc định build A2.1.

## Các bước duyệt tiếp theo

1. Đã hoàn tất baseline/rehearsal/restore review; giữ nguyên database/proof restore và snapshot cũ.
2. Đã hoàn tất Login Path Main, preflight/backup và áp dụng001 một lần; schema/index/JPA validate PASS. Không apply lại.
3. Đã hoàn tất fooddelivery_app và COD sau phê duyệt riêng, minimal grants/TCP/JPA/repository PASS; không tạo lại hoặc reset.
4. Chốt TLS MySQL, hostname/certificate HTTPS/frontend proxy, keys/ACL/runtime ports; mọi thay đổi MySQL80 config/trust/hosts/service cần duyệt riêng.
5. Nghiệm thu schema/quyền rồi duyệt ADMIN bootstrap một lần.
6. Duyệt chạy backend/frontend và smoke test có ghi auth. Kiểm thử nghiệp vụ ghi Main phải duyệt dữ liệu/phạm vi, không tự xóa lịch sử sau thử.

Không commit/push/deploy; không tự chuyển sang triển khai chính thức.

Bước A bảo mật/runtime: xem [kết quả](main-security-runtime-step-a-result.md) và [hướng dẫn](main-security-runtime-runbook.md). Chuẩn bị/test PASS; HTTPS và MySQL VERIFY_IDENTITY còn chờ xác minh; chưa bootstrap ADMIN hoặc chạy Main.
