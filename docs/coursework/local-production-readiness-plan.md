# HanoiFood — phương án chạy chính thức trên máy cá nhân

Ngày kiểm tra: 12/11/2026. Phạm vi: kiểm tra chỉ đọc và lập phương án; chưa chuyển môi trường.

**Kết luận hiện tại: PARTIAL.** Source đã có các thay đổi ứng dụng A2.1–A2.4. Chưa xác nhận được database chính, ADMIN chính thức hoặc chênh lệch schema thực tế vì MySQL80 từ chối xác thực bằng tệp kết nối được cung cấp (ERROR 1045). Không đủ căn cứ để chạy bản chính thức hoặc chốt DDL migration.

## 1. Những việc đã kiểm chứng

- Source chính: `F:/New folder/food-delivery`.
- Đối chiếu 291 file ứng dụng với manifest A2.4: tất cả khớp. Fingerprint source: `d5a8bc8187db4c3bc57042812531a950550684e029d967cdabfd4b6372fc7e0a`.
- Có đủ source tạo nhà hàng, thêm menu, checkout và ba loại xuất Excel. A2.4 bổ sung kiểm thử tích hợp và tài liệu trên source A2.1–A2.3.
- Source có các thay đổi chưa commit và file mới. Một bản đóng gói chỉ lấy Git HEAD sẽ không đại diện đầy đủ cho bản đã nghiệm thu. Lượt này không commit hoặc thay đổi lịch sử.
- MySQL80 đang Running; cổng 3306 có listener. Đây là dịch vụ khác với MySQL test cổng 3307.
- Demo `http://127.0.0.1:4176` trả HTTP 200 tại lần kiểm tra cuối. Không dừng hoặc đổi cấu hình demo.

### Source đầy đủ nhưng artifact ở thư mục gốc chưa đầy đủ

JAR trong `target/` và `frontend/dist` của repo vẫn là build A2.1 cũ phục vụ phiên thử trước đó. JAR này có `RestaurantExcelController`, chưa có `MenuExcelController` và `OrderExcelController`. Không lấy trực tiếp JAR/dist đó làm bản chính thức.

Bộ artifact tích hợp A2.4 nằm riêng tại:

- `F:/New folder/food-delivery-mysql-test/coursework-a24-20261112/backend-source/target/fooddelivery-0.0.1-SNAPSHOT.jar`;
- `F:/New folder/food-delivery-mysql-test/coursework-a24-20261112/frontend-dist`.

JAR A2.4 có SHA-256 `e29b805eeebb8ad75df01a5cb26e82e7bf00443ba9524a3528b501ce97472f79`. Có thể xét duyệt artifact này hoặc build lại source đã chốt sang thư mục release riêng. Không mang config, khóa, tài khoản hoặc fixture test sang môi trường chính. Không build đè thư mục đang phục vụ các phiên demo.

## 2. Cấu hình ứng dụng hiện tại

Backend `src/main/resources/application.properties`:

- Datasource lấy từ `FOOD_DB_URL`, `FOOD_DB_USERNAME`, `FOOD_DB_PASSWORD`, không cố định tên database chính.
- Hibernate `ddl-auto=validate`; `open-in-view=false`; `show-sql=false`.
- Auth persistence đang bật. JWT issuer, audience và đường dẫn RSA private/public key lấy từ cấu hình ngoài source.
- Không thấy biến môi trường datasource tương ứng trong tiến trình shell kiểm tra. Điều này không suy ra các tiến trình backend đang chạy thiếu cấu hình: chúng dùng cấu hình riêng khi khởi động.

Frontend `frontend/vite.config.ts`:

- API cùng origin theo tiền tố `/api`; proxy bỏ tiền tố này trước khi gọi backend.
- Proxy mặc định về `127.0.0.1:18080`; preview mặc định `localhost:4173`. Đây là mặc định của môi trường cũ, không tự trỏ tới MySQL80 hoặc backend chính thức.
- Cookie path `/auth` được chuyển thành `/api/auth` qua proxy.
- Build có manifest, không phát hành sourcemap.

Cookie refresh/CSRF có Secure; cần HTTPS để đăng nhập hoạt động nhất quán trên các browser. Không bỏ Secure/CSRF để chạy bản chính thức bằng HTTP. A2.4 từng phải kiểm chứng WebKit qua HTTPS.

Các file `deploy/application-production.example.yml`, `.env.example`, cấu hình nginx và runbook là mẫu để review; có hostname/path/cổng minh họa, không phải cấu hình Windows chính thức đã chạy. Không copy nguyên mẫu Linux hoặc dùng tên database mẫu làm kết luận về database thật.

## 3. Trở ngại kiểm tra MySQL80

Workbench có profile `127.0.0.1:3306` với default schema `hanoi_food`. Đây chỉ là dấu hiệu cấu hình client; chưa chứng minh database này tồn tại hoặc là đích cần sử dụng. Không đọc kho mật khẩu Workbench.

Đường dẫn người dùng đã cung cấp:

`F:/New folder/hanoifood-local-secrets/mysql80-readonly.cnf`

Tệp ban đầu chưa tồn tại; đã xuất hiện trong lúc kiểm tra. Helper đã xác minh cấu hình trỏ cổng 3306 rồi thử kết nối TCP đúng 127.0.0.1:3306. MySQL trả ERROR 1045 (từ chối xác thực), nên dừng trước khi thực hiện được truy vấn metadata. Không in thông tin đăng nhập hoặc lỗi xác thực nguyên văn. Vì vậy:

- Đã thử xác thực nhưng chưa thực hiện thành công SELECT/SHOW trên MySQL80; không đăng nhập website hoặc ghi session.
- Chưa biết schema chính, phiên bản server thực tế, cấu trúc/collation/constraint, dữ liệu legacy hay ADMIN trên 3306.
- Chưa thể kết luận main có hoặc không có bảng auth, thiếu migration nào, hoặc có ADMIN ACTIVE hay không.
- ADMIN demo A2.4 không được coi là ADMIN chính thức.

Người dùng cần kiểm tra lại thông tin xác thực trong tệp bằng tài khoản MySQL hiện có và xác nhận tài khoản đó đăng nhập được qua TCP `127.0.0.1:3306`, hoặc cung cấp đường dẫn đúng khác. Không thể kết luận chỉ từ mã 1045 là mật khẩu sai: tài khoản/host hoặc cấu hình xác thực cũng cần kiểm tra. Tệp có mục `[client]`, host `127.0.0.1`, port `3306`, thông tin xác thực nhập cục bộ; ưu tiên tài khoản hiện có chỉ đủ đọc. Không gửi nội dung, mật khẩu hoặc token vào chat. Giới hạn quyền đọc file theo tài khoản Windows cần sử dụng. Không tạo tài khoản MySQL mới hoặc tự đổi mật khẩu để vượt lỗi trong lượt kiểm tra này.

### Trình tự SELECT/SHOW sau khi có tệp

1. Xác minh host/port của option file; từ chối init-command/include hoặc tùy chọn thực thi ngoài phạm vi. Không in nội dung file hay lỗi chứa thông tin đăng nhập.
2. SELECT thông tin server/port/datadir/version để chắc chắn không nhầm instance test.
3. SELECT metadata schema được phép thấy; xác định ứng viên có các bảng nghiệp vụ. Nếu có nhiều ứng viên, xin người dùng chọn đích thay vì tự quyết định.
4. Đọc information_schema: bảng/engine/collation, cột/type/null/default, PK/UNIQUE/index, FK và quy tắc DELETE/UPDATE, CHECK và trạng thái enforcement. Chỉ đếm dữ liệu, không dump dữ liệu cá nhân hoặc bí mật.
5. Đếm ADMIN theo role/status; không SELECT password_hash/token. Phân biệt tài khoản MySQL với Account ADMIN của website.
6. Preflight chỉ trả số lượng lỗi: email trùng sau chuẩn hóa trong/cross ba hồ sơ, email sai định dạng, hash BCrypt sai định dạng/cost, profile thiếu hoặc orphan, cặp liên kết trùng và giá trị enum/tiền không tương thích. Không tự sửa lỗi dữ liệu.
7. So sánh bằng định nghĩa cột/constraint, không chỉ bằng số lượng hoặc tên constraint. Quyền đọc không đủ phải báo thiếu phạm vi quan sát, không suy ra bảng không tồn tại.

Đã chạy helper kiểm tra chỉ đọc tại thư mục bằng chứng bên ngoài repo; helper dừng ở lỗi xác thực 1045 và chưa tạo kết quả metadata main. Kết quả metadata chính thức phải được review trước khi hoàn thiện migration.

## 4. Schema A2.4 làm mốc so sánh

Reference: `fooddelivery_coursework_a24` tại `127.0.0.1:3307`. Metadata chỉ đọc đã xác minh:

- 16 bảng, 16 PRIMARY KEY, 21 FOREIGN KEY, 13 UNIQUE, 6 CHECK.
- Bảng nghiệp vụ: customers, restaurants, drivers, food_items, restaurant_food_items, carts, cart_items, orders, order_details, deliveries, payment_methods, payments, ratings.
- Bảng auth: accounts, auth_sessions, refresh_tokens.
- ID hồ sơ là BIGINT; tiền nghiệp vụ DECIMAL(12,2).
- `accounts` liên kết hồ sơ bằng ID hiện hữu; email unique, role/status và cấu trúc profile có constraint.
- `version BIGINT NOT NULL DEFAULT 0` có ở accounts/customers/restaurants/drivers, tương ứng JPA @Version.
- Session ID CHAR(36); refresh token lưu hash BINARY(32), không lưu raw token.

**Chưa có kết quả main-versus-A2.4.** Các con số trên là reference, không phải kết quả kiểm tra database chính. Không nên tạo lại toàn bộ schema chỉ để đạt cùng số lượng constraint; phải đối chiếu ý nghĩa và dữ liệu trước.

## 5. Migration có thể cần, chưa được thực thi

Chỉ quyết định sau metadata và preflight thực tế:

1. Đối chiếu các bảng nghiệp vụ và cấu hình COD với entity/source hiện tại: kiểu ID, độ chính xác tiền, cột, index, unique pair, FK, nullability. Chỉ đề xuất phần thực sự thiếu; không đổi ID/FK, không nạp danh mục hoặc dữ liệu mẫu A2.4 vào main.
2. Nếu chưa có auth: expand accounts/auth_sessions/refresh_tokens; nếu đã có thì kiểm tra tương thích và trạng thái triển khai dở, không chạy CREATE mù.
3. Backfill Account từ hồ sơ có email/hash hợp lệ; giữ ID nghiệp vụ và hash hiện có. Dừng nếu email trùng, hash không hợp lệ hoặc liên kết không an toàn. Không tự thay mật khẩu, hash lại hash hoặc xóa hồ sơ legacy.
4. Bổ sung bốn cột version nếu thực sự thiếu; từ chối trạng thái partial không rõ nguồn gốc.
5. Giữ các cột password cũ ở bước tương thích này; không tự cleanup hoặc thay nghiệp vụ thanh toán/giao hàng.

Các script `database/migrations/01_expand_auth.sql`, `02_backfill_accounts.sql`, `03_stage8_versions.sql` có guard khóa vào database/instance thử nghiệm cụ thể ở cổng 3307. **Không chạy nguyên script trên 3306 và không đơn giản bỏ guard.** Cần migration riêng cho đúng database đích, precondition, kiểm tra hậu điều kiện và diễn tập restore trên clone đã được duyệt.

MySQL DDL có implicit commit: không được hứa dùng transaction ROLLBACK để hoàn tác mọi DDL. Chưa cung cấp DDL main “sẵn chạy” khi chưa biết schema. Không chạy migration tự động lúc backend khởi động; giữ `ddl-auto=validate`.

## 6. ADMIN chính thức

Hiện chưa xác minh có ADMIN trên 3306. Sau SELECT:

- Có ADMIN ACTIVE: sử dụng tài khoản này; người dùng tự nhập mật khẩu. Nếu cần đổi mật khẩu, ưu tiên `/account/change-password` sau khi xác thực được mật khẩu hiện tại. Thao tác đổi mật khẩu thu hồi các phiên của tài khoản và yêu cầu đăng nhập lại.
- Có ADMIN nhưng không ACTIVE hoặc quên mật khẩu: lập phương án khôi phục riêng và xin duyệt; không tự tạo ADMIN thứ hai để vượt trạng thái.
- Không có ADMIN: chỉ sau phê duyệt mới dùng công cụ `AdminBootstrap` hiện có với thông tin người dùng tự chọn trong file bảo vệ ngoài Git. Công cụ yêu cầu opt-in và từ chối nếu đã có bất kỳ ADMIN nào; không có tài khoản/mật khẩu mặc định.

Không sao chép ADMIN demo, quyền hoặc password hash từ A2.4 vào main.

## 7. Phương án runtime Windows tách biệt

Đề xuất để người dùng duyệt, chưa tạo hoặc khởi chạy:

- Runtime/release/log chính thức: `F:/New folder/hanoifood-local-runtime`; secrets: `F:/New folder/hanoifood-local-secrets`, ngoài repo. Phân quyền truy cập riêng, không log headers/password/token.
- Backend loopback `127.0.0.1:18090`; management loopback `127.0.0.1:19100`; HTTPS frontend `https://hanoifood.localhost:8443`. Các cổng đề xuất chưa bị chiếm tại lần kiểm tra; cần kiểm tra lại trước khi chạy.
- Hostname riêng giúp tránh cookie dùng chung giữa các môi trường cùng hostname khác port. Cần xác minh phân giải hostname và certificate phù hợp; nếu cần sửa hosts/cài trust phải xin duyệt trước. Không cài certificate test vào hệ thống.
- Datasource chỉ rõ `127.0.0.1:3306/<schema được xác nhận>`. Tài khoản app chỉ DML trong schema đích, tách operator migration/backup; việc tạo/cấp quyền cần duyệt riêng. Kiểm tra TLS server/CA/hostname, không sao chép `sslMode=DISABLED` của test hoặc bỏ kiểm tra TLS để vượt lỗi.
- Khóa RSA, issuer và audience riêng; access token 10 phút/refresh tối đa 7 ngày theo chính sách hiện có. Không lấy khóa thử nghiệm; không xuất khóa vào frontend.
- Origin allowlist đúng origin chính thức; giữ CSRF, Secure, HttpOnly, SameSite và kiểm tra ownership/role. Giữ chính sách expectedVersion tương thích hiện hành; bật strict mode cần kiểm chứng và duyệt riêng.
- JDK 25.0.4/Maven 3.9.16 dùng trong từng tiến trình, không đổi Java toàn hệ thống. Source hiện tại có thể build bằng bộ công cụ A2.4 đã dùng.
- Static server/reverse proxy Windows phục vụ frontend production build, `/api` về backend, cookie path đúng, không tự retry request ghi, actuator không public. Chọn công cụ và cấu hình riêng sau duyệt; không coi Vite dev/preview là phương án vận hành lâu dài.
- Chạy thủ công, kiểm tra readiness trước. Windows service/task, tự khởi động, firewall, truy cập LAN/Internet là bước riêng cần duyệt; lượt này chỉ đề xuất chạy trên máy cá nhân.

Giữ nguyên A2.4: UI4176, backend18083, management19093, HTTPS test18446, MySQL3307. Không tái sử dụng các cổng này; cũng tránh phiên A2.1 cũ localhost4173/backend18080/management19090.

## 8. Sao lưu và rollback trước thay đổi

Chưa chạy backup vì lượt này chỉ SELECT/SHOW và không đủ thông tin đích. Sau phê duyệt:

1. Chốt database, phạm vi, người thao tác, thời gian bảo trì, RPO/RTO và thời hạn lưu backup. Xác minh writer khác; nếu cần tạm ngừng ghi phải thông báo và được duyệt, không tự dừng MySQL80/A2.4.
2. Tạo backup nhất quán bằng công cụ MySQL tương thích, option file bảo vệ, không mật khẩu trên command line. Với toàn bộ InnoDB, xem xét single-transaction cùng routines/triggers/events, hex-blob, no-tablespaces và GTID phù hợp. Nếu có bảng non-transactional, phải điều chỉnh kế hoạch snapshot trước.
3. Lưu dump, schema trước thay đổi, artifact/hash/config phiên bản và thông tin khôi phục ngoài Git; private key/credentials bảo vệ riêng. Kiểm tra mã thoát, kích thước và SHA-256; không chỉ có tên file backup.
4. Restore vào đích độc lập mới được duyệt, tuyệt đối không đè schema A2.1–A2.4. Đối chiếu số dòng, PK/FK, checksum phù hợp và dữ liệu tiền; diễn tập migration và JPA validate trên clone này trước khi áp dụng main.
5. Nếu migration lỗi: ngừng rollout, giữ bằng chứng và xác định phần DDL đã commit; không DROP/ALTER tùy tiện rồi chạy lại. Khi chưa có ghi mới, có thể phục hồi snapshot theo phương án đã diễn tập và duyệt.
6. Rollback ứng dụng ưu tiên cặp JAR/frontend đã xác nhận tương thích với schema mở rộng; không lấy build A2.1 cũ làm rollback mặc định. Giữ cột mở rộng nếu an toàn hơn downgrade phá hủy.
7. Sau khi có giao dịch mới, restore toàn bộ backup sẽ mất các ghi sau snapshot. Cần kế hoạch binlog/PITR hoặc đối soát delta và phê duyệt xử lý trước; không tự phục hồi đè main. Khả năng binlog/PITR hiện chưa xác minh.

## 9. Kiểm thử ba chức năng Excel trên bản chính thức

Kiểm thử đầy đủ trước trên clone đã restore/migrate. Không chạy test suite có fixture writer trỏ vào database chính. Không tạo tên độc hại hoặc số lượng lớn bản ghi trên main để đạt ca thử.

### Nhà hàng — ADMIN

- UI `/admin/restaurants`; API backend `GET /admin-management/restaurants/export.xlsx`.
- File `DanhSachNhaHang.xlsx`, 9 cột đúng A2.1; dữ liệu đọc thật từ schema chính sau khi được phép vận hành.
- So sánh IDs, tên, email công khai trong DTO, trạng thái và bộ lọc với SELECT tương ứng; không xuất hash/password/token.

### Menu — RESTAURANT của chính hồ sơ

- UI `/restaurant/menu`; API `GET /restaurant-management/menu/export.xlsx`.
- File `DanhSachMonAn.xlsx`, 7 cột đúng A2.2; kiểm tra catalog, giá numeric/VND, trạng thái bán và ownership.
- Account RESTAURANT khác không được xuất menu quản trị thay chủ sở hữu; chưa đăng nhập/sai role nhận phản hồi đúng chính sách.

### Đơn hàng — RESTAURANT hoặc ADMIN

- UI `/restaurant/orders` và `/admin/orders`; API tương ứng `GET /restaurant-management/orders/export.xlsx` và `GET /admin-management/orders/export.xlsx`.
- File `DanhSachDonHang.xlsx`, 11 cột đúng A2.3; một dòng mỗi đơn, không nhân tổng do join detail; đối chiếu ba cột tiền, trạng thái và ngày với MySQL.
- RESTAURANT chỉ thấy đơn của mình; ADMIN theo bộ lọc quản trị. Không xuất địa chỉ/phone/email khách ngoài DTO export đã duyệt.

### Điều kiện chung

- Xuất toàn bộ theo bộ lọc/sort trên UI, không chỉ trang đang xem; kiểm tra từ trang2 nếu dữ liệu thật đủ. Không đủ dữ liệu nhiều trang trên main thì ghi rõ giới hạn, dùng clone để chứng minh ca nhiều trang.
- Kiểm tra danh sách rỗng bằng bộ lọc hợp lệ, tiếng Việt, tên file/MIME, header, precision ID dạng text, ngày dd/MM/yyyy HH:mm:ss theo hành vi hiện có; không tự đổi timezone dữ liệu.
- Kiểm tra formula injection trên clone, ô dữ liệu được xử lý như text an toàn; không chèn fixture tấn công vào main.
- Mở file chỉ đọc bằng Microsoft Excel; so dữ liệu với SELECT cùng bộ lọc. Nếu dữ liệu thay đổi đồng thời giữa export và truy vấn đối chiếu, ghi nhận thời điểm hoặc dùng cửa sổ kiểm chứng đã thống nhất.
- Auth login/refresh tạo hoặc cập nhật session/token dù API export chỉ đọc: cần phê duyệt chạy ứng dụng và ghi auth trước khi smoke test main. Không thể gọi đây là kiểm tra main hoàn toàn chỉ SELECT/SHOW.
- Kiểm thử tạo nhà hàng/menu/checkout trên main là thao tác ghi nghiệp vụ riêng, cần duyệt dữ liệu và phạm vi trước. Không tự xóa đơn hay sửa lịch sử sau kiểm thử.

Kết quả A2.4 trong `A2-4-result.md` là bằng chứng môi trường test: 213 JUnit PASS/5 SKIPPED, 340 frontend test PASS, 36 lượt export trên ba browser và kiểm tra Excel. Không chạy lại trong lượt này và không chuyển các con số đó thành kết quả PASS trên main.

## 10. Thứ tự phê duyệt và thực hiện tiếp theo

1. **Sửa thông tin kết nối chỉ đọc:** người dùng kiểm tra thông tin trong tệp `.cnf` cục bộ và báo “Đã cập nhật”, hoặc gửi đường dẫn khác. Tiếp tục SELECT/SHOW đã được cho phép, bổ sung kết quả thực tế main/schema/ADMIN/diff vào báo cáo này.
2. **Chốt đích và kế hoạch bảo vệ:** duyệt schema chính, backup, đích restore độc lập, phạm vi đọc dữ liệu thật vào clone, tiêu chí rollback và lịch thao tác. Nếu preflight lỗi thì dừng nhánh migration để đề xuất xử lý riêng.
3. **Duyệt migration cụ thể:** chỉ sau schema diff; trình DDL/backfill và điều kiện dừng, diễn tập thành công trước. Không áp dụng tự động vào main.
4. **Duyệt cấu hình runtime:** hostname/cổng, certificate/trust, reverse proxy Windows, folder/ACL, khóa riêng và tài khoản app. Nếu thiếu ADMIN, xin duyệt bootstrap/khôi phục riêng; không mặc định tạo mới.
5. **Duyệt khởi chạy và smoke test:** bộ artifact đã cố định, JPA validate, login/logout và ba export; chỉ cho phép ghi auth hoặc nghiệp vụ trong phạm vi đã thống nhất. Giữ A2.4 hoạt động song song.
6. Sau nghiệm thu mới bàn việc khởi động tự động hoặc mở truy cập mạng. Không commit/push/deploy trong phạm vi hiện tại.

## 11. Dấu vết và xác nhận phạm vi

Bằng chứng không chứa credentials tại `F:/New folder/hanoifood-readonly-audit-20261112/planning-evidence.json`; helper chỉ đọc tại cùng thư mục. Chưa có kết quả schema main từ helper vì lỗi xác thực 1045.

Lượt này chỉ thêm báo cáo và công cụ/bằng chứng kiểm tra ngoài repo; không sửa application source, cấu hình đang chạy, database, tài khoản, mật khẩu hoặc quyền. Không kết nối ghi vào 3306; không sao chép dữ liệu test sang main; không chạy migration/build/deploy, không dừng backend/frontend/MySQL. MySQL80 vẫn Running và demo4176 vẫn trả HTTP200 tại lần kiểm tra cuối.

**Đã sẵn sàng:** source tích hợp, reference schema/test, phạm vi cấu hình và phương án tách runtime/backup/kiểm thử. **Còn thiếu:** kết nối đọc MySQL80, xác nhận đích/ADMIN/schema diff, migration đã duyệt và diễn tập, backup phục hồi được, cấu hình HTTPS/runtime chính thức. Chưa đủ điều kiện chuyển môi trường.
