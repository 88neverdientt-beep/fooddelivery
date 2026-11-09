# Nghiệp vụ Driver và giao hàng

## Account và công việc

ADMIN tạo Driver qua POST /drivers cùng Account atomic. Account có roleDRIVER và driver_id UNIQUE FK. Driver có nhiều Delivery; Order một Delivery. driveStatus là boolean do Driver sửa được theo DTO/service cũ: true cho phép nhận chuyến mới, false vẫn đọc/xử lý chuyến đã nhận. Không biểu diễn BUSY/OFFLINE/verified hoặc giới hạn số chuyến vì không có rule đó.

Restaurant xác nhận Order tạo Delivery PENDING chưa có driver. Tài xế tự nhận qua API accept đã có khi Order CONFIRMED/PREPARING/READY, driveStatus=true và driverId khớp principal. Hai tài xế tranh cùng chuyến chỉ một thắng. Không có Admin assign/reassign/unassign/refuse API. Pool mới giữ đúng tập điều kiện accept, chỉ lọc/phân trang, không mở cơ chế nhận đơn tùy ý ngoài nghiệp vụ.

## Transition và COD

PENDING→PICKED_UP chỉ khi Order READY, ghi pickupTime. PICKED_UP→DELIVERING cần Order READY và đặt Order DELIVERING. DELIVERING→DELIVERED cần Order DELIVERING, payment hợp lệ, ghi deliveredTime và Order COMPLETED. COD xác nhận Payment SUCCESS cùng transaction, đúng amount=Order.totalAmount. UI bước cuối nêu rõ phải đã giao hàng và thu đủ COD, không có mutation Payment riêng hoặc tự đánh dấu paid trên client.

Không cho skip/duplicate/terminal transition. Hủy Order chỉ theo Customer/Restaurant rule hiện có; đồng bộ Delivery/Payment CANCELLED. Không có FAILED/RETURNED/reason/refuse/reschedule trong API; không tạo nút giả. Tài xế không đổi OrderStatus tùy ý, không sửa profile/menu của Customer/Restaurant hoặc quyền Admin.

Không đổi transaction isolation, cascade, giá/phí, snapshot tiền hoặc schema. Bản sửa khóa đọc khi cancel đã được người dùng phê duyệt: sau khóa Order, detach Delivery cache nếu có rồi nạp lại dưới khóa theo order_id; giữ thứ tự Order→Delivery và driver đã nhận. Invalid transition409; wrong owner404; extra forged DTO fields400; wrong role403. Cập nhật duplicate một200/một409, không tự retry PUT. Accept/cancel race có thể cả hai200 theo thứ tự hợp lệ hoặc accept409 nếu cancel thắng; cuối phải cancelled nhất quán.

## Thông tin và thống kê

Trước khi nhận chỉ deliveryId/orderId/restaurantId/name/address nhà hàng. Sau khi assigned mới thấy địa chỉ giao, tên khách tối thiểu và OrderDTO được backend cũ cho phép. Không thêm số điện thoại/email khách ngoài hợp đồng, không gửi địa chỉ đến dịch vụ bản đồ ngoài, không GPS/ETA/location permission.

Timeline chỉ pickupTime và deliveredTime có thật; createdAt hiển thị là thời gian tạo Order. Không có assignedAt/start-transit/cancelledAt nên không tự đặt mốc. History chưa có thời gian hủy thì không thay bằng ngày tạo và gọi là ngày hủy.

Analytics: totalAssignedAllTime/statesAllTime trên toàn bộ current driver FK; activeNow=PENDING+PICKED_UP+DELIVERING. completedInPeriod/ByDay dựa Delivery DELIVERED và deliveredTime trong[from,to] inclusive; pickedUpInPeriod/ByDay dựa pickupTime thực. Trung bình phút pickup→delivered chỉ DELIVERED trong kỳ với đủ hai mốc đúng thứ tự, null nếu thiếu. Đây không là travel-time/ETA hay điểm hiệu suất. Không tính income/wallet/commission/bonus hoặc success-rate với mẫu số thiếu assignedAt; COD/ship fee chỉ giá trị đơn, không thu nhập Driver.

Default30ngày, tối đa93ngày; LocalDateTime/timezone backend hiện có. Charts không bịa ngày/số liệu khi rỗng. Null activity/profile không suy là verified/online.
