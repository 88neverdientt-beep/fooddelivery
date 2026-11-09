# Giai đoạn 4 — Hợp đồng API Customer

Đối chiếu Controller, Service, DTO, entity, enum, security và test thực tế ngày 09/11/2026. Sáu GET bổ sung đã được người dùng phê duyệt để phục vụ frontend Customer; không đổi request/response của 55 route cũ, schema, dependency, transaction checkout, công thức tiền hoặc transition trạng thái. Kết quả nghiệm thu thực tế được ghi riêng trong phase4-test-results.md.

## Transport và identity

Browser gọi `/api/*`; Vite bỏ `/api` ở upstream. Phần dưới ghi đường dẫn backend. Ngoại trừ GET /auth/csrf (body trực tiếp) và auth 204, response dùng ApiResponse; frontend lấy `data`, kiểm tra Zod và không render message SQL/stack tùy ý.

Account và customerId chỉ lấy từ /auth/me qua AuthProvider sau JWT/session verification. Các ID trong URL API cũ là tham chiếu tài nguyên được backend kiểm tra ownership, không phải nguồn cấp quyền. Access token trong memory, business mutation dùng Bearer; hợp đồng CSRF hiện tại yêu cầu cookie/token cho unsafe /auth/* và POST /customers. Không mở rộng miễn trừ hoặc tắt Spring Security. Không retry POST/PUT/PATCH/DELETE tự động. Các GET riêng tư có query key chứa accountId; đổi identity/logout hủy và xóa cache.

## Sáu GET bổ sung được phê duyệt

Mọi page trả `data={items,page,size,totalElements,totalPages}`; page bắt đầu 0, tối đa 10000, size 1..50, mặc định 12. Giá trị ngoài giới hạn trả 400; không clamp để che request sai. Phân trang/thống kê chạy tại SQL. Không dùng tải toàn bộ rồi cắt mảng. Sort chỉ nhận allowlist, có ID làm tie-break ổn định.

1. **GET /payment-methods** — CUSTOMER có JWT, 401 anonymous/403 role khác. Trả mảng `{paymentMethodId,paymentMethodName,paymentMethodCode}` từ bản ghi đang active, code đúng `COD`; code UNIQUE nên tối đa một kết quả. Không hardcode method ID hoặc giả phương thức online đã được hỗ trợ. Mảng rỗng vô hiệu hóa checkout và báo không có phương thức khả dụng.
2. **GET /restaurants/search** — public. Query `q` tìm literal không phân biệt hoa/thường trên name/address, `active` optional boolean, `sort=name|name-desc`, `page`, `size`. q được strip, tối đa 100 UTF-16 code units. `%`, `_`, `!` là nội dung tìm kiếm bình thường nhờ escaping `!`, không trở thành wildcard SQL. Items PublicRestaurant `{restaurantId,name,address,restaurantStatus}`.
3. **GET /restaurants/{restaurantId}/menu** — public; 404 nhà hàng không tồn tại. Query `q` trên tên/mô tả món (tối đa100), `category` đối chiếu nhãn trimmed không phân biệt hoa/thường (tối đa150 theo cột FoodItem.category), `available` optional boolean, `sort=name|price-asc|price-desc`, `page`, `size`. WHERE restaurantId ở SQL; items theo RestaurantFoodItemResponseDTO hiện có, không có contact riêng tư. Fetch join chỉ to-one; không collection pagination.
4. **GET /food-categories** — public. DISTINCT TRIM(category), bỏ null/trống tại SQL, sắp xếp nhãn và phân trang. Items là string, không tải toàn bộ FoodItem để suy ra nhãn.
5. **GET /customers/{customerId}/orders/page** — CUSTOMER sở hữu hoặc ADMIN theo chính sách đọc đơn hiện có. Query `status` optional theo enum OrderStatus, `page`, `size`; mới nhất theo orderId DESC. Bị 404 khi CUSTOMER dùng ID hồ sơ khác. SQL page IDs trước, sau đó fetch graph tối đa size đơn để map đủ quan hệ trong readonly transaction; không collection-fetch pagination hoặc N+1 theo số đơn.
6. **GET /restaurants/{restaurantId}/ratings/page** — public khi `mine=false` mặc định. `mine=true` bắt buộc CUSTOMER: anonymous401, role khác403, customerId lấy từ principal/database; query customerId tự khai không có tác dụng. Query page/size; mới nhất theo ratingId DESC. Response RatingResponseDTO hiện có; customerOutputDTO giữ customerId để xác định ownership, name luôn `Customer`, không lộ tên/email/phone riêng.

Các list cũ GET /restaurants, /food-items, /restaurant-food-items, /customers/{id}/orders và /restaurants/{id}/ratings vẫn giữ collection contract cho tương thích và kiểm thử hồi quy. Frontend Customer mới sử dụng các GET có giới hạn tương ứng. Đây là giới hạn rõ của client/API cũ, không phải server search giả.

## Restaurant, FoodItem và menu chi tiết

- GET /restaurants/{id}: PublicRestaurant; không email, password, phone hoặc KPI giả.
- GET /restaurant-food-items/{id}: `{restaurantFoodItemId,price,isAvailable,restaurant:{restaurantId,name,address,phoneNumber:null},foodItem:{itemId,name,category,description}}`.
- GET /food-items/{itemId}: `{itemId,name,category,description}`; đây là danh mục món gốc, không phải giá bán của nhà hàng. Giá bán quyết định ở RestaurantFoodItem.
- Hiện không có trường ảnh backend. Ảnh local phải có nhãn minh họa; không gán ảnh đó thành sản phẩm thực tế của một nhà hàng. Không có topping, size hoặc GPS API.

## Cart và CartItem

- **GET /cart/{customerId}**: CUSTOMER sở hữu; `{cartId?,restaurant:{restaurantId,name}|null,cartItems,totalItems,subtotal,shippingFee,totalAmount}`. Giỏ chưa được tạo trả items rỗng, tổng0, không nhất thiết có cartId. `totalItems` là số dòng món, không phải tổng các quantity.
- CartItem `{cartItemId,restaurantFoodItemId,foodItemName,quantity,note,unitPrice,subtotal}`. Giá và subtotal lấy giá menu hiện tại ở server. shippingFee/totalAmount đã được CartService trả về; frontend không cần quote endpoint hoặc tự hardcode phí15000.
- **POST /{customerId}/cart-items**: `{restaurantFoodItemId,quantity,note?}`, 201 CartItem. quantity integer1..2147483647, tổng lượng món trùng không được tràn Integer.MAX_VALUE. note tối đa255. Server kiểm tra nhà hàng active, món available và cùng nhà hàng. Thêm món trùng tăng quantity; một giỏ chỉ một nhà hàng; khác nhà hàng trả400, không tự xóa giỏ.
- **PUT /cart-items/{id}**: `{quantity,note?}`, 200 CartItem. quantity là giá trị thay thế, phải dương; ID món/giá không thuộc payload.
- **DELETE /cart-items/{id}**: 200 string. Xóa dòng cuối làm restaurant của giỏ thành null. Ownership service trả404 cho món của khách khác.

Ghi note trống/null không xóa note cũ theo logic hiện tại; UI không giả chức năng xóa ghi chú. Mutation cần tuần tự/khóa điều khiển để response cũ không ghi đè mới; invalidate và refetch cart, không optimistic tiền. StrictRequest từ chối field lạ như price/role/accountId.

## Checkout và Payment

- **POST /customers/{customerId}/orders**: `{deliveryAddress,paymentMethodId}`, trả201 OrderResponseDTO. deliveryAddress không blank, tối đa255; ID phương thức phải dương và bản ghi active. Không có idempotency-key contract. Không gửi subtotal, shippingFee, totalAmount, giá món hoặc userId tự khai.
- Backend lock Customer/CartItem, kiểm tra giỏ không rỗng, nhà hàng active, mỗi món thuộc nhà hàng, còn bán, quantity dương, giá hiện tại dương. Sao chép đơn giá/subtotal vào OrderDetail, cộng shipping fee15000 ở server. Lưu Order(PENDING), details và Payment(PENDING) trong cùng transaction; chỉ xóa items giỏ sau payment thành công. Lỗi rollback giữ giỏ và không để đơn/payment dở dang.
- Frontend hiển thị tổng cart server trước xác nhận, disable submit và không replay POST khi lỗi mạng/timeout/401. Kết quả chưa rõ phải đối chiếu đơn mới và cart từ server, không báo chắc chắn thất bại hoặc cho submit lại mù. Backend customer lock + giỏ trống cũng bảo vệ hai checkout đồng thời, nhưng frontend không tự bịa idempotency key.
- **GET /payments/orders/{orderId}**: actor được quyền xem đơn, trả `{paymentId,paymentMethod,paymentStatus,amount,paidAt,refundedAt}`. paymentMethod là code, timestamps có thể null. Không có API Customer tự xác nhận SUCCESS.

## Order và lịch sử

- **GET /orders/{orderId}**: CUSTOMER chủ đơn, RESTAURANT chủ nhà hàng, DRIVER được gán, ADMIN. Ngoài ownership trả404. Response: `{orderId,deliveryAddress,subtotal,shippingFee,totalAmount,orderStatus,createdAt,customer:{customerId,name},restaurant:{restaurantId,name},orderDetails,deliveryOutputDTO,paymentResponseDTO}`.
- OrderDetail `{orderDetailId,foodItemName,quantity,unitPrice,subtotalItem,note}`. Delivery có thể null khi đơn chưa được xác nhận; `{deliveryId,deliveryStatus,pickupTime,deliveredTime}` khi có. Payment độc lập như trên.
- **PUT /orders/{id}/delivery-address**: CUSTOMER sở hữu; `{deliveryAddress}` không blank/max255; chỉ PENDING hoặc CONFIRMED. Trạng thái khác409.
- **PATCH /orders/{id}/cancel**: CUSTOMER sở hữu hoặc RESTAURANT của đơn, không body. Chỉ PENDING/CONFIRMED; Delivery nếu có phải PENDING; Payment PENDING chuyển CANCELLED. Payment SUCCESS từ chối do chưa có refund online. Order/Delivery/Payment hủy cùng transaction; không hiển thị nút hủy ngoài điều kiện.

OrderStatus: PENDING → CONFIRMED → PREPARING → READY → DELIVERING → COMPLETED; CANCELLED là nhánh hủy cho phép. Restaurant chỉ chuyển PENDING→CONFIRMED→PREPARING→READY; không có timestamp xác nhận/chuẩn bị/ready để frontend tự tạo. Chỉ tạo timeline trạng thái từ enum thực tế, mốc thời gian chỉ dùng createdAt/pickupTime/deliveredTime/paidAt có thật.

## Luồng Restaurant/Driver hợp lệ dùng cho E2E

Đây là API test dưới principal riêng, không thêm quyền hoặc dashboard cho CUSTOMER:

1. Restaurant `PATCH /orders/{id}/status` body JSON string `"CONFIRMED"` (tự tạo Delivery PENDING), rồi `"PREPARING"`, `"READY"`.
2. Driver GET /deliveries/available hoặc lấy deliveryId qua GET /orders/{id} khi đã được gán. Accept `POST /deliveries/{deliveryId}/accept` body `{driverId}` từ principal DRIVER, không giả ID của người khác. Được nhận khi order CONFIRMED/PREPARING/READY; một driver duy nhất, status vẫn PENDING.
3. Assigned Driver `PUT /deliveries/{id}/status` lần lượt JSON string `"PICKED_UP"`, `"DELIVERING"`, `"DELIVERED"`.
4. PICKED_UP chỉ khi order READY, lưu pickupTime. DELIVERING chuyển order DELIVERING. DELIVERED tự xác nhận COD/PaidAt, yêu cầu payment SUCCESS đúng amount, lưu deliveredTime và order COMPLETED atomically. Không có mốc OrderStatus DELIVERED hoặc RESTAURANT tự đặt COMPLETED.

DeliveryStatus độc lập PENDING→PICKED_UP→DELIVERING→DELIVERED (hoặc CANCELLED). PaymentStatus độc lập PENDING/SUCCESS/CANCELLED/REFUNDED. Customer không gọi transition API hoặc COD confirm.

## Rating

- **POST /restaurants/{restaurantId}/ratings**: `{customerId,ratingScore,comment?}`, 201 RatingResponseDTO. customerId bắt buộc trong legacy contract nhưng frontend chỉ lấy từ verified Account, backend profile-check. Score integer1..5. Phải có ít nhất một Order COMPLETED ở đúng nhà hàng; nếu chưa có trả400.
- Backend cho phép nhiều đánh giá sau điều kiện trên, không có quy tắc một đánh giá mỗi đơn hoặc mỗi nhà hàng, không có orderId trong Rating. UI không tự đặt quy tắc khác.
- **PUT /ratings/{ratingId}/customers/{customerId}**: `{ratingScore,comment?}`, chỉ CUSTOMER chủ đánh giá; body không cho đổi owner. **DELETE** cùng path: CUSTOMER chủ hoặc ADMIN. Customer ngoài scope trả404 qua AccessRules.
- Comment nullable, DTO không có @Size; cột MySQL TEXT giới hạn bộ nhớ mã hóa. Phải escape bằng React text, không dangerouslySetInnerHTML; không invent maxlength255. createdAt server tự lưu, không có updatedAt.
- Public GET average trả double thật, 0.0 khi chưa có. Có thể hiển thị “Chưa có đánh giá” khi totalElements0, không diễn giải0 thành rating0 sao giả.

## Customer profile

GET /customers/{id} và PUT cùng path cho CUSTOMER chủ hoặc ADMIN. PUT chỉ `{name,phoneNumber,address}`: name nonblank/max100, phone nonblank/max15, address nonblank/max255. Không sửa email, accountId, customerId, role, status, password hoặc hash. Response `{customerId,name,email,phoneNumber,address,createdAt}`. Account /auth/me không có display name; cập nhật profile query rồi xác minh phiên/giữ Account server, không tự chép role/ID từ form vào AuthProvider. Không có sổ địa chỉ nhiều mục; chỉ dùng địa chỉ profile để điền nhanh checkout và địa chỉ mỗi đơn theo API.

## Kiểm thử và an toàn database

CustomerReadMySqlIntegrationTest dùng MySQL thật stage4_e2e/3307, validate, OSIV tắt, JWT/filter chain thật, fixture transaction rollback và query-count assertions. SecurityMySqlIntegrationTest inventory tăng từ45 lên51 business routes, cộng10 Auth/Admin=61; giữ ma trận sáu actor và checksum cho denied requests. Sáu ReadQuery unit tests kiểm tra pagination/sort/literal wildcards/envelope. Không tính SKIPPED là PASS.

Regression tests được retarget bằng FOOD_TEST_DB_NAME exact allowlist rehearsal hoặc stage4_e2e, port3307/datadir riêng được kiểm tra trước mutation. Lượt Giai đoạn4 chọn stage4_e2e; app chỉ DML trong DB mới, migrator riêng chỉ dùng negative routine tests ở DB mới. Manual migration SQL gốc không đổi; test chỉ thay literal tên target trong bản routine cục bộ đã whitelist. AuthPreflightMySqlTest vẫn chỉ đọc fixture Stage1, giữ nguyên88 hash lỗi. Không truy cập ghi3306/fooddelivery hoặc reset rehearsal.
