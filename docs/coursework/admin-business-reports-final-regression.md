# Final regression acceptance — ADMIN business reports

Ngày 13/11/2026, khoảng 14:31–14:45, UTC+7 (Asia/Saigon).

**PASS — READY FOR COMMIT REVIEW**, trong phạm vi hai báo cáo ADMIN và môi trường test dưới đây. Không phải kết luận production-ready cho toàn hệ thống. Không commit/push/merge/rebase/deploy; không sửa source, test source, dependency hoặc cấu hình dự án.

## 1. Git và tài liệu đầu vào

Đã đối chiếu data-audit, result, final-acceptance và p1-fix-result. Giữ các báo cáo đó nguyên vẹn làm bằng chứng lịch sử; không đổi nhãn kết quả cũ thành kết quả mới.

- Repository: `F:/New folder/food-delivery`.
- Branch: `feature/admin-business-reports`.
- HEAD và baseline: `d0556eeb81922b52be23bea754affaf8ae59418b`, không đổi.
- Snapshot đầu lượt: 514 file tracked/untracked hiện có, SHA-256 từng file, tại `before.json` trong thư mục bằng chứng.
- Working tree chứa các thay đổi chức năng và bản sửa P1 đã có trước lượt này. Chúng được giữ nguyên, không phải thay đổi mới của lượt nghiệm thu.
- File `how -s --format=fuller 0315de8` giữ nguyên byte, không stage, xóa hoặc di chuyển. Staging rỗng.
- File duy nhất được tạo trong repository ở lượt này là tài liệu này. Build, cache, harness, log, ảnh và workbook đều ngoài repository.

## 2. Môi trường thực tế và guard

Vùng bằng chứng mới, ký hiệu **E** trong tài liệu:

`F:/New folder/fooddelivery-admin-reports-20261113/final-regression-20261113/`

MySQL 8.0.46, TCP `127.0.0.1:3307`, database có sẵn `fooddelivery_admin_reports`. UUID `a87623fb-db83-11f1-83cc-40c2ba627c1b`; datadir `F:/New folder/food-delivery-mysql-test/data/`. Cổng test ban đầu đóng; đã khởi động đúng binary với `--no-defaults`, datadir/port/bind riêng và log/PID mới tại E. Đối chiếu PID listener, command line và quan hệ parent/child trước khi ghi và trước khi dừng. Không sửa hoặc restart dịch vụ MySQL80.

Tài khoản ứng dụng test: `fooddelivery_reports_app@127.0.0.1`, chỉ SELECT/INSERT/UPDATE/DELETE trên database này, ngoài quyền USAGE. Đã kiểm tra SHOW GRANTS. Credential và khóa test có sẵn được đọc từ vùng secrets ngoài Git; không tạo/thay credential hoặc RSA. Không dùng credential Main.

Schema trước/sau khớp `database/schema-reference.json`: 16 bảng, 16 PK, 21 FK, 13 UNIQUE, 6 CHECK, 45 index theo signature. `deliveries.delivery_status` thực tế cho phép NULL. Không tạo database, DDL, migration, seed lại hoặc xóa dữ liệu cũ.

Backend mới build từ source hiện tại, JDK 25.0.4/Maven 3.9.16 offline. Bind `127.0.0.1:18084`, management `127.0.0.1:19094`; datasource cố định `jdbc:mysql://127.0.0.1:3307/fooddelivery_admin_reports?sslMode=REQUIRED`, Hibernate `validate`, SQL init `never`, ADMIN bootstrap `false`. Xóa biến môi trường có thể gây fallback trước khi chạy. Khởi động/JPA validate thành công.

Frontend production build mới dùng `/api`, gateway HTTPS test bind `127.0.0.1:18447`, chỉ proxy tới backend test. Dùng chứng chỉ/khóa test có sẵn, không cài trust hoặc mở firewall. Chromium chỉ bỏ qua lỗi chứng chỉ cho context test. Main không được khởi chạy.

## 3. Fixture mới và bảo toàn lịch sử

Trước ghi, fingerprint toàn bộ dòng hiện có của 16 bảng theo PK và SHA-256 server-side của các cột; không lưu giá trị password/hash/token vào bằng chứng. Chụp schema signature riêng.

Chỉ INSERT trong một transaction: 8 hồ sơ tài xế fixture và 18 Order + 18 Payment + 18 Delivery, ID bắt đầu 10010, trong các ngày 01–06/09/2026. Dùng Customer/Restaurant/COD fixture cũ làm FK; không sửa các dòng cha. Không tạo Account mới. Một tên fixture chứa chuỗi `=HYPERLINK(...)` để kiểm chứng inline text, không tạo công thức Excel.

Không chạy nguyên công cụ SQL cũ vì nó có UPDATE probe trên dữ liệu lịch sử. Harness mới ngoài repository loại bỏ các probe đó; chỉ đọc fixture cũ và fixture append mới.

Sau mọi HTTP/Chromium login, đối chiếu lại: **0 dòng lịch sử bị đổi hoặc mất**, schema signature không đổi. Delta thực tế: drivers +8; orders/payments/deliveries mỗi bảng +18; auth_sessions +19 và refresh_tokens +46 do các lượt đăng nhập/context test mới. Accounts, Customer, Restaurant, COD và các bảng khác không đổi. Những phiên/token cũ không bị cập nhật hoặc thu hồi. Dữ liệu và log được giữ lại, không cleanup bằng DELETE.

## 4. Doanh thu và đơn hàng: SQL → API → Excel

PASS mới trên MySQL thật. Oracle đọc từng bảng orders/payments/deliveries và tính độc lập; không dùng lại aggregate của repository làm oracle tiền.

Kỳ 01–30/11/2026 có 8 đơn, 5 COMPLETED, 1 CANCELLED; 2 đơn đủ điều kiện thanh toán: tổng 240.000, món 200.000, phí 40.000, completion rate 62,50%. PENDING, REFUNDED và SUCCESS thiếu paid_at không bị cộng vào tiền hợp lệ. Đơn hủy không bị cộng. Chi tiết có nhiều OrderDetail trên một Order nhưng không nhân số đơn/tiền.

Đã kiểm nhà hàng 1/2/không có, trạng thái, rỗng, series tổng tiền/ngày, pagination tại DB và sort mặc định, KPI không phụ thuộc trang. Ngày 30/11 có microsecond cuối ngày vẫn được tính; ngày 01/12 bị loại khỏi kỳ tháng 11. Series giữ ngày wall-clock, không lệch UTC. Bộ lọc sai/ngày không hợp lệ/>93 ngày/size51/page âm/status hoặc sort không hợp lệ trả400.

Chromium xác nhận KPI/biểu đồ/bộ lọc, sidebar và Excel thật. Cohort kết hợp 01/09–30/11 có 27 đơn; UI trang đầu20, Excel mới tải đủ27. Không gọi giá trị đơn đã thanh toán là lợi nhuận hoặc tiền đối soát.

## 5. Giao hàng và regression P1

Kỳ tháng 11 giữ đúng kết quả trước sửa: 8 lượt, 7 có tài xế, 5 DELIVERED có tài xế, 1 CANCELLED, success rate71,43%; 4 cặp thời gian hợp lệ, trung bình1200giây. Nhóm driver1:4/4; driver2:3/1 (assigned/delivered). Bộ lọc driver/status, phân trang chi tiết và phân trang nhóm độc lập tại API PASS. Không dựng FAILED hoặc assigned_at; thiếu timestamp không được suy thời lượng.

Ca MySQL mới, mỗi ca đều kiểm SQL đếm độc lập, API, nhóm, Excel 2sheet, ID duy nhất và nhãn NULL:

- A, 01/09: một tài xế, một Delivery NULL; total/assigned1, delivered/cancelled0, rate0%. Export200, không NPE.
- B, 02/09: một tài xế, NULL + DELIVERED; total/assigned2, delivered1, rate50%.
- C, 03/09: hai tài xế; nhóm thứ nhất2NULL, nhóm kia DELIVERED+CANCELLED; total/assigned4, delivered1, rate25%. Nhóm NULL giữ assigned2, hai counter0.
- D, 04/09: không Delivery; total/assigned0, tỷ lệnull, workbook rỗng hợp lệ đủ2sheet.
- E, 05/09: đủ5trạng thái hợp lệ, khôngNULL; total/assigned5, delivered1, cancelled1, rate20%. Không hồi quy fixture trạng thái hợp lệ.
- F, 06/09: 6đơn/3tài xế, gồm2NULL; total/assigned6, delivered1, cancelled1, rate16,67%.
- G được đối chiếu xuyên A/B/C/F: NULL vẫn thuộc tổng/assigned và mẫu số; không cộng vào success, không bị bỏ/trùng dòng. API giữ statusNULL; UI và Excel hiển thị **“Chưa xác định”**.

Các counter nhóm SQL COUNT(CASE...) thực sự được thực thi trên MySQL8.0.46; không dùng kết quả SQLite/RAM để thay thế. Workbook NULL-only tải bằng HTTP và bằng nút UI đều mở được trong Microsoft Excel thật.

## 6. Phân quyền

Bốn endpoint được kiểm bằng HTTP thật:

- GET `/admin-management/reports/orders`
- GET `/admin-management/reports/delivery`
- GET `/admin-management/reports/orders/export.xlsx`
- GET `/admin-management/reports/delivery/export.xlsx`

ADMIN200; CUSTOMER/RESTAURANT/DRIVER403 trên cả JSON và Excel; anonymous401. Không chỉ dựa vào việc ẩn nút. Chromium: anonymous chuyển login; ba role khác bị đưa tới403 cho cả hai trang; ADMIN dùng được sidebar/trang/export. Không sửa quyền hoặc trạng thái Account.

## 7. Chromium mới và responsive

Suite chính65assertion PASS; suite bổ sung21assertion PASS; lượt chụp xác nhận NULL từ đầu trang1assertion PASS, ghi riêng từng kết quả. Không cộng vào29PASS cũ.

Bao phủ login test, trung tâm báo cáo, sidebar thật, hai route, dates/profile/status, KPI, chart, chi tiết, nhóm driver, empty, export, phân trang chi tiết20→7→20 và nhóm độc lập. Các nút nhóm UI phản ánh đúng số nhóm; phép chuyển trang nhóm thực tế được kiểm thêm tại API với size1.

Loading được quan sát bằng trì hoãn phản hồi thật; error/retry bằng503 có chủ đích trong browser interception, sau đó phục hồi backend thật. Không dùng response giả cho số liệu nghiệm thu. Suite chính xác nhận0pageerror và0APIerror bất ngờ; các401khởi tạo phiên và503thử lỗi được phân loại rõ.

Cả hai trang tại375/768/1024/1440px không tràn body. Có8ảnh responsive mới; kiểm thêm overflow auto của bảng, thao tác scroll ngang, filter/export và menu mobile. Có ảnh NULL-only và error. Ảnh `null-only.png` ban đầu có hiệu ứng sticky header do chụp khi đang cuộn; giữ như diagnostic, dùng `null-only-top.png` sau scrollTo(0,0) làm bằng chứng bố cục từ đầu trang. Không sửa CSS để phục vụ chụp ảnh.

## 8. Excel mới và Microsoft Excel

21workbook mới, không ghi đè samples cũ: báo cáo đầy đủ/lọc/rỗng, 6caP1, browser download, hai export cohort27dòng và4legacy export. **21/21 mở được bằng Microsoft Excel12.0**, ẩn/read-only, macro tắt, không formula/hyperlink, SHA-256 trước/sau giữ nguyên.

Với báo cáo mới: TongHop/ChiTiet, metadata kỳ/người lập/người nhận/múi giờ/filter, KPI, freeze8, IDs/chi tiết không mất/trùng. Kiểm tra XML/ZIP/CRC/style độc lập132assertion PASS. Money numeric dùng formatVND, ngày typed date, tỷ lệ numeric fraction với định dạng phần trăm. NULL-only có1chi tiết và đúng nhãn; workbook rỗng có0chi tiết. Hai file `browser-combined-*.xlsx` có27chi tiết dù UI phân trang20.

Payload bắt đầu `=HYPERLINK(...)` đi từ MySQL→API/export thành inlineStr, không có <f>, hyperlink hoặc externalLinks. Không phát hiện các trường/mẫu secret trong workbook kiểm tra. Không xuất password/hash/token. Các workbook đều là dữ liệu test, không sao chép Main.

## 9. Kết quả hồi quy mới

Không gộp các nhóm dưới đây thành một tổng test, không dùng PASS cũ thay cho lượt chạy mới:

- Maven package:248test, **125PASS,0FAIL,0ERROR,123SKIPPED**. Bao gồm5DeliveryReportNullStatusTest; source/test của bản sửa giữ nguyên.
- Frontend: **351PASS**,0FAIL,37file. TypeScript noEmit, ESLint0warning, production build: exit0.
- Python: **80PASS**,0FAIL. Bao gồm5SQL RAM test, được ghi đúng là RAM.
- MySQL/HTTP/Excel suite: **225assertion PASS**,0FAIL ở lượt cuối.
- Chromium: **65PASS**, bổ sung **21PASS**, chụp NULL **1PASS**, tách log.
- Workbook XML/format: **132PASS**; native Excel **21/21PASS**.
- `git diff --check`: PASS.

Harness mới có lỗi ban đầu đã được giữ lại trong evidence: một nhãn Unicode bị mã hóa sai ở shell; chờ HTTP khi React Query dùng cache trang trước; selector aria-label sidebar sai. Chỉ sửa harness ngoài repository, không sửa ứng dụng/test source hoặc làm yếu assertion. Đã chạy lại các suite tương ứng thành công. Không tính các attempt thất bại này là lỗi ứng dụng, không giấu log bằng chứng.

## 10. Phân tích123SKIPPED

Các suite MySQL opt-in cũ tiếp tục tắt, không đổi guard hoặc whitelist datasource:

- AdminManagementMySqlTest13 — RUN_STAGE7_MYSQL_TESTS.
- AuthMigrationMySqlTest4 — RUN_STAGE2_AUTH_SCHEMA_TESTS.
- AuthPersistenceMySqlTest12 — enabled()/RUN_STAGE2_AUTH_SCHEMA_TESTS.
- AuthPreflightMySqlTest1 — RUN_STAGE1_MYSQL_TESTS.
- CheckoutPersistenceMySqlTest14 — enabled()/RUN_A23_MYSQL_TESTS.
- CustomerReadMySqlIntegrationTest9 — RUN_STAGE4_MYSQL_TESTS.
- DriverManagementMySqlTest7 — RUN_STAGE6_MYSQL_TESTS.
- MenuPersistenceMySqlTest8 — enabled()/RUN_A22_MYSQL_TESTS.
- Phase8ConcurrencyMySqlTest11 — RUN_STAGE7_MYSQL_TESTS.
- RestaurantCreationMySqlTest7 — enabled()/RUN_A21_MYSQL_TESTS.
- RestaurantManagementMySqlTest7 — RUN_STAGE4_MYSQL_TESTS.
- SecurityMySqlIntegrationTest17 — enabled()/RUN_STAGE2_AUTH_SCHEMA_TESTS.
- MySqlStage1IntegrationTest13 — enabled()/RUN_STAGE1_MYSQL_TESTS.

Các enabled() còn kiểm target/environment riêng, một số có nhánh A24; không bật để tránh writer cũ hoặc datasource ngoài phạm vi. Không gọi123SKIPPED là PASS hoặc nói chúng được thay thế đầy đủ.

Phần trực tiếp liên quan hai báo cáo được kiểm mới bằng JPAvalidate trên DB thật,225HTTP/SQL/Excelassertion, role checks, Chromium và workbook thực tế. Unit/contract/security đã chạy lại. Các writer checkout, concurrency, migration/backfill, lifecycle của các giai đoạn khác không được chạy lại ở lượt này vì không có thay đổi liên quan và ngoài phạm vi chỉ nghiệm thu báo cáo. Chúng vẫn SKIPPED, không phải khoảng trống bắt buộc của riêng bản sửa NULL/read-only reports.

## 11. Hai P2 giữ nguyên

**P2-01:** counter Excel dùng style2/numFmtId2, có thể hiển thị8.00 thay vì8. Giá trị numeric/count/KPI đúng; không ảnh hưởng quyền hoặc mở file. Tồn tại, chưa sửa. Không chặn luồng demo đã kiểm tra.

**P2-02:** ChiTiet doanh thu chưa có paid_at/payment amount/cờ eligibility. Order9 COMPLETED/SUCCESS nhưng paid_atNULL nên không được cộng KPI; đối chiếu SQL/API/Excel xác nhận tổng240.000 đúng, dù người đọc chỉ nhìn trạng thái chi tiết có thể khó tự giải thích. Không phát hiện lỗi tính tiền/phân quyền hoặc crash. Tồn tại, chưa sửa. Khi demo cần nói rõ tiền chỉ từ tập hợp lệ và số chi tiết bao gồm các trạng thái khác; không trình bày tổng mọi dòng là KPI doanh thu. Đây là hạn chế truy vết tại workbook, không chặn chức năng đã nghiệm thu.

Không nâng hai finding này thành P1 vì các bằng chứng mới không cho thấy sai số nghiệp vụ, lộ quyền hoặc luồng demo không dùng được. Nên xử lý ở lượt cải thiện được phê duyệt riêng.

## 12. An toàn Main và bảo mật

Không kết nối Main để chạy regression; không thực thi DDL/DML trên3306, không dùng Login Path/root Main, không truy cập database hanoi_food hoặc database A2.4. Không thay account, schema, bootstrap ADMIN hoặc chạy website Main. Các đích ghi database đều được pin ở3307/fooddelivery_admin_reports sau guard UUID/datadir/process/grants.

5file backup tại `F:/New folder/fooddelivery-main-backups/20261112-LoginPath-01` khớp SHA-256 anchor lịch sử, đọc kiểm tra bằng hash, không sửa. Không ghi vào vùng secrets/private key, không sinh hoặc thay RSA. Quét pattern private PEM/JWT/GitHub token/AWSkey trong candidate mới/sửa không có finding; kết hợp rà đường dẫn/harness, không đưa nội dung xác thực ra log. Không có account ADMIN mới hoặc thay quyền ADMIN;4Account test cũ byte-equivalent theo fingerprint.

Không tuyên bố Main bất biến tuyệt đối: không có snapshot SQL Main mới của lượt này để loại trừ thay đổi do actor khác; cũng không đọc private key/credentials Main để lập byte snapshot độc lập. Xác nhận không có thao tác ghi Main/backup/secrets trong phạm vi công cụ của lượt này. Kết thúc, MySQL80 vẫn lắng nghe3306; việc này không thay cho kiểm toán dữ liệu Main.

## 13. NOT VERIFIED và giới hạn

Không còn mục NOT VERIFIED bắt buộc cho đường SQL→API→Chromium→Excel của hai báo cáo và lỗi P1 trên môi trường nêu trên.

Ngoài phạm vi/chưa kiểm chứng mới:123MySQLopt-in lịch sử; tải lớn và export>10.000 trên dữ liệu thật; Firefox/WebKit/Office khác; production deployment/HTTPSMain; toàn bộ lifecycle/migration/concurrency của hệ thống; trạng thái SQLMain hiện tại và thay đổi ngoài tác nhân của lượt này. Không dùng kết quả phạm vi nhỏ để bảo đảm các nội dung này.

## 14. Bằng chứng và đối chiếu cuối

Tất cả bên dưới nằm ở E, không chứa plaintext password/hash/token/private key:

- `before.json`, `isolation.json`, `schema-before.json`, `history-before.json`, `history-after.json`, `fixture.json`.
- `mysql-owner.json`, `mysql-before-stop.json`, `owned-processes-before-stop.json`, `backend-test-pid.json`, `cleanup-result.json`.
- `backend.log`, `backend-summary.json`, `backend-exit.json`; `frontend-tests.log`, `frontend-exits.json`, `typescript.log`, `eslint.log`, `frontend-build.log`; `python.log`.
- `http-sql-excel-results.json`, `http-sql-excel-failure.json` (attempt ban đầu), `browser-results.json`, `browser-attempt1.json`, `browser-supplement.json`, `browser-supplement-attempt1.json`, `browser-visual.json`.
- `workbook-deep-results.json`, `native-excel-final.json`, các `.xlsx` mới và `screenshots/` mới.
- `safety.json`, `final-integrity.json`; harness/build/cache/temp riêng để đối chiếu mà không sửa repository.

Checksum source trước/sau, HEAD/branch, staging và file ngoại lệ được đối chiếu ở `final-integrity.json`: mọi514file đầu lượt giữ nguyên; chỉ thêm tài liệu này trong repository. Không commit/push/fetch/merge/rebase hoặc đổi nhánh.

## 15. Cleanup và quyết định bàn giao

Đã dừng backend test, gateway và instance MySQL test do lượt này khởi động, sau kiểm PID/command line (MySQL thêm parent/UUID guard). Cổng3307/18084/19094/18447 đều đóng. MySQL80/3306 vẫn nghe. Giữ database test, fixture append và toàn bộ evidence; không xóa dữ liệu hoặc đụng tiến trình khác.

P0 mới:0; P1 còn tồn tại trong phạm vi nghiệm thu:0; P2 còn2như trên. Lỗi P1NULL đã được kiểm chứng sau sửa bằng MySQL/HTTP/UI/XLSX/native Excel, không chỉRAM.

**Khuyến nghị cho phép bước commit review**, kiểm tra danh sách file trước khi stage và tiếp tục loại file ngoại lệ. Đây không phải phê duyệt tự commit/push hoặc triển khai Main. Dừng sau nghiệm thu này.
