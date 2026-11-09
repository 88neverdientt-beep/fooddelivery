# Route Driver Giai đoạn 6

Mọi /driver/* cần DRIVER ACTIVE qua RoleProtectedRoute. Anonymous đến login, CUSTOMER/RESTAURANT/ADMIN đến403. Backend xác minh lại role/owner; guard không thay authorization. Các trang lazy load từng module.

- /driver/dashboard: tên/status thật, counts all-time/current/period, chuyến cần xử lý theo ID cũ nhất trong own active, shortcut nhận chuyến/history. Không giả thứ tự assignment theo thời gian không có.
- /driver/deliveries: own active PENDING/PICKED_UP/DELIVERING; search ID/nhà hàng, filter, sort ID, page12, refresh/poll.
- /driver/available: own verified active DRIVER xem pool chưa có người nhận đã được backend cho phép; chỉ nhà hàng/điểm lấy, không địa chỉ khách trước khi nhận. Accept có confirm và recovery.
- /driver/deliveries/:id: own detail, pickup/dropoff, món snapshot, payment, timeline thời gian có thật, next action xác nhận. 404 che tài nguyên của Driver khác/unassigned.
- /driver/history: own DELIVERED/CANCELLED, filter/sort/page; ngày giao nếu deliveredTime có thật, không tự gán thời gian hủy.
- /driver/profile: name/phone/address/licensePlate/driveStatus đúng DTO, email read-only; không sửa ID/role/owner. Đổi mật khẩu/link tài khoản giữ luồng cũ.
- /driver/analytics: aggregate own đầy đủ, kỳ tối đa93ngày, count theo pickupTime/deliveredTime và khoảng pickup→delivered trung bình có thật.

Desktop sidebar/topbar/profile dropdown/logout tái sử dụng Workspace. Mobile bottom nav bốn mục: tổng quan/chuyến giao/hồ sơ/lịch sử; giữ nội dung phía trên thanh cố định, safe-area và tap target theo design system. Available/analytics có link thật từ dashboard/sidebar. Query params chỉ filter, không chọn chủ thể.
