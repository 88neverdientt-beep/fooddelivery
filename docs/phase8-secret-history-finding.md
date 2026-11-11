# Giai đoạn 8 — Finding SEC-01: credential trong lịch sử Git

Severity: HIGH nếu credential từng dùng thật và chưa thu hồi; trạng thái xác minh rotation còn OPEN. Source hiện dùng biến môi trường không tự xóa giá trị khỏi lịch sử. Không in, hash riêng hoặc sao chép giá trị secret vào báo cáo. Audit chỉ đọc29commit/588textblob trong ref cục bộ; không truy cập remote, không rewrite/commit/push.

Hai blob của src/main/resources/application.properties có gán literal spring.datasource.password:

- Blob ea4d69ff23548f4f35ee163e0b55cfe5b099f05c; commit liên quan: f988341b51b177cec2ed6b47cd55628ce86196b6, 328eb7c84251f1a0101588ca824858316c48bc4d.
- Blob eab0877247314c4daaf2f61c5c5f39db8cef066b; commit liên quan: 328eb7c84251f1a0101588ca824858316c48bc4d, fef95dc2e17418b0f33353385ef60f5d11d919f2.

Reproduction an toàn: kiểm tra nội dung file tại commit bằng công cụ Git riêng của chủ dự án; không đưa giá trị vào chat/log. Chưa thử mật khẩu đó trên3306 hoặc hệ thống ngoài. Không kết luận credential vẫn active chỉ từ lịch sử.

Proposed fix: chủ hệ thống xác minh nơi dùng các credential đó và thu hồi/rotate nếu từng hợp lệ; cập nhật secret store ngoài Git, ứng dụng mới chỉ dùng credential quyền tối thiểu. Nếu có reuse ở môi trường khác phải rotate tại đó. Không cần reset Git để thu hồi credential; việc rewrite/remotes là thao tác riêng chỉ làm sau phê duyệt. Không tự sửa tài khoản MySQL80 hoặc secret production.

Required evidence: xác nhận người vận hành rằng mật khẩu cũ đã bị thu hồi/không từng dùng thật; giữ nguyên giá trị mới ngoài chat/Git. Chỉ có thể đóng finding sau xác nhận hoặc bằng chứng từ môi trường được phép. Các test Stage8 dùng password/key hoàn toàn mới không thuộc finding. Production verdict giữ blocker nếu chưa xác nhận; không trì hoãn phần localhost staging độc lập.

## Kết quả xác nhận

Người dùng xác nhận trong phiên: **đã thu hồi/đổi mọi nơi từng dùng**. Đóng finding bằng xác nhận của chủ hệ thống; agent không thử credential trên3306, không tự đổi password hoặc xác minh trực tiếp production. Hai blob vẫn tồn tại trong lịch sử và evidence được giữ; không coi việc dùng env hiện tại là tự thu hồi secret.
