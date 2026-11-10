# Giai đoạn 7 — Nghiệp vụ và giới hạn quyền

Account role thực: CUSTOMER,RESTAURANT,DRIVER,ADMIN; status chỉ ACTIVE/DISABLED. Không LOCKED/approval/verified mới, không sửa role, không default ADMIN/password, không bootstrap HTTP. ADMIN mới cho concurrency chỉ là fixture riêng ở Stage7; không nâng quyền account hiện có. Auth/Admin bootstrap cũ giữ nguyên.

Status tài khoản khác activity hồ sơ. DISABLED thu hồi session và giữ business history; kích hoạt lại không khôi phục session đã revoke. Cấm tự-disable, kiểm actor/session sau chờ khóa và không để mất ADMIN ACTIVE cuối cùng. expectedStatus optional để tương thích; UI luôn gửi, mismatch409. ACTIVE→DISABLED→ACTIVE có thể khớp lại expectedStatus: không tuyên bố version/CAS chống ABA.

ADMIN tạo Restaurant/Driver bằng API hiện có, atomic Account+profile, email global UNIQUE và BCrypt12. Không tạo Customer thay người dùng hoặc ADMIN qua UI. Profile password cũ vẫn là cột tương thích, không credential source. Tạo không rõ kết quả phải đọc email/role chính xác, không tự phát lại POST hoặc coi không thấy ở page đầu là thất bại đã xác nhận.

Restaurant open/closed là boolean hiện có. Đóng cửa chặn thêm món/checkout mới theo backend; không tự hủy đơn đã nhận, xóa menu hoặc lịch sử. Driver driveStatus=false chặn nhận chuyến mới nhưng vẫn đọc/xử lý chuyến đã nhận. Không tự gắn driver_id, Admin assignment, BUSY/OFFLINE/FAILED/RETURNED hoặc GPS khi backend không hỗ trợ.

Full-profile PUT cũ giữ semantics/name/phone/address/activity/plate. Frontend xác nhận toàn bộ dữ liệu và preflight phát hiện thay đổi đã nhìn thấy, nhưng không có version/atomic conditional write ở các endpoint này. Không thay transaction/locking của chúng. Customer profile ở Admin chỉ giám sát; không sửa giỏ hay tạo/hủy đơn thay Customer.

Order/Delivery/Payment monitoring đọc dữ liệu server. OrderStatus/DeliveryStatus/PaymentStatus chỉ do writer cũ theo quyền Customer/Restaurant/Driver thay đổi. Giữ Order→Delivery cancel fix Giai đoạn6. Không sửa giá/phí/tiền snapshot, trạng thái online hoặc thu COD bằng suy đoán. COD là method; PaymentSUCCESS, OrderCOMPLETED và DeliveryDELIVERED được kiểm riêng. Không thêm refund/settlement/payout.

Review UI chỉ đọc và giữ nội dung gốc, render plaintext. Không giả audit history/moderation. Quyền DELETE rating ADMIN cũ vẫn tồn tại ở backend theo baseline; không mở action mới hoặc đổi ACL cũ để tuyên bố UI readonly là server cấm DELETE.

Reporting theo phase7-reporting-definitions.md: order cohort theo createdAt, recorded money theo paidAt với COMPLETED/SUCCESS/matching amount, delivery ratio mẫu số rõ, null khi không có terminal; không lợi nhuận/tiền thực nhận/driver income. Thống kê bằng query toàn tập không cộng một trang. LocalDateTime business theo JVM test HCM, không dùng session UTC làm timestamp kinh doanh.

Không có migration/schema mới. Stage7 schema-only/fixture synthetic, không đưa3row QA lỗi cũ vào dữ liệu mới và không hardcode blacklist ID trong API. Data/log lịch sử Stage1–6 được giữ checksum. Test cố ý tạo dữ liệu âm chỉ trong transaction/fixture riêng, lưu evidence trước dọn Stage7; không repair hoặc xóa QA cũ để che lỗi.
