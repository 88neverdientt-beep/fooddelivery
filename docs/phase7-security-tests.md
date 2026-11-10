# Giai đoạn 7 — Phân quyền, bảo mật và đồng thời

12GET chỉ ADMIN ở HTTP và service. Inventory81endpoint (71business+10auth),486tổ hợp6actor; denied requests không thay đổi dữ liệu. Giữ69ACL cũ, JWT RS256/session DB/CSRF/refresh/logout/limiter. Không auth flow mới, role/userId client không cấp quyền.

DTO projections không SELECT password/token/private key/session/transactionCode; bulk lists tối thiểu, private detail trong quyền ADMIN. Query bind parameter + literal LIKE escape, sort/filter whitelist và page≤50. Không IDOR từ role thấp qua URL/body/query; ADMIN có scope toàn hệ thống hợp lệ nên hai ADMIN nhìn cùng business data là đúng quyền. Personal Me/session/cache vẫn phải đúng actor hiện tại.

Status: optional expectedStatus, xác nhận UI, không optimistic/retry, chính xác một PUT cho lost-response scenario. Khóa tập ADMIN trước Account target và Session, refresh actor/session sau chờ. Cross-disable không thể để cả hai actor đã xác thực cùng bị vô hiệu hóa; same expected state một200/một409; self/last-active guard; rollback khôi phục status và revocation. Revoked actor thất bại401 dù đã vượt xác thực trước lúc chờ khóa.

Frontend task gắn accountId/generation. Preflight hồ sơ phải kiểm lại trước PUT sau await; không gửi form cũ sau logout. Unknown mutation đọc đúng resource; GET cũng lỗi thì khóa/manual recheck. New create dùng API cũ, role cố định theo endpoint, password memory-only/không default/không normalize; không gửi confirmation/role/ID quản trị. Unknown POST không replay, clear password và kiểm email chính xác trong kết quả có giới hạn; không đoán vắng mặt là thất bại.

Real MySQL JUnit149 và frontend tests bao phủ bounds/privacy/LAZY/pagination/literal query/date/money/constraints/rollback/concurrency. Browser kiểm role guard + API denial, account search/filter/page, trạng thái hồ sơ không phá checkout/chuyến đang giao, Customer/Restaurant/Driver flow,2tab409,lost response,refresh/logout/switch/no storage secrets, responsive. Kết quả chạy thực xem phase7-test-results.md; không tính skipped/blocked là PASS.

Fault injection chỉ cắt response/request thật trong test, không mock business response. Console guard phân loại auth401 và network/409 theo endpoint/scenario cụ thể, không silence lỗi JS chung. Trace/video/screenshot tự động khi lỗi tắt; ảnh nghiệm thu chỉ dữ liệu QA và form mật khẩu trống. Test tạo hồ sơ xóa password DOM trong finally trước error context. Secret scan source/dist/docs/log và output test; không in giá trị secret.

Không có audit table/API bền vững; logger account event không được gọi là audit history. Chưa pentest độc lập, TLS production, multi-instance limiter, load/chaos hoặc Firefox/WebKit/thiết bị vật lý. Không schema/dependency mới, không ghi3306/fooddelivery, không sửa3QA lịch sử. Mọi tiến trình chỉ dừng sau xác minh sở hữu; Không can thiệp Vite5173 chưa xác định chủ sở hữu; trạng thái cổng hậu kiểm trong shutdown-proof.json.
