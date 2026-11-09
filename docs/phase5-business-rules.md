# Quy tắc nghiệp vụ Giai đoạn 5

## Hồ sơ và menu

FoodItem là catalog dùng chung do ADMIN quản lý; Restaurant chỉ chọn mục có sẵn. Price/isAvailable ở RestaurantFoodItem. Không thêm description/image/owner riêng khi schema không có. Giá >0, DECIMAL(12,2), tối đa10chữ số nguyên và2lẻ; nhận chuỗi input, không grouping/exponent/âm/rounding âm thầm. Không có ảnh thật trong DTO menu nên dùng icon, không giả ảnh món đã upload.

Mọi PUT từ UI mới gửi expectedPrice + expectedIsAvailable từ baseline đã đọc. Hai request cùng baseline thay đổi thật chỉ một thành công; request cũ409 phải đối chiếu và rebase. Đây là kiểm tra giá/trạng thái, không phải version toàn bộ dữ liệu: thay đổi rồi quay lại đúng baseline không phát hiện (ABA); client cũ không gửi expected vẫn theo hợp đồng cũ. Không thay business rule checkout hoặc thêm schema để xử lý ABA.

Menu price mới dùng khi cart/checkout đọc lại server. Giá OrderDetail đã chốt giữ nguyên. Món ngừng bán hoặc nhà hàng đóng bị backend chặn checkout; lỗi không xóa cart. Xóa món chỉ khi FK cho phép; món có lịch sử trả409, ưu tiên ngừng bán. Không xóa lịch sử/cascade cha/soft-delete.

## Đơn hàng

Restaurant chỉ PENDING→CONFIRMED→PREPARING→READY theo enum/service thật. Hủy PENDING/CONFIRMED nếu Delivery PENDING và Payment phù hợp; giữ lịch sử, đồng bộ CANCELLED. Không cho Restaurant đánh dấu DELIVERED/COMPLETED hoặc Payment SUCCESS/thu COD. Driver hoàn tất luồng giao và COD theo logic Giai đoạn1. Hành động giữ snapshot order/status khi mở dialog, backend kiểm tra lại sau lock; không dựa UI để bỏ validation.

Hai confirm đồng thời một200/một409. Confirm và Customer cancel có thể cả hai200 nếu confirm được commit trước rồi cancel hợp lệ; hoặc confirm409 nếu cancel thắng. Kết quả cuối phải CANCELLED với payment/delivery phù hợp. Không coi hai200 hợp lệ tuần tự là hai lần giao/thu tiền.

## Số liệu

- TotalOrders/states/ordersByDay: createdAt nằm trong ngày[from,to] inclusive, riêng own restaurant.
- PaidFoodValue: SUM(orders.subtotal), chỉ Order COMPLETED + Payment SUCCESS, paidAt trong khoảng. Không gồm shipping, CANCELLED, COD chưa thu.
- PaidShipping: SUM(shipping_fee) cùng tập đơn nhưng tách riêng.
- Đây là giá trị ghi nhận trước đối soát; không phải tiền thực nhận/lợi nhuận/doanh thu ròng. Không có ledger settlement nên không đưa ra các chỉ số đó.
- Top10: SUM(quantity), SUM(OrderDetail.subtotal) của tập paid/completed theo paidAt; không lấy một trang đơn.
- ActiveMenuCount hiện tại; rating count/average toàn thời gian, nhãn riêng; không bịa điểm khi không có review.
- Ngày dựa LocalDateTime/timezone backend hiện có, mặc định30ngày và tối đa93ngày inclusive. Không tuyên bố đa múi giờ hoặc đối soát kế toán.

Reviews chỉ đọc public DTO, tên khách tối giản theo backend; không liên kết orderId vì schema Rating hiện không có. Không tạo reply/edit/delete thay khách.
