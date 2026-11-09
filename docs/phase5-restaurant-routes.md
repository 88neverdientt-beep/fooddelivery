# Route RESTAURANT Giai đoạn 5

Tất cả `/restaurant/*` yêu cầu session ACTIVE với role RESTAURANT. Chưa đăng nhập chuyển login, sai vai trò403. Không cho chọn restaurantId qua URL/query để đổi phạm vi quản trị.

- `/restaurant/dashboard`: KPI toàn tập, chart trạng thái/ngày, giá trị món đã thanh toán, đường dẫn thao tác. Heading cũ giữ tương thích hồi quy.
- `/restaurant/profile`: tên, địa chỉ, số liên hệ và trạng thái mở cửa; email đăng nhập chỉ đọc, đổi mật khẩu qua trang bảo mật có sẵn. Không sửa ID/owner/role.
- `/restaurant/menu`: search, availability, sort name/price, page12, bật/ngừng bán, sửa và xác nhận xóa.
- `/restaurant/menu/new`: chọn FoodItem catalog chung chưa thêm; form price/availability.
- `/restaurant/menu/:id/edit`: chỉ sửa RestaurantFoodItem của mình; baseline/409/rebase, cảnh báo bản nháp.
- `/restaurant/orders`: tìm ID/tên khách, status, ngày tạo, newest/oldest/total-desc, page12, refresh/poll có kiểm soát.
- `/restaurant/orders/:id`: nội dung/giá đã chốt, địa chỉ được phép, payment/delivery/timeline và next transition hoặc hủy theo rule backend.
- `/restaurant/reviews`: page12, nội dung/điểm thực, thống kê toàn thời gian, không mutation.
- `/restaurant/analytics`: ngày tối đa93, counts, chart, giá trị món hợp lệ, top10.

Tài khoản/bảo mật/sessions/logout vẫn dùng route và thành phần Giai đoạn2–3. Sidebar/topbar hiển thị tên nhà hàng từ profile riêng; mobile dùng menu hiện có. Query params chỉ filter, không là dữ liệu cấp quyền.
