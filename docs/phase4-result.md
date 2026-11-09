# Nghiệm thu Giai đoạn4 — Food-Delivery Customer

Ngày09/11/2026. **GIAI ĐOẠN4 HOÀN THÀNH trong phạm vi yêu cầu; đủ điều kiện bắt đầu Giai đoạn5 sau khi người dùng quyết định triển khai.** Luồng Customer chạy với API/MySQL thật, không dùng mock runtime hoặc screenshot để thay bằng chứng nghiệp vụ. Chưa triển khai dashboard nghiệp vụ Restaurant/Driver/Admin hoặc deploy public.

## 1. Chức năng

Nhà hàng tìm kiếm/lọc/sort/phân trang server; restaurant/menu/food detail; số lượng và add to cart; sửa/xóa cart, giỏ một nhà hàng; checkout COD từ phương thức đang active và tổng server; double-click lock và đối chiếu khi mất response; history/filter/detail; trạng thái Order/Delivery/Payment riêng biệt; hủy/đổi địa chỉ đúng quyền; rating create/update/delete và đánh giá riêng; profile read/edit name/phone/address; auth và safe return sau login; responsive/design system được giữ lại. Không tạo giá/rating/khuyến mãi/timestamp hoặc trạng thái đơn giả.

## 2. Route

`/`, `/restaurants`, `/restaurants/:id`, `/restaurants/:id/food/:foodId`, `/customer`, `/customer/cart`, `/customer/checkout`, `/customer/orders`, `/customer/orders/:id`, `/customer/ratings`, `/customer/profile`, `/account`, `/account/change-password`. Cart/checkout/order/rating được lazy-load dưới guard CUSTOMER; public food chỉ add khi đúng role. [Chi tiết route/query/guard](phase4-customer-routes.md).

## 3. API

Sáu GET được phê duyệt đã triển khai: `/payment-methods`, `/restaurants/search`, `/restaurants/{id}/menu`, `/food-categories`, `/customers/{id}/orders/page`, `/restaurants/{id}/ratings/page`. Page tạiDB, size tối đa50, giữ55contract cũ, tổng61endpoint. Dùng API cũ để đọc public detail, cart/cart-items, create/detail/cancel/address order, payment, rating CRUD, customer profile và auth. Không tạo endpoint theo phỏng đoán; xem [payload/quyền/rule](phase4-api-integration.md).

## 4. File

Các feature public/cart/checkout/orders/ratings/customer và test; auth return allowlist, router, workspace/header/account integration, CSS và E2E. Backend chỉ thêm read controller/service/page/query và repository read methods, security allowlist/test target/regr. Không đổi business writer hoặc schema. Danh sách đầy đủ: [phase4-files.txt](phase4-files.txt). [Kiến trúc và cache/concurrency](phase4-architecture.md). README đã cập nhật hướng dẫn chạy và QA an toàn.

## 5. Business rules

Identity từ /auth/me; giá/phí/tổng do backend; quantity nguyên1..2147483647; không trộn/xóa ngầm giỏ nhà hàng khác; món còn bán và nhà hàng mở được backend revalidate khi checkout. Chỉ COD active, không xác nhận Payment SUCCESS từ Customer. Hủy/đổi địa chỉ chỉ PENDING/CONFIRMED theo kiểm tra payment/delivery backend. Rating cần đơn COMPLETED tại nhà hàng; backend cho nhiều rating, không áp rule một rating/đơn giả; score1..5. Profile chỉ sửa ba trường DTO, không gửi role/ID/email/password hash. Không đổi transaction, giá/phí hoặc transition đã ổn định ở Giai đoạn1.

## 6. Kết quả kiểm thử

- **Backend119/119 PASS**,0FAIL/ERROR/SKIPPED, BUILD SUCCESS:104hồi quy Giai đoạn1/2 +15test mới (6unit,9MySQL integration).
- **Frontend200/200 PASS**,0FAIL/ERROR/SKIPPED:58nền tảng +142test feature mới.
- **Playwright24/24 PASS** trên production build với backend/MySQL thật,0SKIPPED/FLAKY, retry0. Gồm16hồi quy UI/auth và8Customer. Có4QA form profile bổ sung ngoài24E2E.
- **Typecheck, ESLint, formatter, production build PASS**. Dependency/package lock giữ nguyên.

[Chi tiết kịch bản, lịch sử lỗi và evidence](phase4-test-results.md). Các kết quả cũ không được cộng như test mới hoặc tính SKIPPED thành PASS.

## 7. Nghiệp vụ, transaction và concurrency đã kiểm chứng

Luồng thật Customer→cart→COD→order→Restaurant xác nhận/chuẩn bị→Driver nhận/giao→COMPLETED/SUCCESS→rating→profile→logout. Có tăng/giảm/xóa/thêm lại; reload/history; hủy hợp lệ và từ chối khi khóa; đổi địa chỉ trước/sau trạng thái cho phép. SQL xác nhận8đơn của lượt cuối, đủ OrderDetail và đúng một Payment mỗi đơn, tiền/trạng thái nhất quán.

Hai click trước khi React render vẫn chỉ một POST. Khi server đã commit201 nhưng browser mất response, UI khóa đặt lại, đối chiếu bằng GET và tìm đúng đơn; database có đúng một đơn. Những case rollback và race backend Giai đoạn1 cũng được chạy lại trong119JUnit, không sửa logic checkout.

## 8. Security

Ma trận61endpoint×6actor (366tổ hợp) và test API/UI với hai Customer xác nhận ownership cart/order/cancel/address/rating/profile. Giả giá/total/accountId bị400, thiếu CSRF bị403, sửa URL ngoài chủ sở hữu bị404, mine không tin customerId tự khai. Không XSS từ review markup, không access/refresh credential trong browser storage. Cache theo account, callback mutation sau logout/đổi route không lộ/ghi dữ liệu cũ.24kịch bản browser có0pageerror/lỗi bất ngờ;401/404/fault cố ý được phân loại. Không tắt Spring Security hoặc thay role để test.

## 9. UI/UX, responsive và hiệu năng

375/768/1024/1440: đủ10trang Customer,40ảnh bắt buộc +88ảnh hồi quy UI +4ảnh form hồ sơ mở, tổng132ảnh. Không tràn ngang sau sửa Select1024; label/focus/keyboard/modal/drawer/reduced-motion được kiểm tra. Ảnh là minh họa local ghi rõ; không giả ảnh nhà hàng thực tế. Một số ảnh: [food mobile](../../food-delivery-mysql-test/phase4-20261109/logs/screenshots/phase4-375-food-detail.png), [checkout mobile](../../food-delivery-mysql-test/phase4-20261109/logs/screenshots/phase4-375-checkout.png), [orders tablet](../../food-delivery-mysql-test/phase4-20261109/logs/screenshots/phase4-768-order-detail.png), [list1024](../../food-delivery-mysql-test/phase4-20261109/logs/screenshots/phase4-1024-restaurants.png).

JS entry457,082bytes, không chunk>500kB, không nâng warning limit hoặc manualChunks. Homepage không request private workspace/account/auth chunks; các feature mới theo route lazy. Pagination chạy DB, không fetch toàn bộ danh sách để giả phân trang. Polling20giây chỉ khi tab hiển thị/đơn chưa kết thúc; có nút refresh. Chưa đo Web Vitals trên thiết bị/mạng production.

## 10. Database và vận hành

Chỉ runtime/test trên MySQL riêng127.0.0.1:3307/fooddelivery_stage4_e2e, app account giới hạn, Hibernate validate. Không ghi MySQL80:3306/database fooddelivery, không sửa schema hoặc reset database rehearsal. Checksum13bảng Stage1 và16bảng Stage2 rehearsal giống trước. Stage4 vẫn16bảng/21FK/13UNIQUE/6CHECK. Hash7service ghi nghiệp vụ, pom và frontend dependency không đổi.

Đã dừng backend18080, preview4173 và MySQL test3307; cả5173 cũng đóng, kiểm tra IPv4/IPv6. MySQL80 vẫn Running, không bị dừng/restart. Datadir, config/credential bên ngoài Git và logs được giữ tại `F:/New folder/food-delivery-mysql-test/phase4-20261109`. Không ghi password vào báo cáo. Không commit/push/deploy.

## 11. Lỗi đã sửa và giới hạn

Đã sửa N+1 ở graph đọc đơn mới; mutation callback sau logout/đổi route; safe return sau login; server search/menu paging thay local unbounded; overflow1024; test mock timing/selector/DELETE ACK. Chi tiết và lỗi môi trường Maven/MySQL được công khai trong báo cáo test, không che lỗi lượt đầu.

Chưa có server idempotency/quote-version, WebSocket/SSE, gateway online/QR, topping/size, sổ địa chỉ, ảnh sản phẩm thật hoặc timestamp của mọi transition; UI phản ánh đúng khả năng backend. Unknown checkout chỉ đối chiếu50đơn mới nhất; không thấy không được suy diễn thất bại hoặc tự POST lại. Không tuyên bố bảo đảm idempotency phân tán hoặc kiểm thử mọi race production. Các API list cũ còn unbounded để tương thích nhưng Customer mới không dùng chúng cho khám phá/history/review. Production cần HTTPS/origin/cookie/reverse proxy, quản lý key và kiểm thử tải/bảo mật riêng. Chưa kiểm thử Firefox/WebKit/thiết bị vật lý hoặc chứng nhận WCAG toàn diện.

Không có blocker nghiêm trọng hoặc FAIL/ERROR/SKIPPED còn mở trong phạm vi Giai đoạn4. Có thể bắt đầu Giai đoạn5 với xác thực, contract, cache và kiểm thử đã giữ ổn định; chưa tự triển khai Giai đoạn5.
