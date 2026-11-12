# A2.3 — Hoàn thiện checkout, lưu đơn MySQL và xuất Excel

Kết luận: **PASS trong phạm vi A2.3 đã kiểm chứng**, ngày 12/11/2026 (Asia/Saigon). Đã dừng backend/UI A2.3, giữ dữ liệu/log và phiên dùng thử A2.1. Chưa thực hiện A2.4, không commit/push/deploy.

## 1. Source đã kiểm tra

Đọc CheckoutPage/CheckoutForm/api/model và test; các trang/component/API/model/test giỏ hàng, lịch sử/chi tiết đơn; Restaurant OrderPages/api, Admin ListPages/api/model; OrderController/Service/Repository, DTO request/response, entity Order/OrderDetail/Cart/CartItem/Payment/PaymentMethod/Delivery; CartService, CartItemService, PaymentService, DeliveryService, AccessRules, SecurityConfiguration, GlobalExceptionHandler, StrictRequest, CustomerReadService/ReadQuery; các repository/controller liên quan và writer XLSX A2.1/A2.2. Inventory đường dẫn, số dòng và hash tại logs/source-inspection.json.

Đối chiếu docs/coursework-audit/A1-database-inventory.md, A1-forms-search-reports.md, docs/coursework/A2-1-result.md và A2-2-result.md. Bảng ánh xạ và thiếu sót được lập trong bản nháp báo cáo trước khi sửa.

## 2. Quy trình checkout thực tế

CUSTOMER chọn menu đang bán → giỏ cùng một nhà hàng → trang xác nhận đọc giỏ/địa chỉ hồ sơ/COD active → kiểm tra địa chỉ → preflight đọc lại giỏ, COD và 50 đơn mới nhất → yêu cầu xác nhận lại nếu fingerprint giá/phí/số lượng đổi → lưu dấu vết chống gửi lại → POST tạo đơn.

Backend kiểm quyền chủ Customer, khóa Customer và cart items, kiểm giỏ không rỗng, nhà hàng active, menu hợp lệ/cùng nhà hàng/đang bán/giá dương/số lượng dương. Server lấy giá hiện tại, dùng BigDecimal, tính subtotal và phí hiện có 15000 rồi total. Không nhận tổng tiền, restaurantId hay danh sách món trong checkout body; StrictRequest từ chối trường thừa.

Transaction tạo Order + OrderDetail + Payment PENDING, sau đó xóa cart items và bỏ restaurant của giỏ. Payment lỗi thì rollback cả transaction, giữ giỏ. Delivery chưa được tạo lúc checkout; tạo PENDING khi nhà hàng CONFIRMED. Luồng giao hàng/COD giữ nguyên.

Sau POST thành công, frontend GET lại đúng ID, xác minh ID và chủ sở hữu rồi mới thông báo/chuyển chi tiết. Dữ liệu hiển thị là response đọc từ backend. Lịch sử Customer, danh sách Restaurant và giám sát ADMIN đều đọc được đơn tương ứng.

## 3. Trường nhập và validation

| Nguồn | Trường | Frontend validation | DTO backend | Service | Entity/cột MySQL |
|---|---|---|---|---|---|
| Khách nhập | deliveryAddress | trim,1–255 ký tự | OrderRequestDTO NotBlank,Size255 | createOrder | Order.deliveryAddress → orders.delivery_address VARCHAR255 |
| Server cung cấp, khách chọn | paymentMethodId | số nguyên dương, COD active từ API | NotNull,Positive | PaymentService tồn tại/active | Payment.paymentMethod → payments.payment_method_id FK payment_methods.method_id |
| Giỏ phía server | customerId | phiên CUSTOMER | ID path, AccessRules own | khóa Customer, đọc Cart | orders.customer_id; carts.customer_id |
| Giỏ phía server | restaurantId | không gửi trong checkout body | không thuộc OrderRequestDTO | lấy từ Cart, kiểm nhà hàng active/cùng nhà hàng | orders.restaurant_id FK |
| Giỏ phía server | menu/quantity/note | quantity nguyên1..2147483647; giỏ không rỗng | CartItem DTO; checkout không nhận danh sách món | khóa cart items, kiểm menu đang bán, quantity>0, price>0 | order_details.restaurant_food_item_id/quantity/note |
| Server tính | unitPrice/subtotal | fingerprint phát hiện quote đổi; không gửi tổng tiền | StrictRequest từ chối trường thừa | BigDecimal giá menu hiện hành×quantity | order_details.unit_price/subtotal; orders.subtotal DECIMAL12,2 |
| Server tính | shippingFee/totalAmount | hiển thị quote server | không nhận từ client | phí hiện tại15000; subtotal+phí | orders.shipping_fee/total_amount DECIMAL12,2 |
| Server tạo | trạng thái, thời gian, Payment/Delivery | chỉ hiển thị DTO | response | PENDING; Payment PENDING lúc checkout; Delivery tạo khi CONFIRMED | orders/payment/deliveries |

Không bổ sung trường quận/phường hoặc thay địa chỉ hồ sơ khi nhập địa chỉ cho đơn. ID phương thức và mã menu có deserializer cục bộ chặn token thập phân; validation NotNull/Positive giữ nguyên. UI tiếp tục dùng thông báo tiếng Việt của validation/API client. Giá hiển thị lấy từ quote server; giá POST không được client tự khai.

## 4. Lỗi/thiếu sót được xác minh

1. Chưa có xuất Excel đơn hàng tại danh sách quản trị Restaurant/Admin.
2. Checkout-attempt chỉ nằm trong QueryClient: remount cùng bộ nhớ được bảo vệ, full reload làm mất trạng thái đang đối chiếu.
3. POST success chưa GET lại bản ghi trước khi chuyển trang/thông báo.
4. HTTP thực tế phát hiện `quantity: 1.5` được Jackson mặc định ép xuống Integer, API giỏ trả 201. Negative test mới tái hiện cả POST và PUT. Đây là lỗi đã sửa trong phạm vi giỏ/checkout.
5. Writer Excel mới cần ba cột tiền, giá trị 0 và trường tiền lịch sử NULL; writer menu cũ chỉ có một cột giá dương.

Không phát hiện bằng chứng cần sửa OrderService/PaymentService/DeliveryService, phí, transitions, isolation hay schema.

## 5. Thay đổi đã thực hiện

- Tái sử dụng form checkout; thêm GET theo ID sau POST, kiểm owner, giữ trạng thái chưa rõ nếu POST đã được chấp nhận nhưng GET lỗi.
- Lưu marker sessionStorage theo account: version, customerId, tối đa 50 baseline IDs và SHA-256 của tập thuộc tính khớp đơn. Không lưu địa chỉ, nội dung cart, password hoặc token dạng thô. Full reload khôi phục trạng thái khóa; nút kiểm tra chỉ GET. Marker còn chưa rõ được giữ cho cùng tài khoản để tránh replay; account khác không đọc nhầm marker.
- Dấu vết được ghi và đọc kiểm tra trước khi POST; lỗi lưu trữ thì chưa gửi đơn. Storage hỏng/không đọc được thì khóa an toàn. Chỉ gỡ khi có kết quả rõ hoặc đã xác minh đơn. Không tự retry POST.
- Chặn riêng token JSON số thập phân ở quantity bằng CartQuantityDeserializer tại hai DTO thêm/sửa cart; giữ cơ chế bind Integer, validation dương và miền số nguyên cũ. Không thay ObjectMapper toàn cục hoặc dependency. Bổ sung CheckoutIdDeserializer cục bộ cho OrderRequestDTO.paymentMethodId và CartItemRequestDTO.restaurantFoodItemId để chặn ID thập phân/overflow; giữ binding số nguyên cũ.
- Hai API GET xuất Excel; reuse validator/truy vấn đọc hiện có, streaming JDBC và RestaurantWorkbook. Mở rộng writer cho tập cột tiền, giữ nguyên constructor/hợp đồng A2.1/A2.2. Tiền lịch sử NULL xuất ô trống, không suy thành 0.
- Thêm nút Xuất Excel ở hai danh sách hiện hữu, giữ bộ lọc/sort, bỏ phân trang. Abort khi unmount/đổi bộ lọc, chặn kết quả phiên cũ và kiểm MIME trước tải.

## 6. Danh sách file thay đổi

- `docs/coursework/A2-3-result.md`
- `frontend/src/features/checkout/pending.test.ts`
- `frontend/src/features/checkout/pending.ts`
- `frontend/src/features/orders/OrderExport.tsx`
- `frontend/src/features/orders/order-export.test.ts`
- `src/main/java/vn/gaugaugau/fooddelivery/controller/OrderExcelController.java`
- `src/main/java/vn/gaugaugau/fooddelivery/model/dto/CartQuantityDeserializer.java`
- `src/main/java/vn/gaugaugau/fooddelivery/model/dto/CheckoutIdDeserializer.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/OrderExcelExportService.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbook.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/CheckoutPersistenceMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbookTest.java`
- `frontend/src/features/admin-management/ListPages.tsx`
- `frontend/src/features/admin-management/api.ts`
- `frontend/src/features/checkout/CheckoutPage.test.tsx`
- `frontend/src/features/checkout/CheckoutPage.tsx`
- `frontend/src/features/restaurant-management/OrderPages.tsx`
- `frontend/src/features/restaurant-management/api.ts`
- `src/main/java/vn/gaugaugau/fooddelivery/config/SecurityConfiguration.java`
- `src/main/java/vn/gaugaugau/fooddelivery/model/dto/CartItemRequestDTO.java`
- `src/main/java/vn/gaugaugau/fooddelivery/model/dto/CartItemUpdateRequestDTO.java`
- `src/main/java/vn/gaugaugau/fooddelivery/model/dto/OrderRequestDTO.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/ApprovedMySqlTestTarget.java`
- `src/test/java/vn/gaugaugau/fooddelivery/web/ApiBindingUnitTest.java`

26 file trong delta A2.3, gồm báo cáo. Không đổi pom.xml/package manifest/lock, entity/schema/migration, cấu hình datasource production, credential hoặc cơ chế JWT/refresh. SecurityConfiguration chỉ thêm matcher GET đúng role. Không xóa file/ghi đè thay đổi A1/A2.1/A2.2 có sẵn. Script/cấu hình/credential/log test giữ ngoài repo tại thư mục A2.3.

## 7. API và bảng MySQL liên quan

API dùng lại: GET `/cart/{customerId}`; POST `/{customerId}/cart-items`; PUT `/cart-items/{id}`; GET `/payment-methods`; POST `/customers/{customerId}/orders`; GET `/orders/{id}`; GET `/customers/{customerId}/orders/page`; GET `/restaurant-management/orders`; GET `/admin-management/orders`. Negative test xác minh ownership, StrictRequest, quantity và role.

Lifecycle được kiểm bằng PATCH `/orders/{id}/status`, PATCH `/orders/{id}/cancel`, POST `/deliveries/{id}/accept`, PUT `/deliveries/{id}/status`; đọc Payment/Delivery từ Order. Thống kê Restaurant/Admin và hai export A2.1/A2.2 cũng được gọi hồi quy.

API mới: GET `/restaurant-management/orders/export.xlsx`, GET `/admin-management/orders/export.xlsx`.

Bảng: orders, order_details, customers, restaurants, restaurant_food_items, food_items, carts, cart_items, payments, payment_methods, deliveries; accounts/auth_sessions/refresh_tokens phục vụ xác thực fixture. Không thay cấu trúc bảng. User app chỉ SELECT/INSERT/UPDATE/DELETE trong DB A2.3 mới.

## 8. Phân quyền xuất Excel

RESTAURANT: restaurantId lấy từ principal, không nhận scope từ client; chỉ xuất đơn nhà hàng mình. Chỉ nhận q/status/from/to/sort, sort newest/oldest/total-desc theo API danh sách.

ADMIN: theo quyền quản trị hiện có, nhận q/status/paymentStatus/restaurantId/customerId/from/to/sort (newest/oldest). Tái dùng validator admin. Hai endpoint từ chối page/size và tham số ngoài whitelist trước ghi file.

CUSTOMER/DRIVER không có export quản trị: 403. Chưa đăng nhập: 401. RESTAURANT không dùng endpoint ADMIN và ngược lại. Kiểm quyền cả HTTP security lẫn method security. CUSTOMER vẫn dùng lịch sử/chi tiết có kiểm owner; chưa bổ sung export cho CUSTOMER.

## 9. Sheet/cột và phạm vi Excel

Tên tải **DanhSachDonHang.xlsx**, sheet “Đơn hàng 1” (tự chia sheet khi đạt giới hạn hàng Excel). **Một dòng mỗi đơn**, không JOIN order_details trong export nên không nhân đôi tổng tiền khi một đơn có nhiều món. Không xuất chi tiết từng món ở lượt này.

11 cột: Mã đơn hàng; Ngày đặt (giờ máy chủ); Mã nhà hàng; Nhà hàng; Mã khách hàng; Trạng thái đơn; Tạm tính (VND); Phí giao hàng (VND); Tổng tiền (VND); Thanh toán; Giao hàng.

Ba cột tiền là numeric, định dạng `#,##0.00" ₫"`; ID giữ text tránh mất độ chính xác. Datetime dùng giá trị LocalDateTime DB/backend và format dd/MM/yyyy HH:mm:ss, không tự gán/chuyển UTC. Bộ lọc ngày bao gồm ngày kết thúc bằng cận `< ngày tiếp theo`. Trạng thái tiếng Việt; delivery chưa tạo được ghi rõ, không giả trạng thái.

Xuất toàn bộ kết quả theo bộ lọc đang áp dụng, bao gồm các trang khác; UI ghi rõ phạm vi. JDBC forward-only fetchSize Integer.MIN_VALUE, ghi ZIP/XML từng dòng; không gom toàn tập vào bộ nhớ. Giá trị text là inlineStr, không có công thức/hyperlink; tên nhà hàng fixture `=SUM(1,2)...` được giữ nguyên như text.

Không xuất địa chỉ, email, phone, ghi chú khách, password/hash/token. Có header/freeze/filter, UTF-8 tiếng Việt, MIME XLSX/filename cố định/no-store/nosniff. File rỗng vẫn có header hợp lệ.

## 10. Kết quả test checkout

Kết quả cuối trên source đã sửa:

- **JUnit 126 PASS / 0 FAIL / 0 ERROR / 0 SKIPPED**, 15 suite được chọn, Maven package thành công. Gồm CheckoutPersistenceMySqlTest 14 test (8 hồi quy menu/A2.1 + 6 test checkout/export), RestaurantManagementMySqlTest 7, AdminManagementMySqlTest 13 và 92 test còn lại.
- **Frontend 340 PASS / 0 FAIL / 0 SKIPPED**; typecheck, lint, format check, Vite build exit0.
- **244 HTTP request đạt status kỳ vọng**: batch chính224 (đã tính hai request race) và20 request kiểm tra ID sau bổ sung guard cuối. Các negative status là thành công của phép thử. Browser phát sinh thêm request riêng, không cộng lẫn vào 244.
- **Chromium 4/4 kịch bản PASS**: địa chỉ/đúp-click/tạo-đọc-history; commit thật rồi mất response, chặn GET đối chiếu, full reload và chỉ đọc lại tìm đúng đơn; giá thay đổi yêu cầu xác nhận lần hai; nút export Restaurant/Admin tải đúng tên file.
- Kiểm tra render desktop/mobile390px PASS, không tràn ngang. Lượt chụp cuối chuẩn bị một cart fixture chưa submit, không tạo thêm đơn.

Request qty 0/-1/1.5/1.0/overflow bị 400 ở cả thêm và sửa cart; integer hợp lệ vẫn chạy. Kiểm tra địa chỉ rỗng/quá255, payment ID sai/không tồn tại, body giả total/restaurant/customer, giỏ lẫn nhà hàng, món ngừng bán, sai chủ và sai role. Unit/integration còn kiểm nhà hàng inactive, payment rollback, CAS/menu và quan hệ.

Lượt HTTP đầu tái hiện qty1.5 trả201 được giữ bằng chứng trong logs/http-before-quantity-fix.json. Lượt test trung gian còn phát hiện cách setter thông thường chưa chặn được coercion; negative test giữ nguyên và chỉ PASS sau deserializer cục bộ. Một build sandbox bị chặn đọc Maven cache đã được chạy lại với quyền được duyệt. Kết quả cuối ở junit-summary.json/frontend-unit.json; không vô hiệu hóa test.

## 11. Đối chiếu MySQL

Batch HTTP: 17 đơn của Customer/Restaurant chính, 1 đơn nhà hàng khác. Đơn #386 có hai dòng chi tiết, subtotal78002.00 + shipping15000.00 = total93002.00, Payment bằng total. Sau luồng đầy đủ: Order COMPLETED, Payment SUCCESS, Delivery DELIVERED. Đơn hủy có payment CANCELLED. Lúc checkout mới, Payment PENDING và chưa có Delivery; Delivery chỉ tạo ở CONFIRMED.

Payment không tồn tại: số Order/OrderDetail/Payment trước–sau không đổi, cart vẫn còn món. Kiểm orphan cho OrderDetail/Payment/Delivery đều 0. Đổi giá menu không đổi unit_price/subtotal chi tiết lịch sử. Hai checkout đồng thời cho cùng cart: **201/409, một Order và một Payment**. Gửi lại sau giỏ đã checkout trả409.

Sau guard ID cuối,20 HTTP request bổ sung xác minh ID sai không tạo đơn/đổi giỏ, còn ID nguyên hợp lệ tạo và GET lại đơn #503, giỏ được xóa đúng.

Browser tạo đúng ba đơn riêng #404/#405/#406; đơn mất response địa chỉ fixture24 Hà Nội có đúng1 bản ghi. Không replay POST sau refresh. Customer thấy lịch sử, Restaurant thấy danh sách own và ADMIN thấy đơn theo quyền. Truy cập detail của Customer/Restaurant khác bị404.

## 12. Kiểm tra Excel và so MySQL

Tại batch HTTP: Restaurant export17 dòng (vượt page12), ADMIN18 dòng, rỗng0, lọc COMPLETED/ngày12-11 có1 dòng. Toàn bộ 11 ô mỗi dòng so với SELECT độc lập: ID, tên nhà hàng, timestamp, ba Decimal tiền và trạng thái đều khớp; tổng tiền đúng subtotal+shipping. Đơn nhiều món vẫn chỉ một dòng.

Sau ba đơn browser, hai file tải từ nút UI được so lại toàn bộ với SQL tại thời điểm tải: Restaurant20 dòng, ADMIN21 dòng. Các file HTTP trước đó là snapshot được giữ nguyên, không ghi đè bằng dữ liệu thời điểm sau. Đơn #503 được tạo ở lượt xác minh ID sau các snapshot này; trạng thái cuối nhà hàng fixture có21 đơn. Browser/export đã kiểm trên v2; guard binding cuối kiểm bằng126 JUnit và20 HTTP trên JAR v3. Frontend, writer checkout và source export giữ nguyên giữa hai build.

**Microsoft Excel 12.0: 6/6 file mở read-only thành công**, FileFormat51; Unicode/header/ba cột tiền numeric/VND hợp lệ, không ô công thức hoặc hyperlink; SHA trước–sau giống nhau. Gồm 4 file đơn (full Restaurant/full Admin/rỗng/lọc) và 2 file hồi quy A2.1/A2.2. Hai file download UI thêm được kiểm ZIP/XML và SQL, không tính thành lượt native Excel mới.

Windows chặn thực thi script mặc định; đã chạy đúng script kiểm tra trong một tiến trình Bypass được phê duyệt, không thay execution policy lưu trên máy, không sửa workbook và đã đóng instance Excel kiểm thử.

## 13. Regression A2.1/A2.2 và nghiệp vụ hiện có

Test A2.1 tạo/read/export Account+Restaurant và rollback chạy trong A2.3; export nhà hàng9 cột và Microsoft Excel PASS. Test A2.2 tạo menu, unique/race, ownership, thay giá giữ snapshot, export7 cột và Microsoft Excel PASS. Constructors workbook cũ và giá menu dương giữ nguyên, có test hồi quy.

Giỏ, checkout, phân quyền, quản lý đơn, cancellation, giao hàng/COD và hai analytics đã được gọi thực tế. Không thay writer Order/Payment/Delivery hoặc thống kê. Không thay artifact đang phục vụ A2.1: JAR và toàn bộ frontend/dist có SHA đúng baseline, build A2.3 nằm riêng.

## 14. Môi trường, database và checksum

MySQL8.0.46 binary hiện có, instance/datadir riêng tại `F:/New folder/food-delivery-mysql-test/data`, 127.0.0.1:3307. DB mới **fooddelivery_coursework_a23**, schema-only16 bảng và fixture mới, appuser giới hạn. Sau khởi tạo dùng **ddl-auto=validate**, open-in-view=false. Không cần restart MySQL đang chạy. Java25.0.4/Maven3.9.16/Node24.20.0; backend18082/management19092/UI4175. Proxy read-only request ID xác minh tới backend A2.3 trước ghi và kiểm lại sau thay JAR sửa qty.

CHECKSUM TABLE và hash SHOW CREATE của **14 schema/221 bảng cũ khớp baseline**; thêm **16 bảng A2.2 giữ nguyên** (tổng237 bảng bảo vệ trong phép so cuối). Không ghi DB A2.1; do người dùng đang dùng thử A2.1, không tuyên bố dữ liệu đó bất biến trước thao tác của chính người dùng.

Đã xác minh PID/command line rồi dừng riêng backend cuối14520 (backend9816 đã dừng trước lượt bổ sung) và frontend34928; cổng18082/19092/4175 đóng. MySQL test3307 và A2.1 18080/19090/4173 vẫn mở. MySQL80 vẫn Running; không ghi/kết nối DDL ở3306, không sửa/dừng/restart dịch vụ đó. Dữ liệu/log A2.3 được giữ lại; không sửa/xóa đơn lịch sử cũ.

Bằng chứng: logs/source-baseline.json, source-inspection.json, setup-proof.json, proxy-v2-proof.json, junit-summary.json, frontend-unit.json, frontend-gates.json, http-proof.json/http-progress.json, reference-binding-http-proof.json/reference-binding-http-progress.json, browser-proof.json, visual-final-proof.json, excel-native-proof.json, final-database-proof.json, shutdown-proof.json, verified-source.json, secret-scan-proof.json. Ảnh: checkout-confirm-final.png, checkout-mobile-final.png, checkout-result.png, checkout-reload-recovery.png và restaurant-order-export.png trong logs.

Thư mục bằng chứng: [coursework-a23-20261112](<../../../food-delivery-mysql-test/coursework-a23-20261112/>). Credential/config test giữ riêng ngoài repo và không đưa giá trị vào báo cáo. HEAD0315de8566d299472b28b2f10bb50326c7d6b9aa được bảo toàn.

## 15. Hạn chế chưa kiểm chứng

- Chỉ chạy 15 suite backend theo phạm vi và 47 suite frontend; các suite opt-in lịch sử khác không được chạy lại. Không thử ghi production/MySQL80, không chạy ma trận Firefox/WebKit hoặc load test mới.
- Chống trùng đã kiểm cho cùng cart, double-click, mất response/commit và full reload có sessionStorage. Chưa cung cấp idempotency key server; xóa/tamper storage, refill cart rồi gửi client tùy chỉnh không có cam kết exactly-once toàn cục. Không thêm unique constraint/schema.
- Reconciliation chỉ xem50 đơn mới nhất; có0 hoặc nhiều kết quả phù hợp thì tiếp tục khóa và yêu cầu xem lịch sử, không chọn bừa/POST lại. Đổi địa chỉ hoặc tên catalog trước đối chiếu có thể khiến không tự khớp. Marker dùng hash và IDs, không phải credential; trình duyệt phải hỗ trợ WebCrypto/sessionStorage.
- Preflight giá có một khoảng thời gian trước server xử lý. Server vẫn lấy giá hiện hành theo nghiệp vụ cũ; không triển khai khóa giá/conditional checkout. Khi đã có response thành công, GET đúng ID dùng số tiền thực tế từ server.
- Streaming được kiểm bằng nhiều trang và source; chưa benchmark hàng triệu đơn. Native Excel là bản12.0 trên máy hiện tại, chưa thử mọi phiên bản Excel/LibreOffice.
- UI A2.1 đang dùng build cũ được giữ nguyên. A2.3 đã dừng; không tự thay/deploy bản mới vào phiên đang dùng.

## 16. Kết luận

**PASS A2.3** cho luồng được yêu cầu và môi trường được phê duyệt: CUSTOMER → cart → checkout → MySQL/rollback/chống trùng → GET theo ID/history → quản lý Restaurant/Admin → Excel theo bộ lọc/quyền. Các giới hạn được nêu ở mục15; không có blocker còn biết trong phạm vi đã kiểm chứng. Dừng sau A2.3 và chờ phê duyệt A2.4.
