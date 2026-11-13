# Hai báo cáo nghiệp vụ ADMIN — kết quả nghiệm thu

Ngày13/11/2026, Asia/Saigon. **PASS trong môi trường test độc lập được duyệt.** Không phải nghiệm thu production hoặc kiểm thử tải quy mô lớn.

## 1. Git và phạm vi

Branch feature/admin-business-reports, nền d0556eeb81922b52be23bea754affaf8ae59418b. Trước tạo nhánh không có thay đổi tracked; chỉ file untracked how -s --format=fuller 0315de8 được miễn trừ riêng. File giữ nguyên SHA, không stage/commit. Không reset/clean/stash, không fetch/pull/merge/rebase trong lượt này. Không commit/push/deploy.

Phát triển trực tiếp source chính, không tạo dự án thứ hai. Thư mục build/log bên ngoài chỉ phục vụ kiểm thử. Main fooddelivery:3306, hanoi_food, backup, RSA/secrets Main và dữ liệu test cũ không là đích ghi. Không bootstrap ADMIN Main hoặc chạy website Main. ADMIN mới chỉ là fixture trong schema test mới, không dùng AdminBootstrap.

## 2. Mục tiêu và người dùng

Báo cáo doanh thu và đơn hàng: người lập Quản trị viên hệ thống (ADMIN), người nhận Ban điều hành / Quản lý kinh doanh; theo dõi cohort đơn tạo trong kỳ, trạng thái và giá trị hoàn thành có thanh toán hợp lệ.

Báo cáo hiệu suất giao hàng: người lập Quản trị viên phụ trách vận hành (ADMIN), người nhận Trưởng bộ phận vận hành; theo dõi trạng thái hiện tại của các chuyến thuộc cohort đơn trong kỳ và nhóm tài xế hiện được lưu.

Các định nghĩa, enum và khả năng dữ liệu được ghi trước lập trình trong [kiểm toán dữ liệu](admin-business-reports-data-audit.md).

## 3. Bảng, quan hệ và truy vấn

Nguồn orders, payments, deliveries, customers, restaurants, drivers. orders.created_at là mốc kỳ cho cả hai báo cáo; mặc định tháng hiện tại đến hôm nay, from/to ISO inclusive tối đa93 ngày. SQL sử dụng >=from00:00 và <(to+1)00:00, giữ microsecond. API trả timezone JVM business; test dùng Asia/Ho_Chi_Minh. Không biến timestamp business không offset thành UTC hoặc trộn clockUTC của auth_sessions.

Projection JDBC, aggregate trong MySQL, phân trang LIMIT/OFFSET tại DB. Payment và Delivery UNIQUE(order_id), không join order_details, không N+1 hoặc SUM bị nhân theo món. Tiền BigDecimal; tỷ lệ làm tròn2 chữ số; mẫu số0 trả null. Một bundle/Excel sử dụng transaction read-only REPEATABLE_READ cho snapshot thống nhất. Browser refresh là lần đọc snapshot mới; hai yêu cầu khác thời điểm có thể khác khi có writer thật.

WHERE giá trị bind parameter; enum, sort, profileId, page/size/driverPage kiểm tra whitelist/range. size1–50, page không âm và có giới hạn, sort=newest/oldest theo ID ổn định. Không thêm index/constraint/migration hoặc dependency.

## 4. KPI

Đơn: COUNT tổng, COUNT COMPLETED, COUNT CANCELLED, tỷ lệ completed/total*100. Giá trị hoàn thành đã thanh toán = SUM orders.total_amount, phí = SUM shipping_fee, tạm tính = SUM subtotal trên cùng cohort và cùng tập COMPLETED + PaymentSUCCESS + paidAt có thật + payment.amount=order.total_amount=subtotal+shipping. Chưa thanh toán, hủy, hoàn tiền, thiếu paidAt hoặc lệch tiền không cộng. Đây không phải lợi nhuận, doanh thu nền tảng hoặc tiền đã đối soát. Tổng chi tiết Excel gồm mọi trạng thái được ghi nhãn riêng, không nhầm với KPI tiền đủ điều kiện.

Giao hàng: tổng dòng chuyến, số có driver_id hiện tại, DELIVERED có tài xế, CANCELLED riêng, tỷ lệ DELIVERED có tài xế / số chuyến có tài xế. Trung bình giây lấy món→giao chỉ DELIVERED có tài xế và cặp pickup_time/delivered_time hợp lệ, kết thúc>=bắt đầu; trả số chuyến có đủ mốc. Nhóm tài xế có count phân công/giao/hủy/tỷ lệ, phân trang riêng; Excel lấy toàn bộ nhóm của bộ lọc.

Không triển khai KPI FAILED vì enum không có FAILED. Không gọi mọi chuyến chưa giao là thất bại. Không có assigned_at/historical assignment nên không tính nhận phân công→giao hoặc số lần phân công; pickup_time được ghi đúng tên lấy món. Không có SLA, payout hoặc lợi nhuận. Không dựng dữ liệu bù.

## 5. API mới và quyền

- GET /admin-management/reports/orders
- GET /admin-management/reports/delivery
- GET /admin-management/reports/orders/export.xlsx
- GET /admin-management/reports/delivery/export.xlsx

Qua gateway frontend có tiền tố /api. API JSON giữ ApiResponse convention; bundle gồm filters/timeZone/generatedAt/summary/series/details/drivers. Controller chỉ điều phối, service định nghĩa KPI/snapshot, repository thực hiện SQL. ADMIN được200, CUSTOMER/RESTAURANT/DRIVER403, anonymous401; cả bốn endpoint có kiểm tra filter chain và method security. Không tin role/userId do client khai báo. Không trả password/hash/token/địa chỉ/điện thoại/email khách trong báo cáo.

Filter: from,to,status,restaurantId cho đơn hoặc driverId cho chuyến; page,size,sort; driverPage cho nhóm tài xế. Sai input400. Export trên10.000 chi tiết trả422, yêu cầu thu hẹp filter; không cắt dữ liệu âm thầm. Chi tiết export forward-only streaming; nhóm tài xế là aggregate SQL có giới hạn tối đa10.000 nhóm, không tải bảng nguồn toàn bộ vào RAM.

## 6. UI

Sidebar ADMIN có Báo cáo→/admin/reports; giữ trang analytics cũ với nhãn Thống kê tổng quan. Trung tâm dẫn đến /admin/reports/orders và /admin/reports/delivery, cùng layout/design system và role guard hiện có.

Có bộ lọc ngày/trạng thái/mã nhà hàng hoặc tài xế/sắp xếp, mặc định server, KPI cards, xu hướng tiền theo ngày tạo đơn, chi tiết và pagination, nhóm tài xế pagination riêng, làm mới, skeleton/loading, empty/error/retry và nút Excel. Query keys theo account + loại báo cáo + bộ lọc. Export dùng bộ lọc đã áp dụng, cả kỳ hiệu lực; loại page/size/driverPage. Abort khi đổi filter/unmount và kiểm lại account/role/session generation trước download. Không mock trong runtime.

Responsive đã chạy Chromium375/768/1024/1440px cho hai trang: không tràn ngang body; bảng chi tiết scroll ngang trong container. 8 ảnh thật tại thư mục evidence/screenshots. Không tuyên bố đã chạy Safari/Firefox hoặc mọi hệ điều hành.

## 7. Excel

Writer OOXML riêng tái sử dụng RestaurantWorkbook.xml để escape inline strings; giữ nguyên ba họ export cũ. Không thêm thư viện/dependency. Mỗi file đúng2sheet TongHop/ChiTiet, header nhận diện FOOD DELIVERY, kỳ, ngày lập, người lập/nhận, bộ lọc, định nghĩa, KPI. TongHop giao hàng có thêm toàn bộ nhóm tài xế; ChiTiet có metadata, header, các dòng theo filter và tổng phù hợp.

Typed moneyVND, numeric Excel dates, tỷ lệ phần trăm đúng giá trị, Calibri11, wrap/border/column widths, freeze8 dòng và autofilter chi tiết. ID là text để giữ độ chính xác. Các giá trị bắt đầu =,+,-,@ vẫn inlineStr; không có formula/hyperlink. Tổng hợp tiền/đếm khớp API, không xuất secret hoặc PII thừa. Các ngày biểu đồ và chi tiết giữ wall-clock; không dịch ngày qua UTC.

Tên tải BaoCaoDoanhThuDonHang_YYYYMMDD.xlsx và BaoCaoHieuSuatGiaoHang_YYYYMMDD.xlsx. Hai mẫu cuối từ dữ liệu test thật nằm ngoài Git tại F:/New folder/fooddelivery-admin-reports-20261113/samples/; không coi đây là số liệu kinh doanh Main.

Microsoft Excel12.0 đã mở8/8 workbook đầy đủ/rỗng/lọc/browser ở chế độ ẩn/chỉ đọc, macro tắt; kiểm tra2sheet, header, kiểu tiền/ngày, freeze, không formula/hyperlink, không ### và file giữ nguyên SHA. Không thay đổi policy hệ thống; chỉ một process kiểm tra được phép Bypass. Chưa nghiệm thu giao diện trên mọi phiên bản Excel hoặc bộ office khác.

## 8. Môi trường và đối chiếu

MySQL8.0.46 độc lập127.0.0.1:3307, UUID a87623fb-db83-11f1-83cc-40c2ba627c1b, datadir F:/New folder/food-delivery-mysql-test/data. Đã xác minh trước thao tác; tạo đúng schema mới fooddelivery_admin_reports và app giới hạn4DML chỉ schema này. Schema16 bảng/16PK/21FK/13UNIQUE/6CHECK khớp baseline; backend18084/management19094 loopback dùng app, ddl-auto=validate, SQL init never. Gateway HTTPS18447 test có chứng chỉ/khóa mới riêng, không cài trust hoặc mở firewall. Build frontend output riêng. Không dùng root làm backend.

Fixture10 đơn:8 trong tháng11,1 trước kỳ,1 đầu tháng12;2 nhà hàng/2 tài xế, nhiều chi tiết trên1 đơn, unpaid/refunded/cancelled/missing paidAt, thiếu duration; một số ca âm cố ý không đại diện lifecycle hợp lệ. Timestamp fixture hợp lệ được đặt sau created_at; ca thiếu giữ nguyên để kiểm tra báo cáo. Không sao chép tài khoản/dữ liệu A2.4.

Oracle dùng SELECT raw riêng orders/payments/deliveries và tính độc lập, không sao chép nguyên aggregate implementation. Kỳ01–30/11:8 đơn,5completed,1cancelled,2paid hợp lệ,240.000VND total/200.000 món/40.000 phí,62,5%completed;7chuyến có tài xế,5giao thành công,1hủy,71,43%,4cặp timestamp hợp lệ trung bình1200giây. Đơn cuối30/11 có microsecond được tính,01/12 loại; payment thu sau kỳ của đơn tạo trong kỳ vẫn thuộc cohort đã công bố. Probe sai amount/âm duration chỉ trong schema mới, phục hồi finally.

## 9. Kiểm thử mới

- Backend package PASS:243 test tổng, **120PASS/0FAIL/0ERROR/123SKIPPED**.11 unit report mới và1 kiểm tra security matrix mới; suite MySQL cũ vẫn tắt vì giới hạn target riêng, không làm yếu test.
- Frontend **350/350PASS**, gồm10 unit/component mới; TypeScript PASS, ESLint toàn frontend0warning PASS, production build PASS.
- Python regression **75/75PASS**.
- SQL/API/Excel **141 kiểm tra PASS/0FAIL**: oracle độc lập, tiền/trạng thái, phạm vi/ngày, nhiều profile, phân trang, validation, role, mẫu số0, missing/mismatch/negative duration, hai workbook và4endpoint export cũ.
- Chromium HTTPS **29 kiểm tra PASS/0FAIL**, gồm hai trang, anonymous và3role sai, filter, số liệu UI, biểu đồ đúng ngày, tên tài xế, download, empty và8layoutviewport.
- Native Excel **8/8PASS**. git diff --check PASS.

Các số trên được chạy trong lượt này. Không cộng lại số liệu nghiệm thu cũ như test mới.141/29 là số assertion kiểm chứng, không phải số JUnit hoặc số requestHTTP.

## 10. Lỗi phát hiện và khắc phục

Đã sửa lệch ngày series do JDBC DATE→JSON UTC bằng SQL trả chuỗi ngày rõ ràng; timestamp chi tiết chuẩn hóa LocalDateTime trước JSON. UI định dạng riêng trường ngày, giữ chữ T trong tên tài xế. Đã đối chiếu lại SQL/API/UI/XLSX và ảnh sau sửa.

Đã tách pagination nhóm tài xế khỏi chi tiết, giữ Excel đủ nhóm; sửa guard launcher backend test không coi gateway thuộc lượt này là cổng backend bị chiếm. Giới hạn log WARN rõ ràng cho launcher fixture; quét log không phát hiện credential/token fixture literal. Lỗi harness ban đầu được sửa trước nghiệm thu, không bỏ test để PASS.

## 11. File tạo/sửa

Backend mới: controller/BusinessReportController.java; repository/BusinessReportRepository.java; service/BusinessReportQuery.java, BusinessReportService.java, BusinessReportWorkbook.java. Sửa config/SecurityConfiguration.java thêm GET ADMIN mới. Test: service/BusinessReportTest.java mới, auth/MainRuntimeSecurityTest.java thêm matrix bốn role/anonymous.

Frontend mới: features/admin-management/BusinessReports.tsx, business-reports-api.ts, business-report-format.ts, business-reports.css, business-reports.test.tsx. Sửa app/router.tsx và features/workspace/Workspace.tsx. Không thay API cũ hay dependency.

Công cụ mới: tools/deployment/ReportFixtureIdentity.java, prepare_admin_reports_test.py, run_admin_reports_test.py, reports-test-gateway.cjs, verify_admin_reports.py, verify_reports_browser.cjs, Verify-ReportsExcel.ps1. Tài liệu data-audit và result. Không sửa SQL baseline/schema/migration hoặc .gitignore trong lượt này.

## 12. Demo và giới hạn

Sau khi được phép chạy lại môi trường test: dùng artifact/config riêng trong evidence, app credential test ngoài Git, backend18084/management19094, gateway18447; tuyệt đối không trỏ Main. Fixture ADMIN email admin@reports.invalid; mật khẩu nằm trong secrets fixture, không in vào tài liệu/chat. Đây không phải tài khoản Main và không bootstrap.

Mở /admin/reports, chọn từng báo cáo, lọc01/11/2026–30/11/2026, đối chiếu các KPI trên; thử profile1/2/999, trạng tháiCOMPLETED/CANCELLED hoặcDELIVERED, xuấtExcel và mở2sheet. Các launcher cố định target, không tự seed lại nếu schema/attempt đã tồn tại. Kiểm thử HTTP suite dùng schema fixture và probe tạm trong đó, không chạy trên Main/test cũ.

Chưa benchmark lớn, chưa xác minh triệu dòng, chưa chạy MySQL suites lịch sử trên schema cũ, không kiểm thử Main. Không có index thời gian mới do cấm đổi schema; nếu cần tối ưu dữ liệu lớn phải đánh giá EXPLAIN/tải và duyệt migration riêng. Không có snapshot kéo dài giữa những lần người dùng tải trang và xuất Excel khi có writer đồng thời.

Đáp ứng BTL: hai nghiệp vụ có người lập/nhận/mục đích, trace được bảng/FK/SQL, KPI có công thức và mẫu số rõ, phân quyền thật, form lọc/phân trang, UI responsive, workbook2sheet, đối chiếu SQL→API→UI→Excel, dữ liệu test riêng và tài liệu giới hạn. Không triển khai các KPI mà schema không hỗ trợ.

Evidence tại F:/New folder/fooddelivery-admin-reports-20261113/: setup-result.json, mysql-isolation.json, backend-final.log, frontend-final-tests.log, frontend-check-exits.json, python-regression.log, http-sql-excel-results.json, browser-results.json, native-excel-results.json, screenshots/, samples/. Credential/key nằm riêng secrets/ACL hạn chế, không đưa Git.

Các tiến trình backend/gateway/MySQL test do lượt này tạo được dừng sau nghiệm thu, giữ DB/log/fixture để đối chiếu; trạng thái cleanup ghi riêng cleanup-result.json. Main không là đối tượng connect/ghi; không tự chạy tiếp sang production hoặc commit/push.
