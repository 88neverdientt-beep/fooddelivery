# Kiểm toán dữ liệu hai báo cáo ADMIN

Nền d0556eeb81922b52be23bea754affaf8ae59418b; nhánh feature/admin-business-reports. Ngoại lệ untracked duy nhất được phê duyệt giữ nguyên. Không kết nối Main để thử báo cáo. Schema vật lý đối chiếu database/schema-reference.json và baseline đã nghiệm thu; chưa kiểm chứng SQL báo cáo trên MySQL mới.

| Chỉ tiêu | Nguồn dữ liệu | Quy tắc tính | Khả thi |
|---|---|---|---|
| Tổng đơn hàng | orders.order_id,created_at | COUNT của cohort đơn tạo trong kỳ, cùng status/restaurant filter | Có |
| Đơn hoàn thành | orders.order_status | COUNT COMPLETED trong cohort | Có, trạng thái hiện tại |
| Đơn hủy | orders.order_status | COUNT CANCELLED trong cohort | Có, không có cancelled_at |
| Giá trị hoàn thành | orders.total_amount/subtotal; payments.payment_status,amount,paid_at | Chỉ COMPLETED + SUCCESS, paid_at có, amount=total_amount=subtotal+shipping_fee; cohort created_at như chi tiết | Có, không phải lợi nhuận/thực nhận nền tảng |
| Phí giao hàng | orders.shipping_fee | SUM cùng tập đơn hoàn thành đã thanh toán hợp lệ | Có, chưa phải thu nhập tài xế |
| Giao thành công | deliveries.delivery_status | DELIVERED trong cohort orders.created_at, cùng driver/status filter | Có |
| Giao thất bại | DeliveryStatus | Không có FAILED; CANCELLED chỉ là hủy, không suy thất bại | Không; hiển thị không có dữ liệu và đếm hủy riêng |
| Lượt được phân công | deliveries.driver_id | COUNT dòng có driver_id, trạng thái hiện tại trong cohort | Có, không phải lịch sử phân công |
| Thời gian giao trung bình | deliveries.pickup_time,delivered_time | AVG số giây DELIVERED có hai mốc hợp lệ, kết thúc>=bắt đầu | Có cho khoảng lấy món→giao, không phải nhận phân công→giao |
| Thời gian nhận phân công | DeliveryService.accept | Chỉ setDriver, không lưu assigned_at | Không; không gán pickup_time thành thời gian nhận đơn |

## Quy ước thống nhất dự kiến

Cả hai báo cáo dùng cohort orders.created_at với khoảng nửa mở [from00:00,(to+1)00:00), ngày inclusive tối đa93, mặc định tháng hiện tại đến hôm nay. Business LocalDateTime theo ZoneId.systemDefault như writers hiện có; API trả timezone máy chủ, không tự chuyển UTC cột không offset. Không suy timezone lịch sử. Không gọi cohort là sự kiện hoàn tất trong kỳ. Đồ thị theo ngày tạo của cohort; không trộn paid_at cohort trong cùng báo cáo này.

Tỷ lệ đơn hoàn thành = completed/total*100; tỷ lệ giao thành công = delivered/assigned*100, mẫu số0 trả null. Thời gian trung bình trả null khi thiếu cặp timestamp hợp lệ. Tất cả bộ lọc áp dụng trước KPI/series/details/driver grouping và Excel. Đổi filter trạng thái sẽ đổi cả mẫu số và được ghi rõ trong UI/Excel.

OrderStatus: PENDING,CONFIRMED,PREPARING,READY,DELIVERING,COMPLETED,CANCELLED. DeliveryStatus: PENDING,PICKED_UP,DELIVERING,DELIVERED,CANCELLED. PaymentStatus: PENDING,SUCCESS,CANCELLED,REFUNDED. Không thêm enum/schema.

## Quan hệ và tính toàn vẹn

Order ManyToOne Customer/Restaurant; Delivery OneToOne Order và ManyToOne Driver; Payment OneToOne Order có UNIQUE(order_id). Baseline cũng UNIQUE deliveries.order_id. Không join order_details: không nhân số tiền theo số món, không N+1 vì dùng projection JDBC. Kiểu tiền BigDecimal/DECIMAL(12,2). Không có lịch sử đổi driver: nhóm theo driver hiện được lưu, không dựng số lần phân công giả.

Tái sử dụng convention /admin-management, ApiResponse, @PreAuthorize ADMIN, Spring JdbcTemplate, route/layout ADMIN và transport /api. Ba export cũ dùng RestaurantWorkbook ghi OOXML inline strings; writer hiện có không hỗ trợ hai sheet có cấu trúc độc lập/metadata và định dạng phần trăm, nên báo cáo cần writer OOXML chuyên biệt tái sử dụng XML escaping, giữ nguyên ba writer cũ, không thêm dependency.

Người dùng đã phê duyệt DB test fooddelivery_admin_reports trên instance độc lập3307. Đã xác minh UUID/datadir/version trước khi tạo đúng schema và account fixture mới; Main và các schema test cũ không dùng làm đích ghi. Sau khởi tạo sử dụng ddl-auto=validate. Các KPI không khả thi hiển thị rõ N/A, không tạo cột để bù dữ liệu thiếu. Kết quả tại admin-business-reports-result.md.

## Hiện thực và nghiệm thu

API bundle GET /admin-management/reports/orders và /delivery trả cùng snapshot KPI, series, chi tiết và nhóm tài xế; mỗi API có /export.xlsx. Page/size áp dụng tại SQL, size tối đa50; driverPage phân trang nhóm độc lập. Export giới hạn10.000 chi tiết và lấy đầy đủ nhóm tài xế trong cùng bộ lọc. Query read-only REPEATABLE_READ; giá trị lọc bind bằng JDBC, sort/identifier từ whitelist. Không thêm dependency hoặc sửa baseline/index.

Ngày biểu đồ trả DATE_FORMAT(created_at,'%Y-%m-%d') dạng chuỗi; timestamp chi tiết chuyển Timestamp→LocalDateTime→chuỗi trước JSON. Không để Jackson chuyển JDBC DATE sang UTC gây lệch ngày. UI chỉ định dạng các trường ngày bằng hàm wall-clock, không thay chữ T trong tên người dùng.

MySQL test đã đối chiếu bằng SQL thô từng bảng rồi tính oracle độc lập, gồm nhiều OrderDetail trên cùng Order, nhiều nhà hàng/tài xế, ngày đầu/thời điểm cuối ngày có microsecond, ngày ngoài kỳ, pending/refunded/missing paidAt, lệch amount, thiếu/âm thời lượng, danh sách rỗng, phân trang, quyền và Excel. Các probe âm chỉ sửa fixture trong schema mới và phục hồi trong finally.
