# Route Customer — Giai đoạn 4

Các route public nằm trong PublicLayout. Route /customer nằm dưới SessionGate → AuthenticatedRoute → RoleProtectedRoute CUSTOMER → WorkspaceLayout. Guard chỉ phục vụ UX; backend kiểm tra JWT/ownership ở mỗi thao tác.

- `/`: landing và ba nhà hàng từ trang đầu API bounded, tối đa12 category gợi ý thật. Không tự gọi đó là nhà hàng nổi bật hoặc rating/ETA/discount.
- `/restaurants?q=&status=all|open|closed&sort=name|name-desc&page=1`: tìm tên/địa chỉ, lọc/sort và phân trang trên server,12 mục/trang; tìm kiếm submit chủ động.
- `/restaurants/:id?q=&category=&available=true&sort=name|price-asc|price-desc&page=1`: nhà hàng public, thực đơn thật có giới hạn, category nhập theo gợi ý, public reviews. `reviewOrder=:orderId#restaurant-ratings` giữ lại khi đổi menu filter và được xác minh bằng API.
- `/restaurants/:id/food/:foodId`: foodId là restaurantFoodItemId, không phải FoodItem.itemId. Kiểm tra liên kết menu–nhà hàng, số lượng, availability, giỏ khác nhà hàng. Guest đến login với đích cùng origin được allowlist; role khác CUSTOMER không thể add.
- `/customer`: dashboard giữ phong cách hiện tại, điều hướng các chức năng thật.
- `/customer/cart`: đọc giỏ, sửa số lượng, xóa món, tiền/tổng/phí từ backend; empty/error/retry và CTA checkout.
- `/customer/checkout`: địa chỉ cho đơn, COD discovery, quote server, khóa submit và đối chiếu khi mất response. Thành công đến đúng ID đơn backend.
- `/customer/orders?status=&page=1`: history phân trang12đơn, filter enum thật, loading/empty/error.
- `/customer/orders/:id`: chi tiết tiền/món/nhà hàng/địa chỉ, timeline, Delivery/Payment tách biệt, refresh/polling có kiểm soát, hủy/đổi địa chỉ khi được phép và CTA review sau hoàn thành.
- `/customer/ratings`: chọn nhà hàng theo trang đơn COMPLETED, xem/sửa/xóa đánh giá của mình qua mine=true; không giả là đã quét hết lịch sử.
- `/customer/profile` và `/account`: AccountPage hiện có, thêm chỉnh name/phoneNumber/address chỉ cho CUSTOMER, đồng bộ profile query và xác minh lại AuthProvider. Email/role/status/ID chỉ đọc.
- `/account/change-password`: luồng Giai đoạn3 giữ nguyên, thu hồi phiên khi thành công.

Login/register/logout/logout-all/refresh vẫn như Giai đoạn3. Đích login chỉ cho route CUSTOMER/public food hợp lệ, không URL ngoài site, query redirect hoặc admin/driver. Sai role→403; tài nguyên không thuộc chủ sở hữu→API404 và UI không tiết lộ dữ liệu. Các workspace nghiệp vụ Restaurant/Driver/Admin vẫn giữ giới thiệu Giai đoạn5–7.
