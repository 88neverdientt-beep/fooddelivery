# A2.2 — Hoàn thiện form thêm món, lưu MySQL và xuất Excel

Kết luận: **PASS trong phạm vi A2.2**, kiểm chứng ngày 12/11/2026 trên database thử nghiệm riêng đã được phê duyệt. Dừng tại A2.2; chưa thực hiện A2.3.

## 1. Source đã đọc và đối chiếu A1/A2.1

Đã đọc MenuPages.tsx, model.ts, api.ts, shared.tsx, management.css và các test restaurant-management; RestaurantFoodItemController/Service/RequestDTO/UpdateDTO/Repository; FoodItemService; entity FoodItem, RestaurantFoodItem, Restaurant; AccessRules, SecurityConfiguration, CustomerReadService, ReadQuery; schema snapshot; docs/coursework-audit/A1-database-inventory.md, A1-forms-search-reports.md và docs/coursework/A2-1-result.md, lớp xuất XLSX A2.1. Khảo sát và bảng ánh xạ được lập trước khi sửa.

## 2. Kiến trúc catalog và thực đơn

FoodItem là catalog chung do ADMIN quản lý. RESTAURANT chọn món catalog chưa có trong thực đơn của mình rồi tạo RestaurantFoodItem; chỉ quản lý giá bán và trạng thái bán. Tên, mô tả, danh mục hiển thị chỉ đọc, không ghi từ form Restaurant. Tái sử dụng form hiện tại tại `/restaurant/menu/new` và form sửa hiện tại; không tạo hệ thống catalog khác.

UNIQUE(restaurant_id,item_id), hai FK và transaction hiện hữu tiếp tục là hàng rào tại database. Writer tạo/sửa, CAS expectedPrice/expectedIsAvailable và snapshot giá đơn hàng giữ nguyên. Quyền ADMIN đối với API mutation cũ vẫn được giữ đúng hợp đồng. API đọc menu công khai của nhà hàng khác vẫn là hành vi công khai hợp lệ; hai API quản trị mới chỉ RESTAURANT và chỉ dữ liệu của principal.

## 3. Trường form thực tế và miền dữ liệu

| Trường UI | DTO | Validation | Service | Entity | MySQL |
|---|---|---|---|---|---|
| Món được chọn | foodItemId | Positive,NotNull; chọn từ catalog server | createRestaurantFoodItem: tồn tại catalog, không trùng cặp | FoodItem; RestaurantFoodItem.foodItem | food_items.item_id; restaurant_food_items.item_id FK NOT NULL |
| Tên/danh mục/mô tả | Chỉ đọc FoodItemOutputDTO; không gửi để tạo menu | Không có quyền chỉnh catalog từ form Restaurant | mapping từ FoodItem | FoodItem.name/category/description | food_items.name/category/description |
| Giá bán | price BigDecimal | FE chuỗi dương,≤10chữ số nguyên/2lẻ; BE DecimalMin,Digits10/2,NotNull | create/update menu | RestaurantFoodItem.price | restaurant_food_items.price DECIMAL12,2 NOT NULL |
| Còn bán/ngừng bán | isAvailable Boolean | FE boolean; BE mặc định true nếu null, giữ hợp đồng cũ | create/update menu | RestaurantFoodItem.isAvailable | restaurant_food_items.is_available BIT NOT NULL |
| Nhà hàng | restaurantId từ phiên ở frontend | Server AccessRules kiểm principal; client không tự khai quyền | tìm Restaurant đúngID, ownership trước mutation | RestaurantFoodItem.restaurant | restaurant_food_items.restaurant_id FK NOT NULL |
| Snapshot khi sửa | expectedPrice/expectedIsAvailable | Đủ cặp; lock/refresh/CAS trả409 nếu stale | updateRestaurantFoodItemById | Không thêm cột | UPDATE có điều kiện; không sửa order_details.unit_price |

Không bổ sung ảnh, quận/phường, tồn kho hoặc trường ngoài schema. Form chỉ xuất hiện sau khi chọn món; tên/danh mục/mô tả đã chọn được giữ độc lập với kết quả tìm catalog.

## 4. Lỗi/thiếu sót đã khắc phục

- Bổ sung thông báo tiếng Việt khi giá rỗng; giữ miền dương, tối đa 10 chữ số nguyên và 2 chữ số lẻ theo DECIMAL(12,2).
- Sau POST thành công phải GET lại theo ID, kiểm tra đúng món và chủ sở hữu rồi mới hiển thị dữ liệu đã lưu.
- Khóa gửi lặp trong lúc xử lý. Với mất phản hồi/5xx/409, không tự phát lại POST; tra cứu đúng cặp món–nhà hàng bằng API riêng, giữ khóa và cung cấp link tới bản ghi đã xác minh. Nếu chưa tìm thấy vẫn không suy diễn thất bại hoặc tự tạo lại. Chặn kết quả từ phiên đăng nhập cũ.
- Bổ sung xuất Excel theo bộ lọc toàn bộ các trang, dữ liệu thật và quyền riêng nhà hàng.
- URL có trạng thái không hợp lệ được chuẩn hóa về tất cả thay vì vô tình lọc ngừng bán.
- Xem ảnh live phát hiện nút có tên dài ép cột nội dung xuống từng ký tự: sửa CSS chỉ cho dòng thực đơn, kiểm tra lại desktop và mobile 390px không tràn ngang.

Không có bằng chứng cần thay đổi schema hoặc logic checkout. Hai file SQL cũ có khác biệt xuống dòng trong quá trình kiểm tra đã được khôi phục byte đúng baseline; không thay nội dung DDL.

## 5. File đã tạo/sửa

- `frontend/src/features/restaurant-management/MenuPages.tsx`
- `frontend/src/features/restaurant-management/MenuCreationPanel.tsx`
- `frontend/src/features/restaurant-management/MenuExport.tsx`
- `frontend/src/features/restaurant-management/api.ts`
- `frontend/src/features/restaurant-management/model.ts`
- `frontend/src/features/restaurant-management/management.css`
- `frontend/src/features/restaurant-management/menu-create.test.tsx`
- `frontend/src/features/restaurant-management/menu-export.test.ts`
- `src/main/java/vn/gaugaugau/fooddelivery/config/SecurityConfiguration.java`
- `src/main/java/vn/gaugaugau/fooddelivery/controller/MenuExcelController.java`
- `src/main/java/vn/gaugaugau/fooddelivery/repository/RestaurantFoodItemRepository.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/MenuExcelExportService.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbook.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/ApprovedMySqlTestTarget.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/MenuPersistenceMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbookTest.java`
- `docs/coursework/A2-2-result.md`


Tổng 17 file thuộc delta A2.2. Không đổi dependency, pom.xml, package manifest/lock, entity, migration hoặc writer nghiệp vụ. Các thay đổi A1/A2.1 có sẵn trước lượt này được bảo toàn. Script chạy kiểm chứng, cấu hình và log nằm ngoài repo trong thư mục thử nghiệm; credential không đưa vào báo cáo/Git.

## 6. API sử dụng

API hiện hữu: GET `/restaurant-management/catalog`; GET `/restaurants/{id}/menu`; GET `/restaurant-food-items/{id}`; POST `/restaurant-food-items`; PUT/DELETE `/restaurant-food-items/{id}`. Client lấy restaurantId từ phiên hiện tại; server tiếp tục kiểm tra ownership, không tin ID client tự khai.

Hai GET mới:

- `/restaurant-management/menu/by-food/{foodItemId}`: tìm đúng cặp thuộc restaurant principal, không có trả 404; JOIN FETCH phục vụ DTO trong transaction.
- `/restaurant-management/menu/export.xlsx`: chỉ RESTAURANT; owner từ principal. Chỉ nhận q, category, available, sort. Từ chối restaurantId, page, size hoặc sort lạ trước khi ghi file. Các role ADMIN/CUSTOMER/DRIVER bị 403, chưa đăng nhập 401.

Fixture được tạo bằng API ADMIN trong DB mới. Luồng hồi quy gọi API Cart/checkout và đọc Order; API export nhà hàng A2.1 vẫn hoạt động với ADMIN.

## 7. Bảng MySQL và môi trường

DB duy nhất dùng cho ghi A2.2: `fooddelivery_coursework_a22`, MySQL 8.0.46 độc lập `127.0.0.1:3307`, datadir riêng `F:/New folder/food-delivery-mysql-test/data`. Tạo mới 16 bảng từ schema-only đã kiểm chứng, không sao chép dữ liệu lịch sử. User coursework_a22_app chỉ SELECT/INSERT/UPDATE/DELETE trong DB mới. Sau tạo schema dùng `ddl-auto=validate`.

Bảng chính: food_items, restaurant_food_items, restaurants, accounts. Kiểm chứng lịch sử dùng customers, carts/cart_items, orders/order_details, payments/payment_methods và phiên đăng nhập theo quan hệ thực tế. Không migration schema cũ. Java 25.0.4, Maven 3.9.16, Node 24.20.0. Backend 18081, management 19091, UI 4174; request ID read-only xác minh proxy tới đúng backend trước mọi ghi.

## 8. Cấu trúc/phạm vi Excel

Tên tải `DanhSachMonAn.xlsx`, sheet “Thực đơn”, 7 cột: Mã món thực đơn; Mã món catalog; Tên món; Danh mục; Mô tả; Giá bán (VND); Trạng thái. Không thêm ngày giả vì dữ liệu menu hiện tại không có trường ngày tương ứng trong DTO xuất.

Nút “Xuất Excel” xuất **toàn bộ món của chính nhà hàng theo bộ lọc đang áp dụng**, gồm các trang khác; không giới hạn 12 dòng UI. Cùng q/category/available/sort với truy vấn hiện hữu, escape LIKE cho %, _ và !, sort có ID để ổn định thứ tự. Không cho client chọn nhà hàng khác.

Tái dùng ZIP/XLSX writer A2.1, JDBC forward-only streaming và ghi từng dòng, không gom toàn tập vào List hay shared-string table. Giá là ô số định dạng `#,##0.00" ₫"`; ID là text. Các trường text dùng inlineStr, chuỗi bắt đầu =,+,-,@ không được chuyển thành công thức. Kiểm chứng dữ liệu chứa =SUM và =HYPERLINK; không có ô công thức hoặc hyperlink. UTF-8 giữ tiếng Việt, header/autofilter; trạng thái Còn bán/Ngừng bán. Không xuất password/hash/token. Download có kiểm tra MIME, hủy khi rời trang/đổi bộ lọc/phiên; filename cố định.

## 9. Kết quả kiểm thử

- JUnit chọn theo phạm vi: **115 PASS / 0 FAIL / 0 ERROR / 0 SKIPPED**, 15 suite. Gồm 8 test persistence menu mới, 7 RestaurantManagementMySqlTest, 13 AdminManagementMySqlTest và 87 test còn lại. Maven package thành công. Không tuyên bố chạy toàn bộ mọi suite opt-in của dự án.
- Frontend Vitest lần cuối: **330 PASS / 0 FAIL / 0 SKIPPED**. Typecheck, lint, format check và Vite build đều exit 0, gồm sau sửa bố cục.
- HTTP thực tế: **162 request đạt status kỳ vọng**, bao gồm hai request đồng thời. Các mã 400/401/403/404/409 trong negative test là kết quả đúng.
- Chromium live: **3/3 kịch bản PASS**: chọn/validation/double-submit/GET lại/sửa giá/toggle/download; POST commit nhưng mất phản hồi không replay; catalog cũ nhận 409 và đối chiếu đúng bản ghi. Thêm kiểm tra readback/bố cục desktop/mobile sau build cuối PASS.
- Native Microsoft Excel 12.0: **4/4 workbook mở read-only thành công**, FileFormat 51, không formula, không sửa byte. Dùng đúng một tiến trình PowerShell Bypass đã được người dùng phê duyệt, không đổi policy hệ thống.

MySQL xác nhận create/read đúng FK; trùng cặp bị chặn; hai request đồng thời có kết quả 201/409; rollback sau flush không để lại menu; giá lớn nhất và availability hợp lệ; nhà hàng khác không mutation/lookup riêng được; FK chặn xóa món đã có trong đơn; đổi giá menu không đổi order_details.unit_price/subtotal. Fixture, unit test và HTTP đều kiểm tra quyền.

Các lượt harness ban đầu có lỗi khai báo type test, chờ dialog chưa đúng thời điểm và thiếu kỳ vọng 401 refresh trước đăng nhập; đã sửa harness/typing, không nới quyền hoặc bỏ assertion sản phẩm. Browser cuối kiểm tra đúng duy nhất `/api/auth/refresh` trả 401 trước login; mọi 401 khác vẫn làm test fail. Fixture các lần chạy đều giữ lại, không xóa để đạt PASS. Log các lượt trước lưu riêng.

## 10. Đối chiếu Excel–MySQL

Bộ export HTTP tại thời điểm kiểm chứng: đầy đủ **15 dòng dữ liệu** (16 gồm header, vượt trang UI 12); rỗng **0 dòng**; lọc category Phở + available true có **4 dòng**, sort giá tăng đúng. Mọi ô 15×7 và toàn bộ tập lọc được so với SELECT độc lập trong MySQL bằng Decimal; không so sánh với dữ liệu giả hay chỉ response frontend. Nhà hàng thứ hai chỉ xuất 1 món của chính mình.

File tải từ nút UI sau sửa/toggle chứa 1 dòng theo tên lọc: menu #79, giá 35000.75, đang bán; đối chiếu cả 7 ô với SQL PASS. Các file HTTP trước đó là snapshot tại thời điểm xuất, không bị ghi đè khi browser tạo thêm fixture. Trạng thái cuối DB: 58 dòng menu và 58 cặp nhà hàng–món phân biệt, không có cặp trùng; bao gồm các fixture kiểm thử được giữ lại.

## 11. Regression A2.1

Trong DB A2.2, test gọi AuthService tạo Account + Restaurant, đọc lại/export và rollback. HTTP export ADMIN vẫn có đúng 9 cột, 2 dòng nhà hàng fixture; Microsoft Excel mở file hồi quy thành công. Các test writer workbook A2.1 được giữ và PASS.

Không ghi vào DB A2.1. JAR `target/fooddelivery-0.0.1-SNAPSHOT.jar` và toàn bộ `frontend/dist` đang phục vụ người dùng có SHA-256 đúng baseline. Build A2.2 đặt riêng ngoài repo. Phiên A2.1 localhost:4173, backend18080/management19090 vẫn chạy, không bị restart. Do người dùng đang thử UI, không tuyên bố dữ liệu A2.1 bất biến trước thao tác của chính người dùng.

## 12. Giới hạn còn lại

Chỉ kiểm thử Chromium trên Windows và viewport desktop/mobile, chưa chạy lại ma trận Firefox/WebKit hay stress dữ liệu hàng triệu dòng. Streaming được xác minh qua implementation và nhiều trang, chưa định lượng tải production. Không chạy ghi trên production/MySQL80 hoặc mọi suite lịch sử. UI A2.1 hiện chạy bản build cũ được bảo toàn, không tự thay bằng bản A2.2. Không triển khai/deploy bản mới.

Kết quả mất phản hồi xử lý bằng đối chiếu bản ghi và khóa replay; không triển khai hệ thống idempotency key mới. UNIQUE cặp ở DB vẫn chống trùng kể cả refresh trang. Không yêu cầu migration/dependency mới. Không có blocker A2.2 còn biết trong các kiểm thử đã chạy.

## 13. Database, checksum và bằng chứng

`logs/final-database-proof.json`: 14 schema/221 bảng cũ có CHECKSUM TABLE và SHA-256 SHOW CREATE khớp baseline; datadir/port test được xác minh. MySQL80 vẫn Running, không dừng/restart/ghi cổng3306. Các query ghi chỉ trỏ DB A2.2, quyền app giới hạn DB đó.

`logs/shutdown-proof.json`: đã xác minh command line PID trước khi dừng backend32336 và frontend34452; cổng18081/19091/4174 đóng. Giữ MySQL test3307 và A2.1 đang dùng18080/19090/4173 theo phê duyệt môi trường riêng, không dừng instance dùng chung.

Dữ liệu/log giữ tại [thư mục A2.2](<../../../food-delivery-mysql-test/coursework-a22-20261112/>). Đường dẫn tuyệt đối: `F:/New folder/food-delivery-mysql-test/coursework-a22-20261112`.

Bằng chứng chính: logs/junit-summary.json; logs/frontend-unit-final.json; logs/frontend-final-gates.json; logs/frontend-final-build.log; logs/http-proof.json và http-progress.json; logs/browser-proof.json; logs/visual-final-proof.json; logs/excel-native-proof.json; logs/final-database-proof.json; logs/shutdown-proof.json; logs/verified-source.json; logs/secret-scan-proof.json. Ảnh cuối: logs/menu-edit-final.png, menu-list-final.png, menu-mobile-final.png. Log/screenshot không lưu password hoặc bearer token.

Các workbook: DanhSachMonAn.xlsx, DanhSachMonAn-empty.xlsx, DanhSachMonAn-filtered.xlsx, DanhSachMonAn-ui.xlsx và DanhSachNhaHang-a21-regression.xlsx. Credential/config riêng phục vụ test không đưa vào repo/báo cáo. HEAD vẫn 0315de8566d299472b28b2f10bb50326c7d6b9aa; không commit/push/deploy.

## 14. Kết luận

**PASS A2.2**: đã kiểm chứng form hiện hữu → tạo menu → MySQL → đọc lại ID → hiển thị thật → xuất XLSX, cùng phân quyền/rollback/chống trùng/giữ lịch sử trên môi trường riêng được phê duyệt. Hoàn tất và dừng A2.2, chờ chỉ dẫn A2.3.
