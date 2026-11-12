# A1 — Hai form, một tìm kiếm, hai báo cáo

## Cấp độ xác minh và lựa chọn

**PARTIAL về demo trực tiếp, VERIFIED về truy vết source. DB LIVE NOT VERIFIED.** Không chạy ứng dụng/test hoặc ghi DB trong A1. Có bằng chứng HTTP/MySQL lịch sử 8.2; không đổi nhãn lịch sử thành kết quả chạy mới. Năm màn hình dưới tồn tại trong router và implementation, không là mock hoặc lọc mảng frontend.

| ID | Màn hình | Route React | API backend (frontend thêm /api) | Bảng chính | Trạng thái |
|---|---|---|---|---|---|
| F1 | Tạo nhà hàng và Account | /admin/restaurants/new | POST /restaurants | restaurants, accounts | VERIFIED source + E2E lịch sử; live NOT VERIFIED |
| F2 | Thêm món catalog vào thực đơn | /restaurant/menu/new | POST /restaurant-food-items | restaurant_food_items; đọc restaurants, food_items | VERIFIED source + E2E lịch sử; live NOT VERIFIED |
| S1 | Tìm đơn của nhà hàng | /restaurant/orders | GET /restaurant-management/orders | orders JOIN customers, sau đó graph detail/menu/payment/delivery | VERIFIED DB search từ source/test cũ; live NOT VERIFIED |
| R1 | Thống kê nhà hàng | /restaurant/analytics | GET /restaurant-management/analytics | orders, payments, order_details, restaurant_food_items, food_items, ratings | VERIFIED aggregate source + fixture/E2E cũ; đối chiếu toàn tập mới NOT VERIFIED |
| R2 | Báo cáo hoạt động ADMIN | /admin/analytics | GET /admin-management/analytics | orders, payments, deliveries, drivers, restaurants, payment_methods; counts profiles/accounts | VERIFIED source + SQL oracle lịch sử; live NOT VERIFIED |

Route và role từ frontend/src/app/router.tsx. Cấu hình backend SecurityConfiguration có @EnableMethodSecurity, path role và service role/ownership. UI không là lớp bảo vệ duy nhất. Năm màn hình có SQL tương ứng trong [traceability](A1-sql-traceability.md).

## Khảo sát các ứng viên khác

- Form: đăng ký Customer (/register), cập nhật profile Customer/Restaurant/Driver, checkout (/customer/checkout), rating, tạo Driver (/admin/drivers/new), chỉnh sửa menu. Tạo Driver tái dùng AdminCreateProfile, đủ nghiệp vụ nhưng trùng cấu trúc F1; giữ làm dự phòng ít đổi role.
- Không tìm thấy form React CRUD catalog FoodItem dù backend POST/PUT/DELETE /food-items tồn tại. F2 chỉ chọn catalog có sẵn, không tạo tên/mô tả/danh mục mới; không trình bày thành “thêm món catalog”.
- Search khác: /restaurants gọi GET /restaurants/search (JPQL), menu nhà hàng có name/availability/sort; ADMIN accounts/orders/... dùng JdbcTemplate. Chọn S1 vì JOIN, tìm mã/tên khách, lọc trạng thái/ngày, phân trang tại MySQL và SQL hiện hữu dễ giải thích.
- Report khác: dashboard ADMIN/Restaurant tái dùng cùng reporting component; Driver /driver/analytics chỉ thống kê counts/timestamps, không thu nhập. Không coi hai dashboard và analytics cùng component là hai báo cáo độc lập nếu nội dung trùng. R1 và R2 là hai route/role/aggregate khác nhau.

## F1 — Tạo nhà hàng (ADMIN)

Chuỗi: AdminCreateRestaurant → AdminCreateProfile(kind RESTAURANT) → adminApi.createProfile → RestaurantController.createRestaurant → AuthService.createRestaurant → RestaurantRepository.save + AccountRepository.saveAndFlush → MySQL.

Trường nhập: name, email, phoneNumber, address, activity (open/closed), password, confirmPassword. License plate chỉ dùng nhánh DRIVER. Role không nhận từ client để quyết định Account; server tự đặt RESTAURANT. Actor ADMIN từ principal.

Frontend: React Hook Form/Zod createProfileSchema; trim tên/địa chỉ/số liên hệ, tên≤150, email ASCII hỗ trợ≤255, phone≤15, address≤255, activity enum, passwordSchema và confirm trùng. API hạ email thành lowercase. Backend: @Valid RestaurantRequestDTO @NotBlank/@Email/@Size; AuthService.validatePassword ≥12 code points và ≤72 UTF-8 bytes, normalize email và kiểm tài khoản tồn tại. BCrypt cost12 do SecurityConfiguration; không lưu plaintext. Không có validation định dạng số điện thoại mạnh ngoài không rỗng/độ dài.

DB: restaurants.email NOT NULL UNIQUE; accounts.email NOT NULL UNIQUE xuyên role; FK accounts.restaurant_id; UNIQUE liên kết; CHECK role/status/profile/email normalized. createRestaurant lưu profile và Account trong transaction READ_COMMITTED; lỗi account flush rollback cả profile theo transaction proxy, không cascade tự xóa parent.

Phản hồi: HTTP201, Me có accountId/restaurantId/role/status. UI toast “Đã tạo tài khoản và hồ sơ.” rồi mở detail. 400 invalid; 409 duplicate/constraint. Với network/5xx kết quả chưa rõ, form khóa gửi lại, tra account theo email để đối chiếu, không tự lặp POST. Dialog xác nhận trước tạo, ngăn gửi lặp trong phiên UI.

Bằng chứng cũ: frontend/e2e/admin.spec.ts:186 tạo Restaurant/Driver từ UI, kiểm201, role, link profile và đăng nhập mới mà không đổi vai trò actor; docs/phase7-test-results.md ghi SQL Account/profile và BCrypt. A1 không chạy lại. Cách đối chiếu A2: cùng accountId/restaurantId từ response, SELECT các cột không secret, kiểm exactly1 liên kết và role; demo rollback qua test riêng chỉ khi duyệt môi trường ghi. Không SELECT/export password_hash để trình chiếu.

## F2 — Thêm món từ catalog (RESTAURANT)

Chuỗi: RestaurantMenuEditor + MenuForm → restaurantApi.catalog / add → RestaurantFoodItemController.createRestaurantFoodItem → RestaurantFoodItemService.createRestaurantFoodItem → RestaurantRepository/FoodItemRepository.findById + RestaurantFoodItemRepository.existsByRestaurant_RestaurantIdAndFoodItem_ItemId/save.

Catalog GET /restaurant-management/catalog loại món đã thêm bằng NOT EXISTS theo restaurantId từ principal; q/category và phân trang ở MySQL. Người dùng chọn item có thật rồi nhập price và isAvailable. Tên/category/description chỉ đọc.

Frontend menuInput/priceInput: giá chuỗi dương, tối đa10 chữ số nguyên/2 lẻ; không exponent, grouping, âm, không âm thầm làm tròn; boolean availability. Backend DTO @NotNull/@DecimalMin(exclusive0)/@Digits(10,2), ID @Positive; service kiểm hai parent tồn tại và cặp chưa có. @access.profile kiểm restaurantId trong request đối với actor, không tin ID do client khai.

DB: DECIMAL(12,2) NOT NULL, availability NOT NULL, hai FK NOT NULL, UNIQUE(restaurant_id,item_id). Không có CHECK price>0 ở SQL; DTO/service mới chặn giá âm. Không mô tả nhầm thành ràng buộc DB.

HTTP201 trả menuId và giá. UI hiển thị “Đã lưu món #... theo phản hồi máy chủ”, vô hiệu hóa form thêm đã lưu, làm mới query menu/catalog/public. 400/404/409 có thông báo; useAction khóa khi kết quả chưa rõ và đọc lại, không retry mutation tự động. PUT edit riêng có expectedPrice/expectedIsAvailable và409 stale, không phải thao tác INSERT này.

Bằng chứng: frontend/e2e/restaurant.spec.ts:169 thử -1 bị từ chối, tạo25000.50, nhận201/owner đúng, sửa28000.75, ngừng bán và xóa món không tham chiếu. Trong A2 chọn món catalog chưa thêm, SELECT menuId JOIN hai parent đối chiếu giá/availability. A1 không tạo món/fixture.

## S1 — Tìm đơn nhà hàng

React RestaurantOrdersPage → restaurantApi.orders → RestaurantManagementController.orders → RestaurantManagementService.orders → JdbcTemplate (COUNT + IDs) → OrderRepository.findPageDetails (JPQL fetch graph) → OrderService.convertToOrderResponseDTO.

Điều kiện bắt buộc: o.restaurant_id = principal.restaurantId. Tìm q theo CAST(order_id AS CHAR) hoặc LOWER(customer.name) LIKE pattern ESCAPE '!'. Đây là tìm chuỗi chứa mã, không phải luôn tra ID bằng dấu bằng. ReadQuery escape !/%/_; q tối đa100. Tùy chọn OrderStatus, created_at>=from00:00 và <ngày sau to00:00. Sort allowlist: order_id DESC/ASC hoặc total_amount DESC,order_id DESC. Page0-based,0..10000,size1..50, UI size12; OFFSET=page*size.

COUNT(*) và SELECT order_id JOIN customers tại DB trước khi hydrate; không LIMIT trực tiếp collection fetch join. Sau đó tìm graph cho tập ID, map lại thứ tự ID. Graph đọc customers/carts/restaurants/order_details/menu/food_items/deliveries/payments/payment_methods. Không giới hạn kết quả bằng filter frontend.

Không kết quả: items=[],total=0 và EmptyState “Chưa có đơn phù hợp”. Bounds/date/sort/enum sai trả400; từ chối role khác ở backend. Test lịch sử orderListIsOwnerScopedFilteredAndSearchable kiểm total4 trong khi size2, tìm theo ID và sort giả trả400; test query graph có bound. A2 đối chiếu COUNT và thứ tự ID với cùng principal/filter/timezone, không chỉ nhìn một trang hoặc tên trên UI.

## R1 — Thống kê nhà hàng

RestaurantAnalyticsPage → restaurantApi.analytics → RestaurantManagementController.analytics → RestaurantManagementService.analytics → JdbcTemplate → MySQL. **Không có repository cho aggregate này**, không gán nhầm cho JPA.

Các nguồn và phép tính:

- Order cohort theo created_at: COUNT GROUP BY order_status, COUNT GROUP BY DATE(created_at). Mọi trạng thái gồm CANCELLED; đó là trạng thái hiện tại của đơn tạo trong kỳ, không số sự kiện chuyển trạng thái tại thời điểm kỳ.
- Tiền: Order COMPLETED JOIN Payment SUCCESS, paid_at trong kỳ, COUNT đơn và SUM(o.subtotal); SUM(shipping_fee) tách riêng. PaidFoodByDay GROUP BY DATE(paid_at). Không gọi giá trị món là lợi nhuận hoặc tiền thực nhận sau đối soát.
- Top10: JOIN detail→orders→payments→menu→food_items, GROUP BY menuId/name, SUM(quantity),SUM(detail.subtotal), order qty DESC,id; LIMIT10. Không cộng tổng Order qua JOIN detail gây nhân tiền.
- ActiveMenuCount là hiện tại; ratingsCount và AVG(score) là mọi thời gian. UI ghi rõ phạm vi, average null khi không có rating.

Ngày default30, tối đa93 inclusive, boundary nửa mở. Không cộng CANCELLED/REFUNDED/PENDING payment vào paid value. Không có ledger/refund workflow trong route này, nên không diễn giải SUM thành net revenue. Quan trọng: R1 không có hai predicate kiểm amount bằng tổng Order như R2; không tuyên bố hai định nghĩa hoàn toàn giống nhau. Dữ liệu lỗi tiền cần integrity check riêng.

Bằng chứng test aggregatesUseCompletePaidCompletedOrdersAndExcludeShipping:10 đơn/4 paid, food80000,ship60000; E2E lifecycle kiểm trước/sau COD. Đây là fixture/test cũ, không tổng dữ liệu live A1. A2 lấy danh sách raw order/payment đúng restaurant/kỳ, tính bằng Decimal độc lập, đối chiếu count/sum/ngày/top10 với JSON và UI; không chỉ lặp lại nguyên query aggregate.

## R2 — Báo cáo hoạt động ADMIN

AdminAnalyticsPage → ReportingPage/ReportBody → adminApi.analytics → AdminManagementController.analytics → AdminManagementService.analytics → JdbcTemplate. Role ADMIN; không có repository trung gian cho aggregate.

- Counts Customer/Restaurant/Driver/Account/Order mọi thời gian.
- Cohort Order theo created_at: COUNT/status/day, SUM(total_amount) của status khác CANCELLED gồm cả chưa thu.
- Tiền ghi nhận: COMPLETED + Payment SUCCESS + p.amount=o.total_amount + p.amount=o.subtotal+o.shipping_fee; paid_at trong kỳ. COUNT/SUM(subtotal)/SUM(shipping)/SUM(amount); daily GROUP BY DATE(paid_at). Loại CANCELLED/REFUNDED/PENDING, thiếu paidAt hoặc amount không khớp.
- Delivery cohort JOIN Order theo ngày tạo Order, COUNT GROUP BY delivery_status. Delivered/(Delivered+Cancelled)%, null khi mẫu số0. TopDriver theo delivered_time/DELIVERED; TopRestaurant theo created_at/count đơn; phương thức theo payments.created_at, phân biệt count và successfulCount.
- Default30 ngày, tối đa93 inclusive; timezone/businessToday từ backend, LocalDateTime không offset; không suy lịch sử chuyển trạng thái hoặc thu nhập tài xế.

Bằng chứng độc lập cũ tại phase8-2-load-boundary-20261111/logs/mysql-admin-reporting-proof.json: sourceOrderRows2417; oracle báo toàn bộ KPI/day/ranking/method khớp. Kỳ2026-10-13..2026-11-11, COMPLETED697, paid food22.517.000, shipping10.455.000,total32.972.000 VND. Các con số chỉ snapshot thử nghiệm, không báo cáo kinh doanh thật hoặc kết quả A1 live.

Tests AdminManagementMySqlTest có ngày ranh giới microsecond, phân trang, sai amount/cancel/refund/pending, null ratio; E2E admin date presets và report. A2 cần chạy lại trong DB demo được duyệt, lưu query/raw rows tối thiểu không secret và đối chiếu API/UI theo cùng kỳ; không sửa dữ liệu cũ để “đẹp số”.

## Sẵn sàng demo

Có đủ năm implementation, nhưng thiếu bộ nộp ERD/Data Diagram/3NF và runtime demo đang dừng. Không gọi A1 là nghiệm thu live. Ưu tiên Chromium đã có bằng chứng tốt; Safari/Windows WebKit và production infra thuộc Hướng B, không phải P0 BTL.

## Source anchors

- [frontend/src/app/router.tsx:247](<F:/New folder/food-delivery/frontend/src/app/router.tsx:247>) — `'restaurants/new'`.

- [frontend/src/features/admin-management/CreatePages.tsx:17](<F:/New folder/food-delivery/frontend/src/features/admin-management/CreatePages.tsx:17>) — `export function AdminCreateProfile`.

- [frontend/src/features/admin-management/model.ts:228](<F:/New folder/food-delivery/frontend/src/features/admin-management/model.ts:228>) — `export const createProfileSchema`.

- [frontend/src/features/admin-management/api.ts:55](<F:/New folder/food-delivery/frontend/src/features/admin-management/api.ts:55>) — `createProfile: async`.

- [src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59>) — `public Me createRestaurant`.

- [src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantRequestDTO.java:17](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantRequestDTO.java:17>) — `public class RestaurantRequestDTO`.

- [frontend/src/features/restaurant-management/MenuPages.tsx:23](<F:/New folder/food-delivery/frontend/src/features/restaurant-management/MenuPages.tsx:23>) — `export function MenuForm`.

- [frontend/src/features/restaurant-management/model.ts:21](<F:/New folder/food-delivery/frontend/src/features/restaurant-management/model.ts:21>) — `export const priceInput`.

- [frontend/src/features/restaurant-management/api.ts:81](<F:/New folder/food-delivery/frontend/src/features/restaurant-management/api.ts:81>) — `add: async`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantFoodItemService.java:57](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantFoodItemService.java:57>) — `public RestaurantFoodItemResponseDTO createRestaurantFoodItem`.

- [frontend/src/features/restaurant-management/OrderPages.tsx:28](<F:/New folder/food-delivery/frontend/src/features/restaurant-management/OrderPages.tsx:28>) — `export function RestaurantOrdersPage`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:56](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:56>) — `public PageResponse<OrderResponseDTO> orders`.

- [src/main/java/vn/gaugaugau/fooddelivery/repository/OrderRepository.java:30](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/repository/OrderRepository.java:30>) — `findPageDetails`.

- [frontend/src/features/restaurant-management/DashboardPages.tsx:36](<F:/New folder/food-delivery/frontend/src/features/restaurant-management/DashboardPages.tsx:36>) — `export function RestaurantAnalyticsPage`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:74](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:74>) — `public Analytics analytics`.

- [frontend/src/features/admin-management/DashboardPages.tsx:331](<F:/New folder/food-delivery/frontend/src/features/admin-management/DashboardPages.tsx:331>) — `export function AdminAnalyticsPage`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:90](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:90>) — `public Analytics analytics`.

- [src/main/java/vn/gaugaugau/fooddelivery/utils/GlobalExceptionHandler.java:66](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/utils/GlobalExceptionHandler.java:66>) — `handleDataConflict`.

- [src/main/java/vn/gaugaugau/fooddelivery/auth/security/AccessRules.java:21](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/security/AccessRules.java:21>) — `boolean profile`.

- [frontend/e2e/admin.spec.ts:186](<F:/New folder/food-delivery/frontend/e2e/admin.spec.ts:186>) — `admin creates Restaurant`.

- [frontend/e2e/restaurant.spec.ts:169](<F:/New folder/food-delivery/frontend/e2e/restaurant.spec.ts:169>) — `restaurant catalog add`.

- [src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantManagementMySqlTest.java:162](<F:/New folder/food-delivery/src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantManagementMySqlTest.java:162>) — `aggregatesUseCompletePaidCompletedOrders`.

- [src/test/java/vn/gaugaugau/fooddelivery/auth/AdminManagementMySqlTest.java:124](<F:/New folder/food-delivery/src/test/java/vn/gaugaugau/fooddelivery/auth/AdminManagementMySqlTest.java:124>) — `successfulMoneyRejects`.
