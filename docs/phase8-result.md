# Giai đoạn 8 — Báo cáo cuối

## 1. Kết luận Giai đoạn 8

NOT PRODUCTION READY. Có các sửa lỗi và bằng chứng staging mới; chưa đạt đầy đủ browser/security acceptance gate.

## 2. Tổng quan hệ thống

Tái sử dụng Spring Boot/Java25, MySQL, React/Vite; bốn role CUSTOMER/RESTAURANT/DRIVER/ADMIN, account trung tâm, JWT RS256 và refresh rotation hiện hữu.

## 3. Lỗi phát hiện

CAS/ABA profile/status; CSP Zod JIT; date/MVC thành 500; MDC trùng key; auth snapshot; public queries bị auth restore hủy gây loading vô hạn; overflow catalog; mobile focus; test lazy-navigation abort; WebKit SameSite; race first-cart và deadlock giữa các khách tạo giỏ mới. Xem architecture/security/cross-browser và cart-concurrency-change-proof.json.

## 4. Lỗi đã sửa

Version precondition được duyệt; HTTP/date/logging/headers/management; vá Jackson/Tomcat; các sửa frontend/test. Cart tạo bằng DML transaction, đọc current dưới khóa, add chạy READ_COMMITTED khi mở transaction mới; giữ Customer serialization và global RR. Ba regression MySQL mới PASS; business body tính tiền/add/update/remove, lifecycle Order/Delivery/Payment không đổi.

## 5. Lỗi còn tồn tại

Browser chính 6 FAIL; strict 1 FAIL. Các finding platform và FAIL còn lại giữ nguyên trong evidence, chưa tự chuyển thành PASS.

## 6. CAS/ABA

@Version accounts/customers/restaurants/drivers, expectedVersion từ form gốc; compatibility default, strict staging. Migration chỉ Stage8. Menu dùng expected price/availability hiện hữu nên ABA menu nằm ngoài phạm vi đã duyệt; cart absolute-update semantics giữ nguyên.

## 7. Security

Không secret literal mới; RS256/refresh/CSRF hiện hữu giữ nguyên, CSP không unsafe-eval; HTTP/TLS/mgt kiểm tra riêng. Historical credential finding đóng bằng xác nhận thu hồi của operator, không dùng credential production để thử.

## 8. Database integrity

16 bảng, 45 checks; pass=True. Xem phase8-database-integrity.md.

## 9. Backend tests

172/172 PASS; FAIL=0, ERROR=0, SKIPPED=0.

## 10. Frontend tests

309/309 PASS; typecheck/lint/formatter/build PASS.

## 11. Playwright E2E

Chính 204/210 PASS, strict 11/12 PASS. Không retry/skip để làm xanh.

## 12. Cross-browser

Chromium/Firefox/WebKit, bốn width; xem từng batch và lỗi trong phase8-cross-browser.md.

## 13. Performance

pass=True; 2523 request, 230 đơn, 24/24 stages. Chỉ loopback SLO đã duyệt.

## 14. SQL optimization

EXPLAIN bốn truy vấn với owner có dữ liệu; không tự migration index, không suy capacity production từ fixture nhỏ.

## 15. Staging

Loopback18080/19090/18443 và MySQL3307, CA riêng, external credentials; Hibernate validate. Cả runtime và data/log được tách khỏi database hiện tại.

## 16. Backup/restore

16 bảng restore vào database mới; count/hash/schema/FK và boot validate thật trùng khớp; corrupted backup bị chặn. Giữ toàn bộ dữ liệu/log bên ngoài Git.

## 17. CI/CD readiness

Hướng dẫn unprivileged/protected test gates và kiểm tra zero-skipped; không bật remote pipeline hoặc auto-deploy.

## 18. Production configuration

Template env/app/nginx đã chuẩn bị để review, không áp dụng production; cần thực thi trên máy đích và phê duyệt riêng.

## 19. Responsive

375/768/1024/1440; focus/dialog/nav/overflow assertions, ảnh chụp. Xem kết quả thật theo browser, không tuyên bố mọi gate PASS.

## 20. Hồi quy Giai đoạn 1–7

JUnit hiện hữu chạy đủ; năm writer giữ checksum baseline. CartItemService thay phần tạo/đọc giỏ và isolation cục bộ, business body giữ nguyên có proof; SQL consistency và E2E các role/lost-response/concurrency được chạy lại trên JAR cuối.

## 21. File tạo/sửa

Xem phase8-files.txt, bao gồm chính manifest; không đưa private config, credential hoặc backup vào Git.

## 22. Database chính

Agent không ghi/kết nối thử nghiệm vào cổng 3306 hoặc điều khiển MySQL80; chỉ Stage8/restore trên3307. Dữ liệu database rehearsal cũ được đối chiếu checksum read-only.

## 23. Evidence lịch sử

Checksum file và database cũ trong preservation-proof.json. Không sửa các QA row cũ để làm xanh.

## 24. Không commit/push/deploy

Không commit/push hoặc liên hệ Git remote; HEAD được đối chiếu baseline. Không public deployment.

## 25. Blocker

HIGH: WebKit SameSite/browser gate chưa đóng; mọi FAIL còn lại cần xử lý theo report. Các giới hạn production ops nêu trong readiness doc.

## 26. Production readiness verdict

NOT PRODUCTION READY. Staging local có bằng chứng không tương đương nghiệm thu production.

## 27. Cần phê duyệt trước deploy

Môi trường browser thay thế, infrastructure/TLS/secrets/monitoring, production migration sau preflight+backup, release/rollback candidate và tải production. Chưa tự triển khai giai đoạn tiếp theo.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-20261110/logs/`. Không đưa credential, private key hoặc SQL backup vào Git.
