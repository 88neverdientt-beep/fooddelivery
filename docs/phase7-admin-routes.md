# Giai đoạn 7 — Route quản trị

Mọi route dưới đây cần ADMIN ACTIVE. Anonymous đến login, role khác đến403, backend kiểm tra riêng; không coi guard là security duy nhất. Sidebar/topbar/breadcrumb/menu/logout tái dùng Workspace; mobile drawer scroll/focus và table scroll trong container.

- /admin/dashboard: aggregate toàn hệ thống, chỉ số mọi thời gian/kỳ tách rõ, thanh toán thành công ghi nhận và hoạt động có nguồn.
- /admin/accounts: search/filter role/status/sort/page tại database.
- /admin/accounts/:id: định danh/role/status/profile link; confirmation status conditional, refetch đúng account sau timeout; không sửa role hoặc tự-disable.
- /admin/customers: danh sách/search/trạng thái tài khoản/số đơn toàn tập.
- /admin/customers/:id: contact tối thiểu trong quyền GET cũ; không cart/order mutation thay khách.
- /admin/restaurants: danh sách/trạng thái/account/counts, link tạo hồ sơ.
- /admin/restaurants/new: tạo Restaurant + Account qua POST /restaurants hiện có; password policy cũ, không role selector.
- /admin/restaurants/:id: private profile mới, account/order/menu counts, full-profile PUT cũ và đóng/mở; giữ lịch sử.
- /admin/drivers: danh sách/nhận chuyến/account/counts, link tạo hồ sơ.
- /admin/drivers/new: tạo Driver + Account qua POST /drivers hiện có, không tạo ADMIN.
- /admin/drivers/:id: profile GET/PUT cũ và link lịch sử theo driverId; driveStatus khác Account.status, không assign/reassign.
- /admin/orders: tìm/lọc các trạng thái và Customer/Restaurant/ngày tạo, page tại database.
- /admin/orders/:id: snapshot món/giá/phí/địa chỉ, Order/Delivery/Payment; không mutation lifecycle ADMIN.
- /admin/deliveries: list/filter driver/Restaurant/status, kỳ theo ngày tạo Order.
- /admin/deliveries/:id: Driver/pickup/dropoff/license/status/timestamps và Order liên quan; không GPS/ETA/assignment giả.
- /admin/payments: list status/method/ngày tạo Payment, không suy COD=đã thu.
- /admin/payments/orders/:orderId: tái dùng GET Payment theo Order, mốc paid/refunded có thật; không refund/settlement/write Payment.
- /admin/reviews: list/search/restaurant/score/date, detail dialog plaintext/focus; không tạo moderation workflow.
- /admin/analytics: preset ngày nghiệp vụ hôm nay/7/30 và custom≤93ngày, nguồn/định nghĩa theo reporting-definitions.
- /admin/profile: verified Me/email/role, tra cứu ID qua GET cũ; password/logout dùng /account và /account/change-password.

Query params chỉ là bộ lọc cho phạm vi ADMIN đã được server xác thực. Kết quả không có hoặc lỗi hiển thị empty/error thật; không fixture runtime, placeholder business hoặc dữ liệu tài khoản trước sau đổi phiên. Tạo hồ sơ và các action có confirmation; dữ liệu chưa rõ không được tự POST/PUT lại.
