# Giai đoạn 7 — Định nghĩa báo cáo đã phê duyệt

API aggregate và các định nghĩa này đã được người dùng phê duyệt. Không gọi gross order value là lợi nhuận/doanh thu thực nhận. Không tính từ một trang danh sách; mọi phép tính ở MySQL, decimal BigDecimal, không join OrderDetail vào SUM(Order.totalAmount). Không áp migration. Bằng chứng cuối đối chiếu API với phép tính độc lập từ raw SQL rows, không chỉ lặp nguyên aggregate SQL của implementation.

## Thời gian

Date ISO inclusive, default30ngày, tối đa93ngày. Mỗi series có timestamp riêng, nhãn hiển thị và predicate `timestamp >= from 00:00 AND timestamp < (to + 1 day) 00:00`. Không BETWEEN tới23:59:59 làm mất microsecond. Ngày ngoài ISO/phạm vi hoặc đảo kỳ trả400. Preset hôm nay/7/30 dùng ngày business do backend trả, không phụ thuộc UTC date của browser.

Business timestamps hiện là LocalDateTime không offset, do JVM/Hibernate tạo. Analytics trả timeZone=ZoneId.systemDefault().getId() đúng writers hiện tại. Runtime Stage7 được đặt riêng `-Duser.timezone=Asia/Ho_Chi_Minh`; không đổi Java hệ thống/config production hoặc dữ liệu cũ. Query dùng business wall time, không thêm CONVERT_TZ lên LocalDateTime, không gán auth_sessions timestamps (ClockUTC) vào business reports. Không thể suy lại timezone lịch sử từ cột không offset; production muốn đổi quy ước phải có kiểm toán riêng.

## KPI và SQL đối chiếu

- Tổng Customer/Restaurant/Driver/Account/Order: COUNT toàn bộ từng bảng, nhãn “mọi thời gian”; không coi disabled profile đã bị xóa. Số trong kỳ tách riêng.
- Đơn trong kỳ: orders.created_at; nhóm OrderStatus thực (PENDING,CONFIRMED,PREPARING,READY,DELIVERING,COMPLETED,CANCELLED), total=SUM nhóm. Completed/cancelled là trạng thái hiện tại của cohort đơn tạo trong kỳ, không gọi số hoàn tất/hủy tại thời điểm kỳ vì không có completedAt/cancelledAt.
- Giá trị đơn chưa hủy trong cohort: SUM(total_amount) của status<>CANCELLED, gồm cả chưa thu; nhãn “Giá trị đơn chưa hủy”, tuyệt đối không “đã thu”. Daily orders dùng DATE(created_at).
- “Giá trị thanh toán thành công đã ghi nhận”: ordersCOMPLETED JOIN paymentsSUCCESS, amount=total_amount, paid_at có thật trong kỳ. SUM(amount) chỉ một Payment/Order theo UNIQUE; đồng thời trả SUM(subtotal) và SUM(shipping_fee), kiểm amount=subtotal+ship. Loại CANCELLED/REFUNDED/PENDING, thiếu paidAt hoặc amount không khớp. Không gọi là doanh thu nền tảng, lợi nhuận, tiền đã đối soát hay restaurant payout. Daily money theo DATE(paid_at), không ngày tạo Order. Đây là ghi nhận hệ thống, không chứng minh tiền mặt đã được đối soát thực tế.
- Phương thức thanh toán: cohort payments.created_at, COUNT theo methodCode, trả count và successfulCount để phân biệt pending/success. Không suy COD=SUCCESS. Method thiếu FK hiển thị chưa rõ, không tự COD.
- Giao hàng: JOIN orders theo order_id, cohort orders.created_at, nhóm DeliveryStatus hiện tại. “Tỷ lệ giao hoàn tất trong chuyến đã kết thúc”: DELIVERED/(DELIVERED+CANCELLED)*100 trên cùng cohort; null khi denominator0. Không gán tỷ lệ này cho mọi chuyến đã nhận trong kỳ, không gọi hiệu suất hoặc SLA. Không có assignedAt/cancelledAt để tính sự kiện phân công/hủy theo ngày.
- Top nhà hàng: cohort orders.created_at, COUNT tổng đơn và COUNTCOMPLETED, nhóm restaurant_id/name, tối đa10, tie-break ID. Không cộng menu join nhân số đơn.
- Top tài xế: DeliveryDELIVERED có delivered_time trong kỳ, nhóm driver_id/name, COUNTcompleted, tối đa10, tie-break ID. Không tính thu nhập/COD earnings hoặc thời gian từ phân công không có.

Kiểm SQL độc lập bằng query riêng cho mỗi nguồn; fixture ở đúng ranh giới00:00, cuối ngày có microseconds, đầu ngày kế tiếp; completed nhưngPaymentPENDING; PaymentSUCCESS sai amount/thiếupaidAt; OrderCANCELLED; refunded; denominator0; nhiều OrderDetail để bắt double-count; dữ liệu ngoài page đầu; ngày chuyển tháng/năm. Fixture âm chỉ trong transaction/test riêng và rollback; không đưa vào E2E nghiệm thu aggregate.

## Bằng chứng QA lịch sử

Database mới Stage7 lấy **schema-only** từ Stage6, không business rows hoặc tài khoản cũ; seed synthetic hợp lệ. Các database Stage1–6 giữ checksum. Ba row QA8932/9840/10120 ở Stage6 giữ nguyên, không sao chép vào dữ liệu nghiệm thu Stage7. Backend không chứa ID blacklist QA hoặc điều kiện đặc biệt chỉ để báo cáo đẹp. Nếu phát hiện row bất nhất mới trong Stage7, báo lỗi và kiểm chứng/sửa code sau phê duyệt cần thiết, không lặng lẽ loại khỏi thống kê.

Không exportCSV/Excel/PDF hoặc PII bulk trong lượt này; UI đọc aggregate/projections tối thiểu. Audit bền vững, refunds/settlements và income chưa có backend, công khai giới hạn.
