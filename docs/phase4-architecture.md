# Kiến trúc Giai đoạn 4 — Customer ordering

Mở rộng backend/frontend hiện tại, giữ design system kem/cam, ảnh WebP local có nhãn minh họa, React Router lazy loading, TanStack Query, RHF/Zod và bộ xác thực Giai đoạn 2/3. Không thay dependency, schema hoặc transaction nghiệp vụ.

## Module

- `features/public`: Home/RestaurantList, API paging và bộ chuẩn hóa URL; RestaurantDetail/FoodCard/FoodDetail tách chunk để homepage không tải giỏ/checkout/đơn/đánh giá.
- `features/cart`: schema DTO, adapter cart/cart-items, CartItem/CartSummary và CartPage. Tiền và tổng lấy nguyên từ server; không optimistic update tiền.
- `features/checkout`: discovery COD, form địa chỉ, preflight quote, single-submit lock và đối chiếu kết quả chưa rõ.
- `features/orders`: schema và enum độc lập, API, OrderCard/Timeline, history/detail và form hủy/đổi địa chỉ.
- `features/ratings`: schema/validation, RatingForm, public/own review paging, create/update/delete và luồng chọn nhà hàng từ đơn đã hoàn thành.
- `features/customer`: customerApi và chỉnh sửa đúng name/phoneNumber/address trong AccountPage hiện có; không sửa email/role/ID/status. Đổi password vẫn dùng luồng auth cũ.
- `auth/returnTo`: allowlist đích CUSTOMER cùng origin, số ID an toàn; login và GuestOnlyRoute cùng áp dụng, không nhận URL tuyệt đối hoặc route admin/driver từ client.

## Account và cache

Identity chỉ từ /auth/me sau JWT/database verification; URL ID chỉ là tài nguyên được backend kiểm tra, không cấp quyền. Query riêng tư có accountId, cart còn có customerId. Logout/chuyển identity vẫn cancel/clear QueryClient; access token memory-only, refresh cookie HttpOnly, Web Locks/single-flight/CSRF giữ nguyên.

Mutation lưu actorId/profileId/generation và resourceId tại thời điểm thao tác; kiểm tra actor trước network và trước callback/cache/navigation. Điều này ngăn callback TanStack được cập nhật sau rerender ghi response của tài khoản/đơn cũ vào tài khoản/route mới. Test bao phủ logout khi mutation chưa xong và điều hướng sang đơn khác trước response.

Số lượng trên mỗi cart mutation bị khóa đến khi server refetch xong. FoodDetail đọc lại giỏ trước add, không tự xóa giỏ khác nhà hàng. Không replay mutation sau lỗi mạng/401, không optimistic money, backend vẫn kiểm tra cuối cùng và khóa transaction theo logic Giai đoạn 1.

## Checkout và kết quả chưa xác định

GET cart trả subtotal/shippingFee/totalAmount. UI không hardcode phí15000 hoặc ID COD. GET /payment-methods trả duy nhất COD đang active. Trước POST, đọc lại cart/phương thức và tối đa50 đơn mới nhất; quote đổi thì yêu cầu xác nhận lại. POST chỉ gửi deliveryAddress/paymentMethodId tới customerId lấy từ principal đã xác minh.

Khóa đồng bộ bằng ref trước React render ngăn hai click tạo hai POST. Không có server idempotency key trong hợp đồng hiện tại nên không tạo key giả. Nếu POST timeout/mất response/5xx không rõ kết quả, lưu attempt trong cache memory theo account, khóa submit và chỉ đọc server để đối chiếu ID mới, chủ sở hữu, COD, nhà hàng, địa chỉ, danh sách món và toàn bộ số tiền. Một kết quả khớp duy nhất mới mở trang đơn thật; không thấy trong50 đơn gần nhất vẫn là chưa rõ, không suy diễn thất bại hoặc tự POST lại. Logout xóa attempt cùng cache. Reload toàn trang cần đọc lại cart/orders; frontend không cam kết idempotency phân tán, khóa checkout database hiện có vẫn là bảo vệ cuối.

## Theo dõi và đánh giá

Order/Delivery/Payment có schema/nhãn riêng. Timeline ánh xạ enum thật, chỉ dùng timestamp được API lưu; không tự tạo mốc thời gian nhà hàng xác nhận/chuẩn bị. Nút refresh và polling20giây cho đơn chưa kết thúc; ngừng khi tab ẩn hoặc đơn terminal. Customer không có nút tự chuyển DELIVERED/COMPLETED.

Đánh giá cần ít nhất một đơn COMPLETED tại nhà hàng; không giả định một rating/đơn vì backend cho nhiều rating. CTA reviewOrder được re-fetch và xác minh ownership/trạng thái/nhà hàng; danh sách riêng dùng mine=true do server lấy customer từ principal. MyRatings chọn nhà hàng từ một trang đơn hoàn thành, không quét toàn bộ lịch sử. Điểm nguyên1..5; comment giới hạn TEXT65535 UTF8 byte, render text React, không HTML.

## Backend chỉ đọc đã được duyệt

Sáu GET bổ sung dùng PageResponse(items,page,size,totalElements,totalPages), size1..50 và page0..10000. Query/filter/sort chạy tại DB, LIKE escape ký tự %,_,!; tie-break ID ổn định. Paging orders chọn ID trước rồi fetch graph có giới hạn; không phân trang trên collection fetch. Readonly transaction/OSIVfalse và query-count test kiểm chứng LAZY/N+1. Mọi55 route cũ giữ nguyên, inventory mới61route và ma trận sáu actor. Test target chỉ cho rehearsal hoặc stage4 được duyệt ở3307; hồi quy chạy trên bản sao stage4 và preflight Stage1 chỉ đọc.

## Giới hạn

Chưa có WebSocket/SSE, payment gateway, topping/size, sổ địa chỉ, ảnh món thật, lịch sử timestamp mọi transition hoặc idempotency endpoint. Các list cũ còn unbounded để tương thích; frontend mới dùng các route phân trang. Không triển khai nghiệp vụ dashboard RESTAURANT/DRIVER/ADMIN. Kết quả thực tế, lỗi đã sửa và giới hạn kiểm thử ghi trong phase4-test-results.md.
