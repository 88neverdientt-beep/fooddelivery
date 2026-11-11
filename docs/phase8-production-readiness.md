# Giai đoạn 8 — Production readiness

## Kết luận: NOT PRODUCTION READY

Backend và frontend build/test nền tảng đạt, staging độc lập đã hoạt động, nhưng không được đồng nhất với production deployed. Browser gate chính pass=False; strict gate pass=False; performance gate pass=True.

Blocker mức HIGH của gate nghiệm thu: chưa đóng SameSite trên WebKit Windows; reproduction và observer nằm trong cross-browser report. Không tự đổi chính sách cookie. Cần môi trường WebKit được hỗ trợ khác/Safari thật và retest đủ security + E2E. Không còn FAIL 429 trong báo cáo cuối; finding fixture cũ giữ trong archive. Mọi FAIL/log console còn lại cũng phải được xác minh riêng trước khi đóng gate.

Giới hạn vận hành: HTTPS hiện tại là CA riêng loopback, chưa phải chứng chỉ/public DNS production. Nginx config là template chưa nginx-t trên máy đích. Chưa xác minh TLS termination/load balancer, secret manager, distributed rate limiter, shared multi-instance session behavior, alert delivery, OS service supervisor hoặc graceful draining thực tế production. Không hứa scale ngang từ test một JVM.

Cần phê duyệt trước deploy: hosting/OS/DNS/cert, lưu trữ secrets và backup mã hóa/retention/restore RTO-RPO, migration production sau read-only preflight và backup đã thử, cửa sổ triển khai/rollback candidate đã vá dependency, giới hạn tải production và monitoring/alert receiver. Không thực hiện các bước này tự động.

DDL còn chờ duyệt cho production: bốn cột version của accounts/customers/restaurants/drivers sau preflight riêng. Script Stage8 hiện tại hard-refuse production. Bản sửa Cart không cần schema hoặc dependency mới. Template giữ compatibility mode; việc bắt buộc precondition ở production cần duyệt riêng sau khi kiểm kê consumer.

CI đã có hướng dẫn và gate verify-test-reports; chưa chọn/kích hoạt remote CI/CD hay gửi secret lên provider. Dependency backend packaged OSV không còn advisory khớp tại thời điểm scan; npm production không advisory, còn 7 moderate dev lint cần theo dõi. Không gọi kết quả scan là bảo đảm không còn lỗ hổng.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-20261110/logs/`. Không đưa credential, private key hoặc SQL backup vào Git.
