# P1 fix — Delivery Excel NULL status

Ngày13/11/2026, Asia/Saigon. Branch feature/admin-business-reports; HEAD giữ nguyên d0556eeb81922b52be23bea754affaf8ae59418b. **Đã khắc phục P1-01 trong source và PASS hồi quy RAM/SQL trong RAM/Excel.** Không tự nâng toàn bộ nghiệm thu thành production-ready hoặc tự commit/push. Báo cáo final-acceptance trước đó giữ nguyên như bằng chứng lịch sử; phụ lục này ghi delta sửa P1.

## 1. Nguyên nhân và luồng dữ liệu

BusinessReportRepository.drivers/exportDrivers dùng SUM(d.delivery_status='DELIVERED') và SUM(...='CANCELLED'). Với một nhóm chỉ có delivery_status=NULL, phép SUM trả NULL. API nhận counter null; BusinessReportService.export lấy cùng nhóm qua repository, BusinessReportWorkbook chuyển counter vào BusinessReportService.rate. numerator.toString() gây NullPointerException trước khi workbook hoàn tất.

Schema cho phép NULL; đây không phải lý do sửa dữ liệu hoặc thêm trạng thái. KPI summary tổng đã dùng COALESCE và count assigned riêng nên nguyên nhân nằm ở aggregate nhóm và đầu vào writer. Đã rà chỗ xử lý status/cast/switch/map/toString: formatter cũ đã chặn NULL nhưng nhãn “Chưa tạo giao hàng” không đúng khi dòng Delivery tồn tại. Helper rate được giữ nguyên để không thay logic báo cáo đơn/doanh thu; đầu vào count nhóm được chuẩn hóa đúng nơi sở hữu.

## 2. Test FAIL trước sửa

Thêm DeliveryReportNullStatusTest trước khi đổi production source, chạy riêng bằng Maven offline trong bản sao test:

-5case:2PASS,1FAIL nhãn trạng thái,2ERROR NullPointerException ở ca nhóm toàn NULL và nhiều nhóm có một nhóm NULL.
-Không phải lỗi compile. Stack/log chỉ đến numerator.toString() trong rate, gọi từ writer/service export như audit.
-5test SQL trong RAM chạy actual grouping SQL lấy từ repository:2FAIL vì delivered=0 mong đợi nhưng kết quả NULL;3case còn lại PASS.

Bằng chứng backend-red.log và sql-red.log giữ riêng, không ghi đè bằng kết quả sau sửa. Không kết nối MySQL để tái hiện.

## 3. Sửa có giới hạn

- BusinessReportRepository.drivers và exportDrivers: dùng COUNT(CASE WHEN predicate THEN 1 END) cho delivered/cancelled. NULL không khớp predicate, count trả0; không thêm WHERE loại NULL và không đổi assigned=COUNT(*), cohort/filter/group/sort/limit.
- BusinessReportWorkbook: chuẩn hóa hai legacy counter NULL về0 trong phần nhóm tài xế trước gọi rate, không mutate Map hoặc trạng thái; assigned denominator giữ nguyên. Đây là số lượng predicate khớp bằng0, không chuyển NULL thành SUCCESS/FAILED/DELIVERED.
- BusinessReportWorkbook.detail: riêng report giao hàng, status NULL hiển thị “Chưa xác định”. Trạng thái hợp lệ vẫn dùng formatter cũ. Báo cáo đơn/doanh thu và legacy exports không bị sửa.
- BusinessReports.tsx: riêng ô status của report giao hàng NULL hiển thị cùng nhãn “Chưa xác định”; không đổi nhãn trường thời gian thiếu hoặc báo cáo đơn. API giữ status=NULL, chỉ UI/XLSX chuyển sang nhãn đọc được.

Không sửa BusinessReportService.rate, entity, enum, schema, dữ liệu, security hoặc quyền ADMIN. Không sửa P2 khác.

## 4. Hồi quy theo yêu cầu

| Ca | Kiểm tra | Kết quả mới |
|---|---|---|
| Một tài xế toàn NULL | Raw legacy counters NULL qua service→writer; SQL nhóm actual | PASS, assigned giữ đủ, delivered/cancelled0, không NPE |
| NULL trộn trạng thái hợp lệ | NULL +DELIVERED, SQL thêm PENDING | PASS, NULL nằm trong assigned, không thành success; tỷ lệ1/2=50% ở fixture Java |
| Nhiều tài xế, một nhóm toàn NULL |2nhóm/4chi tiết | PASS, cả nhóm và4IDgiữ đủ,1/4=25% |
| Không có Delivery |0chi tiết,0nhóm | PASS,2sheet, tỷ lệ mẫu số0 vẫnnull |
| Tất cả5trạng thái hợp lệ | PENDING/PICKED_UP/DELIVERING/DELIVERED/CANCELLED | PASS,5assigned/1delivered/1cancelled,20%; hành vi trước sửa đã PASS và sau sửa vẫn PASS |
| Hai sheet | TongHop,ChiTiet | PASS, ZIP đọc được và toàn bộ XML parse được |
| KPI và mẫu số | So với expected độc lập của fixture | PASS, không đổi total/assigned; không cộng NULL vào success |
| Không mất/trùng dòng | Kiểm số dòng=fixture+metadata/header/total, ID duy nhất | PASS cho1/2/4/0/5chi tiết |
| Nhãn trạng thái thiếu | XLSX+React component | PASS, cùng “Chưa xác định”, row không hiển thị nhãn delivered giả |
| Mở file bằng engine hiện có | ZipInputStream/DOM và Microsoft Excel | PASS, workbook RAM NULL mở native read-only đủ2sheet/1chi tiết |

SQL test dùng SQLite :memory: của Python standard library để chạy SELECT/grouping ANSI lấy từ hai method repository, không thêm dependency hoặc tạo file database. Oracle tính count từ fixture độc lập, kiểm row nguồn trong RAM không bị đổi. Đây không phải kiểm thử MySQL/JDBC. Không dựng mẫu kinh doanh giả để thay dữ liệu thật; workbook bổ sung chỉ là fixture hồi quy RAM có ghi rõ mục đích trong evidence.

## 5. Kiểm thử tổng thể sau sửa

- Backend Maven package PASS: **248test tổng,125PASS,0FAIL,0ERROR,123SKIPPED**.5test mới DeliveryReportNullStatusTest PASS.11unit báo cáo cũ, security13 và các suite unit/contract khác vẫn PASS.
- Frontend **351/351PASS**,37file; thêm1component case NULL. TypeScript noEmit PASS, ESLint toàn frontend0warning PASS, production build PASS.
- Python **80/80PASS**, gồm75safety/unit cũ+5SQL RAM mới. Hai truy vấn nhóm đều được thực thi trong mỗi fixture.
- Native Excel12.0 mở null-status-ram.xlsx mới ở chế độ ẩn/chỉ đọc, macro tắt:2sheet/1chi tiết, nhãn NULL đúng, không công thức/hyperlink, checksum file giữ nguyên.
- git diff --check PASS. Không sửa/bỏ test để ép kết quả. Hai lỗi selector của test UI trong quá trình viết (trùng tiêu đề và option DELIVERED trong bộ lọc) được sửa bằng cách giới hạn assertion vào KPI và đúng dòng901; vẫn kiểm rõ success0 và không gán nhãn giao thành công cho dòng NULL.

123SKIPPED vẫn là các suite MySQL opt-in lịch sử, không được bật vì không có runtime đang chạy được xác minh cho lượt này. Không gọi chúng là PASS. Chi tiết suite và guards giữ như final-acceptance.md. Kết quả141SQL/API/Excel,29Chromium,8/8workbook của triển khai cũ không được dùng như kết quả mới của bản sửa.

## 6. Kiểm tra database và an toàn

Cổng test3307/18084/19094/18447 đều đóng lúc kiểm tra. Không tự khởi động MySQL/browser backend, không tạo/xóa/ghi đè database test, không seed hoặc thêm fixture vào MySQL. Các dòng NULL được tạo chỉ trong bộ nhớ cho unit/SQL RAM. Không có kết nối database Main hoặc test trong lượt sửa này.

Không thực thi migration/DDL/DML Main, không bootstrap ADMIN, không sửa quyền, không deploy, không thay credential/RSA.5file backup Main khớp snapshot SHA lịch sử. Các file có sẵn ngoài4file delta được fingerprint để bảo toàn; file how -s --format=fuller 0315de8 giữ nguyên và không stage. HEAD/branch không đổi, staging rỗng, không commit/push/merge.

Việc không thực hiện thao tác ghi Main được xác nhận theo phạm vi công cụ của lượt này. Trạng thái dữ liệu/schema Main hiện tại và mọi thay đổi có thể do actor khác thực hiện không được kiểm toán trực tiếp; không khẳng định có snapshot tuyệt đối mới.

## 7. File thay đổi so với đầu lượt sửa P1

Sửa4file có sẵn:

1. src/main/java/vn/gaugaugau/fooddelivery/repository/BusinessReportRepository.java
2. src/main/java/vn/gaugaugau/fooddelivery/service/BusinessReportWorkbook.java
3. frontend/src/features/admin-management/BusinessReports.tsx
4. frontend/src/features/admin-management/business-reports.test.tsx

Thêm3file:

1. src/test/java/vn/gaugaugau/fooddelivery/service/DeliveryReportNullStatusTest.java
2. tools/deployment/test_delivery_null_counts.py
3. docs/coursework/admin-business-reports-p1-fix-result.md

Các thay đổi Giai đoạn2 có trước vẫn giữ nguyên; không đưa chúng vào danh sách delta mới này. Không đổi .gitignore, pom/dependency, schema-reference, SQL, service tính KPI chung, auth/security hoặc những chức năng khác.

## 8. Finding còn lại và giới hạn

- P0: không phát hiện mới trong phạm vi sửa/hồi quy.
- P1-01: đã khắc phục và tái kiểm chứng trong RAM, SQL RAM, component và native Excel. Ca raw SUM NULL từ audit cũng được writer bảo vệ. Không thay dữ liệu để che lỗi.
- P2-01 số đếm Excel hiển thị thập phân và P2-02 giải thích eligibility doanh thu tại dòng: **giữ nguyên, chưa sửa**, ngoài phê duyệt lần này.
- NOT VERIFIED mới trên MySQL: thực thi hai COUNT(CASE...) bằng ConnectorJ/MySQL8.0.46, dữ liệu NULL thực tế trong DB và real HTTP Excel sau sửa. SQL RAM không thay thế những mục này.
- NOT VERIFIED: browser E2E mới375–1440, mọi Office/browser/OS, tải lớn. Native Excel trên workbook RAM không chứng minh đường truyền HTTP/MySQL.
- Không nâng báo cáo nghiệm thu lịch sử sang PASS toàn hệ thống khi còn các giới hạn đó. Có thể trình bản sửa P1 để review tiếp; dừng đúng phạm vi, chờ chỉ đạo riêng nếu cần chạy lại môi trường test/commit.

## 9. Bằng chứng

Thư mục riêng `F:/New folder/fooddelivery-admin-reports-20261113/p1-fix-20261113/`: before.json, backend-red.log, sql-red.log, backend-green.log, backend-result.json, sql-green.log, python-final.log, frontend-tests.log, frontend-exits.json, typecheck.log, eslint.log, frontend-build.log, native-excel.json, null-status-ram.xlsx, safety-check.json và kiểm tra scope cuối. Build/probe/cache/temp đều ngoài repository, không đưa artifact hoặc secret vào Git. Các báo cáo/log trước giữ nguyên.
