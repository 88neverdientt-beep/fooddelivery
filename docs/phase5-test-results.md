# Nghiệm thu Giai đoạn 5 — 09/11/2026

Lượt cuối: **126/126 backend JUnit,224/224 frontend,34/34 Playwright PASS**. Tất cả0FAIL/ERROR/SKIPPED; Playwright0flaky,retries=0. Typecheck/ESLint/Prettier/production build PASS. Không dùng số liệu bàn giao cũ thay lượt chạy lại.

## Môi trường

JDK25.0.4 từ IntelliJ; Maven3.9.16 cache offline; Node24.20.0/npm11.19.0; MySQL8.0.46 binary hiện có. Instance --no-defaults tại127.0.0.1:3307, datadir food-delivery-mysql-test/data. Database mới fooddelivery_stage5_e2e từ snapshot nhất quán chỉ đọc Stage4. Backend127.0.0.1:18080, explicit datasource3307, validate, OSIV=false. Frontend production preview localhost4173, Chromium headless. App SQL DML-only trên Stage5; migrator chỉ Stage5 cho negative migration regression. Không thay Java/dependency hệ thống.

## Backend126

119test cũ chạy lại, gồm business/auth/persistence/migration/security/limiter/readAPI;7test MySQL mới kiểm tra bốn projection management, role matrix, filters/page, aggregates toàn tập, partial/stale/legacy PUT, hai conditional PUT đồng thời và số truy vấn JPA khi trang đơn tăng1→8. Bounded graph không phát sinh query theo từng order, chạy validate/OSIV=false. Inventory65endpoint (61cũ+4GET), ma trận6actor390tổ hợp; không hạ assertion hoặc skip để đạt PASS.

Các constraint/transaction/rollback/cascade từ suite cũ vẫn chạy trên Stage5 với target được whitelist. Preflight Stage1 chỉ đọc88hash cũ, không sửa. Schema cuối vẫn16bảng/21FK/13UNIQUE/6CHECK; không có migration/schema mới.

## Frontend224

Giữ200test cũ, thêm24test về precision/giới hạn giá, profile, transition, khoảng93ngày/ngày không tồn tại, identity/API contract, expected pair, owner, unsaved navigation, form, metrics, double-submit và refetch cache. Kiểm tra response profile update sai owner cũng bị chặn. Không thêm dependency hoặc any để bỏ type safety.

## Playwright34

24hồi quy Authentication/Customer/public/UI cũ +10scenario Restaurant mới. Auth thực: login/register/reload, Secure HttpOnly cookie, refresh hai tab, revoke/password/logout-all; Customer cart/checkout/COD/order/history/cancel/address/rating/profile/owner/response-loss. Restaurant: private profile validation/save/account switch, chọn catalog/add/edit/availability/delete, xử lý order qua READY và Driver COD COMPLETED, reviews đọc thật, thống kê/giá lịch sử, hủy đơn qua UI, owner denials, parallel PUT/confirm/cancel/price-checkout, hai tab giữ draft, mất response sau commit.

- Hai conditional PUT cùng baseline:200/409, không hai lần thắng.
- Hai confirm:200/409; confirm vs Customer cancel cuối CANCELLED, payment CANCELLED.
- Giá đổi đồng thời checkout: snapshot giá thuộc một trạng thái hợp lệ, subtotal/detail/total khớp; ngừng bán checkout409 và cart giữ nguyên.
- Response PUT bị cắt sau backend200: server giữ giá31000, browser refetch đúng, chỉ một PUT.
- Đơn cũ unitPrice25000 giữ nguyên sau menu29000; xóa món có lịch sử409. Món chưa tham chiếu xóa200 đúng hợp đồng cũ.
- Customer đọc thấy trạng thái mới từ Restaurant; Restaurant không đánh dấu giao/thu COD.

Console guard34scenario ghi nhận0pageerror/0unexpected;81auth401,4network fault và1ownership404 dự kiến, path được giới hạn. Negative API request không bị hiểu thành thành công nghiệp vụ. Không có mock runtime; fault injection chỉ ở bài test mạng.

## Responsive và bundle

375/768/1024/1440px, chín màn hình Restaurant (dashboard/profile/menu/add/edit/orders/detail/reviews/analytics):36ảnh, không horizontal overflow. Hồi quy40ảnh Customer và88ảnh public/workspace: tổng164ảnh lượt cuối. Đã xem ảnh dashboard desktop và menu mobile; control có label/dialog/unsaved warning; các bài keyboard/sticky/reduced-motion/contrast cũ PASS. Chưa chứng nhận WCAG toàn diện.

EntryJS464714byte (~464.71kB), không chunkJS nào>500000byte; giữ route lazy loading, không thay threshold hoặc giấu warning. Dependency/lockfile/pom không đổi.

## SQL và bảo toàn dữ liệu

Đối chiếu trực tiếp **12ID đơn** từ proof lượt cuối: subtotal bằng SUM(detail), total=subtotal+shipping, đúng một Payment/đơn và amount khớp; COMPLETED có DELIVERED/SUCCESS; CANCELLED có paymentCANCELLED. Chỉ kiểm tra các ID QA đã ghi, không tuyên bố fixture lịch sử giả lập là luồng thật.

Đối chiếu6aggregate SQL với API riêng Restaurant#2632: totalOrders=16,paidOrderCount=2,paidFoodValue=50000.0,paidShipping=30000.0,activeMenuCount=15,ratingsCount=2; tất cả khớp trên toàn tập và cùng khoảng ngày. Profile đúng projection6field.

Checksum tất cả13bảng Stage1,16bảng Stage2 rehearsal và16bảng Stage4 trước/sau giống nhau. Hash9service Cart/CartItem/Order/Payment/Delivery/Rating/Customer/Restaurant/FoodItem và config/migration gốc không đổi. Auth frontend/HTTP client, pom và frontend dependencies giữ nguyên. Không chạy lệnh ghi vào3306/fooddelivery; MySQL80 không bị dừng/restart. Không dùng checksum production để thay cho bằng chứng cách ly.

## Lỗi phát hiện trong quá trình làm

- Test concurrency ban đầu cho thấy lock/refresh + ORM update vẫn có thể hai200. Thay nhánh đã phê duyệt bằng atomic update có expected predicate; giữ assertion một200/một409, cả JUnit và HTTP thật PASS.
- Bổ sung check owner cho response updateProfile và xác thực ngày lịch thực, tránh Date.parse tự chuẩn hóa30/02.
- Lỗi compile biến kiểm thử policy path được sửa; không đổi policy test mong đợi. Maven cache bị sandbox hạn chế đã chạy lại bằng quyền được duyệt, không đổi dependency.
- Script bằng chứng cần kiểm pom qua Git vì baselineJSON chỉ chứa src; sửa harness ngoài repo, không bỏ kiểm tra. Không phải lỗi ứng dụng.

## Evidence, giới hạn và teardown

Evidence ngoài Git: F:/New folder/food-delivery-mysql-test/phase5-20261109/logs. Gồm acceptance-summary, backend-junit-summary, frontend-unit, e2e-final-results, browser-final, screenshots, mysql-order-proof, mysql-analytics-proof, existing-databases-proof, source baseline, secret-scan và shutdown-proof. Các lượt chạy trung gian và log lỗi giữ lại; không dùng chúng làm số PASS cuối.

Cleanup và tình trạng MySQL80 ghi trong shutdown-proof.json; giữ datadir/log. Không có blocker/FAIL/ERROR/SKIPPED còn mở trong phạm vi Giai đoạn5. Chưa test Firefox/WebKit, thiết bị thật, tải lớn, production HTTPS hoặc pentest độc lập. CAS bảo vệ cặp giá/availability của client mới, không là version toàn bộ hay chống ABA. Không triển khai Giai đoạn6, không commit/push/deploy.
