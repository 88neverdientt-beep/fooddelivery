# Route Giai đoạn 3

PublicLayout dùng header/footer chung. Workspace có sidebar/topbar và mobile navigation riêng theo role. Các guard chạy sau xác minh phiên; route guard frontend không thay backend authorization.

- `/` — Public; PublicLayout. Hoàn thiện; nhà hàng thật + landing. API: GET /restaurants; GET /food-items (danh mục trang chủ).
- `/login` — Guest; PublicLayout. Hoàn thiện. API: GET /auth/csrf; POST /auth/login; GET /auth/me.
- `/register` — Guest; PublicLayout. Hoàn thiện; chỉ CUSTOMER. API: GET /auth/csrf; POST /auth/register/customer.
- `/restaurants` — Public; PublicLayout. Hoàn thiện; lọc/pagination local. API: GET /restaurants.
- `/restaurants/:id` — Public; PublicLayout. Hoàn thiện; thực đơn thật. API: GET /restaurants/{id}; GET /restaurant-food-items.
- `/403, /404, *` — Public; PublicLayout. Hoàn thiện; trang lỗi. API: Không gọi API.
- `/account` — Mọi role ACTIVE; PublicLayout. Hoàn thiện; hồ sơ đọc thật, logout-all. API: GET /auth/me; GET profile theo role; POST /auth/logout-all.
- `/account/change-password` — Mọi role ACTIVE; PublicLayout. Hoàn thiện. API: GET /auth/csrf; POST /auth/change-password.
- `/customer` — protected CUSTOMER; CUSTOMER workspace. Hoàn thiện: dashboard theo identity hoặc hồ sơ đọc thật. API: Account/session + profile nếu cần.
- `/customer/profile` — protected CUSTOMER; CUSTOMER workspace. Hoàn thiện: dashboard theo identity hoặc hồ sơ đọc thật. API: Account/session + profile nếu cần.
- `/customer/cart` — protected CUSTOMER; CUSTOMER workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 4, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.
- `/customer/orders` — protected CUSTOMER; CUSTOMER workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 4, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.
- `/restaurant/dashboard` — protected RESTAURANT; RESTAURANT workspace. Hoàn thiện: dashboard theo identity hoặc hồ sơ đọc thật. API: Account/session + profile nếu cần.
- `/restaurant/profile` — protected RESTAURANT; RESTAURANT workspace. Hoàn thiện: dashboard theo identity hoặc hồ sơ đọc thật. API: Account/session + profile nếu cần.
- `/restaurant/menu` — protected RESTAURANT; RESTAURANT workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 5, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.
- `/restaurant/orders` — protected RESTAURANT; RESTAURANT workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 5, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.
- `/driver/dashboard` — protected DRIVER; DRIVER workspace. Hoàn thiện: dashboard theo identity hoặc hồ sơ đọc thật. API: Account/session + profile nếu cần.
- `/driver/profile` — protected DRIVER; DRIVER workspace. Hoàn thiện: dashboard theo identity hoặc hồ sơ đọc thật. API: Account/session + profile nếu cần.
- `/driver/deliveries` — protected DRIVER; DRIVER workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 6, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.
- `/admin/dashboard` — protected ADMIN; ADMIN workspace. Hoàn thiện: dashboard theo identity hoặc hồ sơ đọc thật. API: Account/session + profile nếu cần.
- `/admin/accounts` — protected ADMIN; ADMIN workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 7, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.
- `/admin/restaurants` — protected ADMIN; ADMIN workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 7, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.
- `/admin/drivers` — protected ADMIN; ADMIN workspace. Layout/navigation + trạng thái giới thiệu rõ Giai đoạn 7, không dữ liệu giả. API: Chưa gọi API nghiệp vụ.

Các parent /restaurant, /driver, /admin chuyển tới dashboard. Login chuyển theo role server, không theo role tự khai báo hoặc URL redirect tùy ý. Không có route tạo ADMIN. Chỉnh sửa profile/checkout/payment/delivery/admin CRUD để dành các giai đoạn sau.
