# FINAL ACCEPTANCE AUDIT — ADMIN BUSINESS REPORTS

Ngày13/11/2026, Asia/Saigon. Nhiệm vụ read-only; chỉ tài liệu này được tạo trong repository. Bằng chứng kiểm tra mới nằm trong vùng test đã duyệt: `F:/New folder/fooddelivery-admin-reports-20261113/acceptance-20261113/`.

**CONDITIONAL PASS — FIX REQUIRED. Chưa khuyến nghị commit/push bản hiện tại.** Có1P1 tái hiện độc lập trong RAM: xuất báo cáo giao hàng lỗi khi nhóm tài xế có các trạng thái NULL, trường hợp schema cho phép. Các luồng fixture đã nghiệm thu và kiểm thử hồi quy vẫn có bằng chứng tốt, nhưng không loại trừ lỗi này. Không sửa source/test/config/data để làm kiểm thử đạt.

## 1. Git và phạm vi thay đổi

- Root: F:/New folder/food-delivery.
- Branch: feature/admin-business-reports.
- HEAD chính xác d0556eeb81922b52be23bea754affaf8ae59418b; baseline là ancestor, đồng thời bằng HEAD. Chức năng vẫn nằm trong working tree chưa commit.
- Đã kiểm tra tracked modifications, staged và toàn bộ untracked; không chỉ dùng diff BASE..HEAD. Staging rỗng. Không commit/push/merge/rebase/reset/clean/stash hoặc fetch remote.
- File how -s --format=fuller 0315de8 giữ nguyên SHA, không stage, không xóa/sửa/di chuyển.
- git diff --check PASS mới. Không có file tracked bị xóa hoặc di chuyển. Không sửa .gitignore, pom.xml, SQL baseline/migrations hoặc schema-reference so với baseline.

File sửa sẵn có trước audit:

1. frontend/src/app/router.tsx
2. frontend/src/features/workspace/Workspace.tsx
3. src/main/java/vn/gaugaugau/fooddelivery/config/SecurityConfiguration.java
4. src/test/java/vn/gaugaugau/fooddelivery/auth/MainRuntimeSecurityTest.java

File mới thuộc chức năng trước audit:

- docs/coursework/admin-business-reports-data-audit.md
- docs/coursework/admin-business-reports-result.md
- frontend/src/features/admin-management/BusinessReports.tsx
- frontend/src/features/admin-management/business-report-format.ts
- frontend/src/features/admin-management/business-reports-api.ts
- frontend/src/features/admin-management/business-reports.css
- frontend/src/features/admin-management/business-reports.test.tsx
- src/main/java/vn/gaugaugau/fooddelivery/controller/BusinessReportController.java
- src/main/java/vn/gaugaugau/fooddelivery/repository/BusinessReportRepository.java
- src/main/java/vn/gaugaugau/fooddelivery/service/BusinessReportQuery.java
- src/main/java/vn/gaugaugau/fooddelivery/service/BusinessReportService.java
- src/main/java/vn/gaugaugau/fooddelivery/service/BusinessReportWorkbook.java
- src/test/java/vn/gaugaugau/fooddelivery/service/BusinessReportTest.java
- tools/deployment/ReportFixtureIdentity.java
- tools/deployment/Verify-ReportsExcel.ps1
- tools/deployment/prepare_admin_reports_test.py
- tools/deployment/reports-test-gateway.cjs
- tools/deployment/run_admin_reports_test.py
- tools/deployment/verify_admin_reports.py
- tools/deployment/verify_reports_browser.cjs

Đây là24 thay đổi chức năng (4modified/20new), ngoài file ngoại lệ. Tài liệu audit này là file thứ25 có thể đưa vào commit review sau khi xử lý finding. Các công cụ fixture/setup/launcher có thao tác ghi được thiết kế cho test, không phải API ghi nghiệp vụ mới; không được chạy chúng như thao tác read-only. Không phát hiện phát triển nghiệp vụ ngoài hai báo cáo trong diff.

## 2. Kiểm toán secret và artifact

PASS mới theo phạm vi kiểm tra: rà source/config/DTO/SQL mới, các file dự kiến commit, mẫu private PEM/service token/JWT literal và vị trí artifact. Không phát hiện secret literal mới trong candidate files. Không có .cnf/.env thật/private key/dump/workbook/log test được đề xuất commit; cấu hình ký/datasource vẫn lấy từ ngoài Git. Các email @reports.invalid là fixture rõ ràng; báo cáo chỉ trả tên cần thiết, không email/địa chỉ/điện thoại của khách hoặc token/hash.

Ignored giữ nguyên frontend/dist, frontend/node_modules, frontend/test-results và target. Mẫu Excel, log, source probe tạm, output build đều ở vùng test ngoài repository. Không sửa .gitignore để che finding. File lạ không thuộc candidate. Quét mẫu không phải chứng minh tuyệt đối mọi chuỗi là không bí mật; đã kết hợp rà code và danh sách file.

Finding credential lịch sử SEC-01 đã biết thuộc baseline đã có trên remote; người dùng từng xác nhận thu hồi/đổi. Lượt audit này không rewrite lịch sử, thử credential cũ hoặc chứng minh lại việc thu hồi. Không có commit mới để đẩy. Không đánh đồng trạng thái này với secret mới đang lộ trong chức năng.

## 3. Báo cáo doanh thu và đơn hàng

Rà source PASS: COUNT tổng/COMPLETED/CANCELLED dùng cohort orders.created_at và cùng filter. Giá trị/phí chỉ cộng khi COMPLETED + payments.SUCCESS + paid_at có thật + amount=total_amount=subtotal+shipping_fee. Pending/refunded/cancelled hoặc thiếu/mismatch không cộng. Không join order_details; các JOIN một dòng theo PK/FK và UNIQUE(order_id), tránh nhân tổng tiền. BigDecimal cho tiền, completionRate=completed/total*100, null khi mẫu số0.

Ngày ISO inclusive tối đa93, SQL >=from00:00 và <(to+1)00:00; không bỏ microsecond cuối ngày. Mặc định tháng hiện tại đến hôm nay. Theo giờ business JVM, không suy UTC từ LocalDateTime; series DATE_FORMAT trả chuỗi ngày, chi tiết Timestamp→LocalDateTime trước JSON. Cả series/detail/KPI/Excel dùng cùng điều kiện cohort. Tiền của đơn tạo trong kỳ có paid_at sau kỳ vẫn thuộc cohort đã công bố, không phải cashflow thu trong kỳ.

Sort whitelist newest/oldest theo ID; size1–50, LIMIT/OFFSET ở SQL, kiểm page/range/profileId/status/unknown keys. UI có chú thích đây không phải lợi nhuận hoặc doanh thu thực nhận. Có P2 về khả năng giải thích eligibility ngay trong Excel, xem mục12.

Bằng chứng DB test cũ đã xem:141 assertion PASS, raw orders/payments/deliveries oracle, nhiều nhà hàng,2chi tiết của1đơn, biên30/11 có microsecond và01/12, mismatch/payment thiếu paidAt, hoàn tiền, rỗng/phân trang. Fixture kỳ11:8đơn,5completed,1hủy,2đơn hợp lệ;240.000 tổng/200.000 món/40.000 phí;62,5%. Đây là PASS THEO LOG CŨ, không phải SELECT MySQL mới.

Mẫu hiện tại được kiểm tra đọc mới:8ID duy nhất {1,2,3,4,5,8,9,10}, KPI240.000 và cấu trúc đúng; không có ID6/7 ngoài kỳ. Việc đối chiếu với database hiện tại là NOT VERIFIED vì3307 đang dừng và audit không khởi động/ghi môi trường.

## 4. Báo cáo giao hàng

Rà source PASS với trạng thái hợp lệ: count chuyến là Delivery chứ không số món; assigned=driver_id hiện tại có giá trị; delivered=DELIVERED có tài xế; tỷ lệ delivered/assigned, không phải tỷ lệ mọi đơn hoặc SLA. CANCELLED riêng, không gọi FAILED. Không có lịch sử phân công hoặc assigned_at, không dựng số lần giao hay thời điểm nhận đơn; pickup_time đúng nghĩa lấy món. AVG chỉ DELIVERED có tài xế và cặp timestamp hợp lệ, kết thúc>=bắt đầu; thiếu dữ liệu trả null.

Nhóm theo driver_id/name hiện lưu, không giả định nhiều lần phân công. Chi tiết và nhóm phân trang độc lập; cùng filter theo cohort ngày tạo đơn và driver/status. GROUP BY trả một nhóm/tài xế; không N+1. Export lấy đủ nhóm trong giới hạn cohort tối đa10.000 dòng.

Log cũ:7chuyến có tài xế,5giao thành công,1hủy,71,43%,4cặp thời gian hợp lệ trung bình1200giây; có probe duration âm được phục hồi. Mẫu hiện tại mở được,8chi tiết duy nhất và có nhóm tài xế. **Không đạt toàn bộ** vì NULL status làm bộ đếm nhóm thành NULL và writer lỗi; tìm thấy mới trong audit, không được che bởi các con số cũ.

## 5. API, phân quyền và truy vấn

Bốn endpoint GET thực tế:

- /admin-management/reports/orders
- /admin-management/reports/delivery
- /admin-management/reports/orders/export.xlsx
- /admin-management/reports/delivery/export.xlsx

Tiền tố /api thuộc gateway. GET /admin-management/reports/** yêu cầu ADMIN trong SecurityConfiguration; controller/service có @PreAuthorize ADMIN. Không thêm POST/PUT/DELETE cho nghiệp vụ báo cáo. Giá trị WHERE bind JDBC, identifier/sort từ whitelist; không tìm thấy SQL injection qua các trường đã rà. Projection SQL không traversal lazy từng entity. Aggregate ở database, series tối đa93ngày, trang tối đa50, export chặn >10.000 trước stream, dùng forward-only cho chi tiết; nhóm export có giới hạn tương ứng.

PASS MỚI: MainRuntimeSecurityTest13test với filter chain/controller/RS256 và repository trong RAM, bao gồm4endpoint×4role và anonymous. ADMIN200, ba role khác403, anonymous401. Đây không phải MySQL/HTTP server mới. Bằng chứng real HTTP/legacy4export được xem từ log cũ, chưa chạy lại vì script có login ghi auth_sessions/refresh_tokens và UPDATE probe; chạy nguyên script sẽ không đáp ứng audit read-only.

Không phát hiện API cũ bị thay mapping hoặc writer lifecycle bị sửa trong diff. Hồi quy unit/contract và4export cũ có log cũ PASS. Không kết luận mọi API cũ đã chạy lại trên MySQL.

## 6. Frontend và responsive

Routes và sidebar đúng layout ADMIN hiện có; /admin/reports là trung tâm, hai trang con có role guard. Query key theo account/kind/filter, KPI/table/chart cùng response; pagination nhóm tài xế độc lập. Có skeleton, empty/error/retry, refresh, xuất theo filter hiệu lực; loại page/size/driverPage khi export. Có abort khi đổi filter/unmount và kiểm account/role/generation trước download. Định dạng ngày chỉ áp dụng field thời gian, giữ nguyên tên người dùng.

PASS MỚI:350unit/component,37file; TypeScript noEmit, ESLint toàn frontend0warning và production build exit0. Trong đó10test reports bao phủ render2trang, KPI/chart/empty, thiếu metric thật, filter/ngày đảo, lỗi/loading, contract/query export và wall-clock. Không sửa test để có PASS.

PASS THEO LOG CŨ: Chromium29assertion,2trang, unauthorized routes, download/empty/giá trị và375/768/1024/1440px;8ảnh thật đã có. Chưa chạy browser mới vào backend trong audit, không dùng ảnh cũ làm bằng chứng hành vi mới. Responsive hiện tại/browser interaction/pagination thực tế là NOT VERIFIED MỚI ngoài unit/source review. Chưa nghiệm thu Firefox/Safari.

## 7. Excel đọc độc lập

Hai mẫu tồn tại đúng tên trong samples; bản byte khớp browser download cũ. Kiểm tra mới ZIP CRC, XML, sheet names TongHop/ChiTiet,8chi tiết/8IDduy nhất, metadata/kỳ/người lập/nhận/KPI, freeze8, không <f> hoặc literal secret theo mẫu, KPI tiền/typed numeric/date/percentage và dữ liệu fixture. Không tái tạo dữ liệu giả để thay mẫu thiếu.

Microsoft Excel12.0 mở lại **2/2 mẫu PASS MỚI**, hidden/read-only, macro tắt, không formula/hyperlink; SHA trước/sau giữ nguyên. Kết quả8/8 thuộc lượt triển khai cũ, đã xem log và không đổi nhãn thành kết quả mới. Không chạy script native cũ vì script đó ghi đè evidence cũ.

Formula injection: inlineStr + XML escaping, không có công thức/đường dẫn ngoài trong package tạo bởi source; unit mới chạy lại có chuỗi HYPERLINK dạng literal và tiếng Việt. Các mẫu hiện tại không chứa PII Main theo phạm vi fixture/công cụ tạo; không có đối chiếu trực tiếp dữ liệu Main để chứng minh nguồn gốc tuyệt đối.

Happy-path mẫu PASS không chứng minh toàn bộ exporter PASS: RAM probe mới tìm thấy P1 ở nhóm NULL. Hiển thị số đếm và giải thích eligibility còn P2.

## 8. Kết quả kiểm thử mới và cũ

| Chức năng | Unit mới | Integration | UI | Excel | Kết luận |
|---|---|---|---|---|---|
| Doanh thu | PASS rate/filter/writer; bộ243test120PASS | SQL/HTTP141assertion PASS theo log cũ; MySQL hiện tại NOT VERIFIED | Unit mới PASS; Chromium cũ PASS, browser mới NOT VERIFIED | Hai mẫu đọc mới PASS, số tiền/ID khớp snapshot fixture cũ | Chưa có lỗi tính tiền được tái hiện; còn giới hạn bằng chứng mới |
| Giao hàng | Standard tests PASS nhưng probe mới FAIL với NULL group | SQL/HTTP cũ PASS trên fixture không có NULL group; current DB NOT VERIFIED | Unit mới PASS; browser cũ PASS | Mẫu hợp lệ đọc mới PASS, exporter NULL group FAIL mới | P1 — FIX REQUIRED |
| Phân quyền | Filter/MVC/RS256 matrix mới PASS cho cả4endpoint | RAM integration mới PASS; real HTTP cũ PASS, không chạy server mới | Route source/unit mới PASS; browser cũ PASS | Filter Excel mới PASS trong MockMvc; mẫu không secret theo kiểm tra mới | Không phát hiện lỗi quyền; không tuyên bố DB auth runtime mới PASS |

Build backend mới:243tests=120PASS/123SKIPPED/0FAIL/0ERROR, package PASS. Probe ngoài repo không nằm trong243test: một ca tái hiện lỗi và một ca đối chứng PASS. Vì vậy câu “0JUnitFAIL” không phủ nhận P1.

Frontend mới350PASS, TypeScript/ESLint/build PASS. Python regression mới75PASS, chỉ unit/safety không kết nối DB. XML/native workbook kiểm tra mới như mục7.141SQL/API/Excel,29Chromium và8/8Excel là số liệu cũ đã xác minh evidence, không cộng như test mới.

## 9. Phân tích123 SKIPPED

| Suite | Số bỏ qua | Điều kiện không bật |
|---|---:|---|
| AdminManagementMySqlTest | 13 | RUN_STAGE7_MYSQL_TESTS |
| AuthMigrationMySqlTest | 4 | RUN_STAGE2_AUTH_SCHEMA_TESTS |
| AuthPersistenceMySqlTest | 12 | enabled() / RUN_STAGE2_AUTH_SCHEMA_TESTS |
| AuthPreflightMySqlTest | 1 | RUN_STAGE1_MYSQL_TESTS |
| CheckoutPersistenceMySqlTest | 14 | enabled() / RUN_A23_MYSQL_TESTS |
| CustomerReadMySqlIntegrationTest | 9 | RUN_STAGE4_MYSQL_TESTS |
| DriverManagementMySqlTest | 7 | RUN_STAGE6_MYSQL_TESTS |
| MenuPersistenceMySqlTest | 8 | enabled() / RUN_A22_MYSQL_TESTS |
| Phase8ConcurrencyMySqlTest | 11 | RUN_STAGE7_MYSQL_TESTS |
| RestaurantCreationMySqlTest | 7 | enabled() / RUN_A21_MYSQL_TESTS |
| RestaurantManagementMySqlTest | 7 | RUN_STAGE4_MYSQL_TESTS |
| SecurityMySqlIntegrationTest | 17 | enabled() / RUN_STAGE2_AUTH_SCHEMA_TESTS |
| MySqlStage1IntegrationTest | 13 | enabled() / RUN_STAGE1_MYSQL_TESTS |

Tổng123, không phải123test thất bại hoặc123test báo cáo mới. XML skip messages khớp annotation/guard source; enabled() còn có nhánh RUN_A24_MYSQL_TESTS và target whitelist. Không bật nhánh đó để ép suite ghi vào schema khác, không vô hiệu hóa guard. Các suite có persist/login/checkout/DDL/probe, không phù hợp nhiệm vụ read-only.

16suite thực chạy: AuthModelTest8, DatabaseMigrationResourceTest1, LoginLimiterTest2, MainRuntimeSecurityTest13, FooddeliveryApplicationTests3, FullAuditDriverDateTest3, FullAuditTargetGuardTest3, Phase8FoundationTest5, Phase8MvcContractTest4, Phase8RestaurantDateTest3, BackendServiceTest37, BusinessReportTest11, ReadQueryTest6, RestaurantWorkbookTest8, TransactionIntegrationTest1, ApiBindingUnitTest12. Tổng120. Tên TransactionIntegrationTest không đồng nghĩa transaction MySQL: không dùng kết quả đó để đóng gate MySQL.

## 10. Bảo vệ Main và giới hạn xác minh

PASS theo hành động/snapshot trong audit: không mở database connection, không chạy server/Main/bootstrap/DDL/seed/auth HTTP writer, không commit/push/deploy; source giữ nguyên fingerprint trước/sau ngoài tài liệu được phép. Cổng3307/18084/19094/18447 đóng lúc kiểm tra; không tự restart instance để chạy script ghi. Không sửa schema-reference/baseline hoặc bỏ guard.

PASS MỚI bằng so SHA: cả5file backup Main tại fooddelivery-main-backups/20261112-LoginPath-01 khớp snapshot backup-preservation-before.json đã lưu trước đây. Không thay backup.

**NOT VERIFIED tuyệt đối:** trạng thái schema/data/ADMIN Main hiện tại trên MySQL80; thay đổi do actor khác trong quá khứ; RSA private key và credential Main so với byte snapshot lịch sử vì không có hash anchor được dùng cho đối chiếu này; toàn bộ dữ liệu các schema test cũ. Không kết nối Main với quyền ghi hoặc đọc secret ra báo cáo để thay trạng thái này bằng PASS. Không có thao tác của audit nhắm ghi những vị trí đó; assertion JSON tự báo từ lượt triển khai không đủ chứng minh toàn bộ lịch sử.

## 11. Bằng chứng mới

- source-before.json, git-before.txt:510path tracked/untracked được fingerprint trước audit.
- backend.log, build/target/surefire-reports, backend-new-summary.json: kết quả mới và suite thực chạy.
- previous-suites.json: lý do skip từ XML cũ; được đối chiếu với lần chạy mới/source.
- frontend-tests.log, frontend-exits.json, typecheck.log, eslint.log, frontend-build.log: mới, output/cache đặt trong vùng audit.
- python-new.log:75unit/safety mới.
- probe/AcceptanceProbe.java và nullable-group-probe.json: reproducer RAM và control; artifact được đối chiếu source Java hiện tại trước dùng.
- workbook-readonly-audit.json, native-excel-new.json: hai mẫu đọc mới, CRC/XML/SHA và native Excel.
- previous-evidence-index.json: phân biệt141/29/setup/cleanup cũ.
- backup-readonly-check.json, ports-new.json: hash backup mới và cổng đóng.
- secret-scan.json và kiểm tra Git cuối: không in giá trị secret.

Tất cả đường dẫn trên thuộc acceptance-20261113 trong vùng test, không phải file cần commit. Probe tạo dữ liệu chỉ trong RAM, không tạo/chỉnh fixture DB.

## 12. Phát hiệnP0/P1/P2

**P0:0 phát hiện trong phạm vi kiểm tra**, không phải khẳng định đã chứng minh tuyệt đối toàn bộ lịch sử Main/secrets.

**P1-01 — Export giao hàng lỗi với nhóm trạng thái NULL.**

- Vị trí: BusinessReportRepository.java:27 và:30 (SUM hai predicate không COALESCE); BusinessReportWorkbook.java:33 (gọi rate cho nhóm); BusinessReportService.java:21 (numerator.toString()); baseline001:139 cho phép delivery_status NULL.
- Điều kiện: một driver_id có giá trị, các chuyến thuộc cohort/filter của tài xế đó đều delivery_status=NULL. SUM(status='DELIVERED') và SUM(status='CANCELLED') đều NULL. Summary tổng có COALESCE nhưng truy vấn nhóm không có.
- Tái hiện mới, không DB: truyền nhóm tương ứng vào BusinessReportWorkbook thực tế từ artifact khớp source. Kết quả NullPointerException sau khi đã ghi54byte ra output; ca control counters=0 hoàn tất4179byte. Bằng chứng nullable-group-probe.json. Chưa xác minh có row như vậy trong DB hiện tại, nhưng DDL cho phép điều kiện này.
- Ảnh hưởng: /delivery/export.xlsx có thể lỗi, không hoàn thành XLSX khi dữ liệu lịch sử/thiếu trạng thái xuất hiện. UI nhóm cũng nhận counter null thay vì count0.11unit báo cáo và141assertion cũ không bao phủ ca này.
- Đề xuất sau phê duyệt: chuẩn hóa count nhóm về0 bằng COUNT(CASE...) hoặc COALESCE ở cả drivers/exportDrivers; định nghĩa/null handling nhất quán với summary, thêm regression toàn nhómNULL, nhómtrộnNULL/hợp lệ, API/Excel và ca rỗng. Không cần đổi schema, enum hay dữ liệu. Không tự sửa trong audit.

**P2-01 — Số đếm Excel hiển thị thập phân.** Writer style2 dùng numFmtId2 cho count, vì vậy số nguyên có định dạng0.00; không sai giá trị nhưng kém rõ ràng cho số đơn/chuyến. Đề xuất style integer riêng, giữ style tiền/rate/duration phù hợp.

**P2-02 — Chi tiết doanh thu chưa giải thích eligibility tại dòng.** Mẫu có Order9 hiển thị COMPLETED/đã thanh toán nhưng bị loại KPI vì thiếu paid_at theo fixture/log; ChiTiet không có paidAt/payment amount/cờ hợp lệ. Không phát hiện KPI cộng sai, nhưng người nhận khó tự đối chiếu240.000 từ chi tiết khi có dữ liệu bất nhất. Đề xuất bổ sung ghi chú công thức đầy đủ và cờ/lý do hợp lệ (hoặc các trường tối thiểu), không xuất secret/PII thừa. Chưa sửa.

## 13. NOT VERIFIED và điều kiện nghiệm thu lại

Không có kiểm tra mới trên MySQL hiện đang dừng, actual SQL NULL aggregate/HTTP export ở dữ liệu NULL chưa được chạy, không có browser mới375–1440 vào backend, không đo tải/quy mô lớn/EXPLAIN hoặc snapshot giữa hai request khi có writer đồng thời. Các happy-path cũ có log thật nhưng không thay thế các mục này. Chưa kiểm mọi phiên bản Excel/browser/OS.

Sau khi được duyệt sửa P1 và được phép dùng test writer có giới hạn: thêm fixture NULL chỉ trong schema mới được duyệt, kiểm tra trực tiếp SQL→API→UI→Excel, mở workbook kết quả, rồi chạy lại hồi quy và auditdiff/secret. Không ép123test cũ chạy trên reports DB hoặc Main. Các P2 có thể tách quyết định, nhưng không dùng chúng để bỏ qua P1.

## 14. Kết luận và khuyến nghị

**CONDITIONAL PASS — FIX REQUIRED.** Những phần đã kiểm chứng mới: Git/scope, kiểm thử hồi quy120backend/350frontend/75Python, build/lint, đọc hai mẫu Excel và hash5backup. Bằng chứng cũ xác nhận một số luồng MySQL/UI hợp lệ. Tuy nhiên còn1P1 thực sự tái hiện và thiếu xác minh mới ở phạm vi DB/browser; không đủ điều kiện PASS — READY FOR COMMIT REVIEW.

Khuyến nghị **chưa cho phép commit/push bản hiện tại như bản đã nghiệm thu hoàn chỉnh**. Cần phê duyệt bước sửa P1 và nghiệm thu lại, giữ nguyên Main/keys/backup. Không tự động sửa finding. Dừng sau bàn giao báo cáo này; không commit/push/merge/rebase/deploy.
