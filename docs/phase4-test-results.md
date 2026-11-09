# Kiểm thử nghiệm thu Giai đoạn 4

Ngày 09/11/2026. Lượt nghiệm thu cuối: **119 backend JUnit, 200 frontend unit/component/API integration, 24 Playwright E2E PASS; 0 FAIL/ERROR/SKIPPED**. Không retry test để che flaky. Source/config/evidence được giữ lại, không coi screenshot thay cho xác minh nghiệp vụ.

## Môi trường và cách ly

Java25.0.4 từ IntelliJ, Maven3.9.16 cache; Node24.20.0/npm11.19.0. MySQL8.0.46 binary hiện có, --no-defaults, bind127.0.0.1:3307, datadir riêng food-delivery-mysql-test/data. Database mới fooddelivery_stage4_e2e được tạo từ bản sao nhất quán chỉ đọc schema/dữ liệu rehearsal; không reset rehearsal. Runtime stage4_app chỉ SELECT/INSERT/UPDATE/DELETE trên Stage4; stage4_migrator chỉ có quyền trong Stage4 cho negative migration regression. Backend18080 và frontend production preview localhost4173, Hibernate validate/OSIVfalse. Không viết3306 hoặc database fooddelivery.

Các test cũ được cấu hình target tường minh bằng FOOD_TEST_DB_NAME/USERNAME/MIGRATOR, chỉ whitelist rehearsal hoặc stage4 tại3307/datadir đã duyệt. Assertion seed, constraint, rollback và nghiệp vụ không bị bỏ. Preflight88hash Stage1 vẫn chỉ đọc. Source manual migration không thay đổi; helper routine negative test chỉ được tạo/gỡ trong database Stage4.

## Backend:119/119

104 test hồi quy Giai đoạn1/2 giữ nguyên phạm vi:60 business regression và44 auth/persistence/migration/security/limiter. Thêm6 ReadQuery unit và9 integration MySQL cho sáu GET mới. Kiểm tra page/size/sort/filter, literal LIKE, category, active COD, owner/mine, privacy public DTO, enum, LAZY/OSIVfalse và số query khi tăng kích thước trang đơn. Inventory61endpoint, ma trận sáu actor tương ứng366tổ hợp trong hai test security hiện có. Những kiểm thử deny so sánh trạng thái không bị thay đổi; không dùng @WithMockUser hoặc tắt filter.

Lệnh thực tế: Maven offline package với JDK25, env test trỏ Stage4. BUILD SUCCESS,119tests/0failures/0errors/0skipped. Bằng chứng `backend-all-tests.log`, `backend-junit-summary.json`, artifact SHA256 ở `artifact-sha256.txt`.

## Frontend:200/200

23file test, gồm58 test nền tảng đã có và142 test mới. Bao phủ restaurant query/filter/ID/URL serialization và RestaurantCard; RestaurantDetail/FoodCard/FoodDetail; quantity min/max Int, cart item/summary/money server; API payload/identity; checkout/address/quote-change/COD; hai click chỉ một POST; timeout không repost, đối chiếu và remount; order mapping/timeline/filter/cancel/address; rating score/UTF8/eligibility/ownership; hồ sơ name/phone/address; safe login return path; network/API errors.

Các regression mutation chậm chứng minh logout không ghi lại private cache hoặc báo thành công, đổi route không ghi response đơn17 sang đơn18. Mock chỉ nằm trong unit/component/API integration, không nằm trong runtime. Log `frontend-unit.log`, JSON `frontend-unit.json`.

TypeScript strict, ESLint max-warnings0, Prettier check và production build đều exit0. JS entry457,082bytes, không chunk>500,000bytes, không tăng threshold/manualChunks. Package/dependency lock không đổi.

## Playwright:24/24 với backend thật

Một lượt đầy đủ cuối khoảng202giây, Chromium, workers1, retry0, skipped0:

-16 hồi quy UI/auth trước đó: catalog/menu, register/login, Secure/HttpOnly/SameSite cookie, CSRF, reload/session, JWT revocation, bốn role, role denial frontend/backend, password change, logout-all, hai tab refresh rotation,403/404/empty/network retry, bốn breakpoint, local assets/chunk/contrast/sticky/reduced motion.
-8 Giai đoạn4: lifecycle Customer đầy đủ; ownership/tamper giữa hai khách; availability/giỏ một nhà hàng/guest return; cố ý làm mất response sau checkout thực sự201; bốn ca responsive Customer.

Luồng chính đã thực hiện thật: tìm nhà hàng→menu→food→add→tăng/giảm→xóa→thêm lại→checkout COD→ID đơn thật→đổi địa chỉ PENDING→reload→hủy hợp lệ→đặt đơn mới→CONFIRMED→đổi địa chỉ hợp lệ→PREPARING/READY→từ chối hủy/đổi địa chỉ→driver accept/PICKED_UP/DELIVERING/DELIVERED→Order COMPLETED/Payment SUCCESS→review create/update/delete→profile save/reload→logout→đăng nhập khách khác không thấy dữ liệu cũ. Transition Restaurant/Driver dùng API với đúng JWT role, không cập nhật SQL trạng thái.

Double-click đồng bộ tạo đúng một POST cho mỗi thao tác đặt đơn. Fault test forward POST thật tới backend nhận201 rồi chặn response, tạm chặn GET đối chiếu: UI khóa submit, server có đúng một đơn, cart đã trống; mở lại GET và bấm kiểm tra thì tìm đúng ID, reload vẫn thấy đơn. Không automatic retry POST.

Security kiểm chứng10 request ownership bị từ chối, không đổi cart/order B; giả unitPrice/totalAmount/accountId bị400; login thiếu CSRF bị403; mine=true không nhận customerId giả; thay URL đơn khác không lộ địa chỉ; review chứa markup được render text, không tạo img/chạy onerror; browser storage không chứa credential/token. `phase4-customer-server-proof.json` giữ8scenario proof không có secret.

Console guard24scenario:0pageerror/0lỗi bất ngờ.71auth401,1ownership404 và3network fault dự kiến được phân loại tường minh. Không coi những phản hồi từ chối/fault này là lỗi JS.

## Responsive và accessibility

375/768/1024/1440px, viewport cao1000px.40ảnh Customer cho10trang bắt buộc: home/list/restaurant/food/cart/checkout/orders/order/rating/profile.88ảnh hồi quy UI đã có và4ảnh form profile mở bổ sung: **132ảnh**. Kiểm tra overflow, labeled controls, keyboard/Escape/focus return, modal, sticky navigation và reduced motion. Script QA riêng kiểm tra ba input và thao tác edit/cancel hồ sơ tại cả bốn chiều rộng,0pageerror. Không tuyên bố chứng nhận WCAG2.2AA toàn diện hoặc đã thử mọi browser/device.

## Đối chiếu MySQL và bảo toàn dữ liệu

`mysql-order-proof.json` xác nhận8ID đơn của lượt cuối có: subtotal bằng tổng order_details; total=subtotal+shippingFee; đúng một Payment/đơn với amount khớp; COMPLETED đi cùng DELIVERED/SUCCESS; đơn hủy có Payment CANCELLED. Đơn response-loss vẫn PENDING/PENDING theo nghiệp vụ, không tự đánh dấu hoàn thành. Giá/phí lấy server, không sửa giá fixture đã có.

Schema Stage4 vẫn16bảng/21FK/13UNIQUE/6CHECK. Checksum tất cả13bảng Stage1 và16bảng Stage2 rehearsal trước/sau giống nhau. Hash7service ghi nghiệp vụ Cart/CartItem/Order/Payment/Delivery/Rating/Customer và pom/dependency không đổi. Dữ liệu mới chỉ trong Stage4 qua fixture/API/test transaction được duyệt.

## Lỗi trong quá trình triển khai và cách sửa

- Maven bị sandbox từ chối metadata JAR trong cache: chạy lại với quyền truy cập cache được phê duyệt; không tải/đổi dependency. Bổ sung import còn thiếu ở test mới.
- Sau khoảng gián đoạn, MySQL test không còn chạy: xác minh và khởi động đúng instance3307, không chạm MySQL80; không tính lỗi kết nối đó thành test PASS.
- Query-count test phát hiện N+1 khi load Order graph: fetch thêm quan hệ inverse Customer.cart trong truy vấn đọc đã thêm, giữ nguyên giới hạn test (không nới assertion).
- TanStack cập nhật callback khi rerender: đóng actor/resource bất biến trong mutation variables; thêm test logout/đổi route.
- Test mới cài mock sau render và chọn status mơ hồ: chuẩn bị mock trước render, kiểm tra đúng nội dung và số lần retry; không bỏ assertion.
- E2E xóa review đọc API trước ACK DELETE và click nút mixed-cart đã bị khóa: chờ response DELETE200/kiểm tra database, xác nhận disabled thay vì cố click. Bảo vệ nghiệp vụ giữ nguyên.
- Overflow1024 do min-width240px của Select cũ: cho field trong grid mới min-width0/width100%, chạy lại toàn bộ24E2E thành công. Lượt đầu20PASS/4FAIL được giữ ở e2e-attempt-1; không dùng kết quả đó làm nghiệm thu.

## Evidence và teardown

Thư mục `F:/New folder/food-delivery-mysql-test/phase4-20261109/logs` gồm acceptance-summary, JUnit/unit/E2E JSON+log, browser-final, screenshots, MySQL proof/checksum, isolation setup, profile-form-responsive và shutdown-proof. Backend/frontend preview/MySQL test đã dừng;3307/18080/5173/4173 đóng IPv4/IPv6. MySQL80 vẫn Running. Datadir và log giữ nguyên. Không commit/push/deploy.

Chưa kiểm thử Firefox/WebKit, thiết bị vật lý, production HTTPS, tải lớn/chaos hoặc pentest độc lập. Không có blocker/FAIL/ERROR/SKIPPED còn mở trong phạm vi nghiệm thu Giai đoạn4.
