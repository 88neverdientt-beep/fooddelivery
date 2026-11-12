# Main — nghiệm thu chuẩn bị bảo mật/runtime Bước A

Ngày bàn giao 13/11/2026, Asia/Saigon. Bằng chứng kiểm thử lưu trong thư mục mang ngày bắt đầu 20261112.

**PASS phần chuẩn bị và kiểm thử được phép; PARTIAL về khả năng khởi chạy Main.** HTTPS thực tế và MySQL VERIFY_IDENTITY chưa được xác minh. Chưa bootstrap ADMIN hoặc khởi chạy website.

## Cấu hình đã chuẩn bị

Đã rà soát runbook baseline, báo cáo app/COD và cấu hình SecurityConfiguration, JwtConfiguration, AuthProperties, AuthController, AuthService, SessionJwtConverter, AdminBootstrap cùng frontend transport/gateway/session.

- Datasource mẫu cố định fooddelivery_app, TCP127.0.0.1:3306/fooddelivery; runtime đề xuất sslMode=VERIFY_IDENTITY. Password đọc trong RAM từ file ngoài Git.
- Hibernate validate, OSIV=false, SQL init=never. Backend loopback18090, management loopback19100, forwarded headers=none.
- Origin đề xuất https://fooddelivery.localhost:8443, issuer cùng origin, audience fooddelivery-main; frontend VITE_API_BASE_URL=/api. Đây chưa phải URL đã hoạt động.
- Nginx Windows template chỉ listen127.0.0.1:8443, TLS1.2/1.3, SPA và /api proxy đến18090; không proxy management. Rewrite cookie path /auth thành /api/auth; không retry upstream mutation.
- Không thay Java ứng dụng, dependency, logic nghiệp vụ hoặc SQL. Không nới Secure/CSRF để chạy HTTP.

## Secret và RSA

Các vị trí ngoài Git:

- F:/New folder/fooddelivery-main-secrets/mysql-app.cnf
- F:/New folder/fooddelivery-main-secrets/main-jwt-private.pem
- F:/New folder/fooddelivery-main-secrets/main-jwt-public.pem
- F:/New folder/fooddelivery-main-security-step-a-20261112/main-runtime-inputs.json (chỉ đường dẫn credential và cấu hình không bí mật).

RSA mới3072 bit, exponent65537, CSPRNG của thư viện cryptography/OpenSSL; PKCS8 private PEM và X509 public PEM tương thích loader hiện có. Private PEM không mã hóa ở mức file; bảo vệ bằng ACL. ACL cuối thư mục secret và private key chỉ HIEU/SYSTEM; quyền sandbox tạm thời đã bỏ. Không ghi key/password/token vào report hoặc source. Công cụ từ chối overwrite key/config đang có, không tự rotation. Không chạy lại lệnh chuẩn bị để tạo khóa mới.

MainRsaReadCheck dùng chính JwtConfiguration và khóa Main, không HTTP/DB: **11 kiểm tra PASS**, gồm ký/verify RS256, kích thước khóa và từ chối issuer/audience/type/expiry/subject/session ID/chữ ký sai, HS256. Token chỉ tồn tại trong RAM.

## Cookie và phiên

12/12 MainRuntimeSecurityTest PASS qua FilterChain, Controller, AuthService, encoder/decoder thực tế. Repository và EntityManagerFactory là mock, dữ liệu chỉ trong RAM, transaction manager no-op. Không chứng minh rollback/locking MySQL hoặc hành vi browser/TLS thực.

- fd_refresh: Secure, HttpOnly, SameSite=Strict, host-only, path/auth ở backend; proxy đổi sang/api/auth.
- XSRF-TOKEN: Secure, SameSite=Strict, path/, cố ý không HttpOnly để hỗ trợ CSRF.
- Thiếu CSRF bị403; CORS chỉ origin chính xác với credentials; origin ngoài danh sách bị403.
- Servlet session stateless. Access mặc định10 phút; refresh session tối đa7 ngày tuyệt đối, rotation không kéo dài phiên. TTL có thể cấu hình qua AuthProperties/YAML, access phải ngắn hơn refresh.
- Refresh lưu SHA256 digest; rotation đánh dấu token cũ, replay thu hồi phiên; logout/logout-all thu hồi và xóa cookie. Phiên hết hạn/account DISABLED bị từ chối.
- Role lấy từ Account trong session, claim role giả không nâng quyền CUSTOMER lên ADMIN.
- Frontend gửi credentials include, token trong bộ nhớ, mutation không tự retry, gateway lấy CSRF trước auth POST. Không thêm secret vào VITE variables.

## Datasource và dữ liệu Main

Login Path dưới HIEU chỉ dùng cho operator SELECT/SHOW; JDBC/JPA checker dùng fooddelivery_app@127.0.0.1. TCP/TLS REQUIRED và Hibernate validate16 entity PASS; repository COD thật trả đúng1 lựa chọn active. **Kiểm tra này chưa dùng VERIFY_IDENTITY**, không đánh đồng với runtime TLS identity đã sẵn sàng.

Main trước/sau giống nhau:16 bảng,16PK,21FK,13UNIQUE,6CHECK,45 index; payment_methods có1 COD,15 bảng khác0 dòng. accounts/auth_sessions/refresh_tokens đều0. Quyền app vẫn4DML duy nhất trên fooddelivery.*. Nội dung credential không đổi. SHA của5 file backup trước DDL giữ nguyên.

Không truy cập database hanoi_food hoặc3307, không DDL/migration, không checkout, không tạo tài khoản/ADMIN, không thay MySQL80 service/firewall/hosts/trust store, không commit/push/deploy.

## Build và test

- JDK25.0.4/Maven3.9.16, clean package offline: BUILD SUCCESS.
- JUnit231 tổng: **108 PASS,0FAIL,0ERROR,123SKIPPED**. Bao gồm12 test tích hợp RAM mới.123 test MySQL opt-in giữ tắt để tuân thủ giới hạn không ghi Main/3307.
- Python75/75 PASS, gồm15 test mới về datasource pinning, origin, TLS downgrade, bootstrap guard, secret loader và không overwrite key.
- Frontend TypeScript typecheck PASS; Vitest340/340 PASS,36 file.
- RSA11/11 kiểm tra ngoại tuyến PASS, độc lập số JUnit.

Các lỗi ban đầu chỉ thuộc harness: import Role trùng tên, Spring JDK proxy không khớp concrete injection, thiếu mock EntityManagerFactory. Đã sửa harness và chạy lại thành công. Maven cache yêu cầu chạy dưới HIEU; ACL thư mục chuẩn bị đã điều chỉnh có giới hạn. Không sửa ACL backup hoặc datadir MySQL.

## Điều kiện còn thiếu và ADMIN

Chưa có chứng chỉ HTTPS Main được xác minh, chưa chốt hostname/resolution/trust; không tìm thấy nginx.exe trên PATH nên chưa chạy nginx -t hoặc browser HTTPS. Template không phải dịch vụ đã triển khai.

MySQL public CA/server certificate trong datadir bị ACL chặn đọc metadata trong lượt kiểm tra; không đổi ACL/datadir. Cần operator cung cấp bản public CA/certificate an toàn, xác minh SAN phù hợp127.0.0.1, trust chain và kết nối VERIFY_IDENTITY bằng app. Không kết luận certificate hiện sai khi chưa đọc được. Không tự hạ sslMode.

LoginLimiter hiện là bộ đếm trong một process, proxy làm direct peer thành loopback; không coi là gateway rate limit cho Internet. Chỉ chuẩn bị chạy cục bộ.

Schema/quyền/RSA đã sẵn sàng về nền tảng. **Chưa đủ điều kiện bật Main với cấu hình TLS đề xuất.** Bootstrap dùng CLI hiện có, cần phê duyệt riêng sau khi chốt datasource TLS và thông tin ADMIN; không có ADMIN mặc định. Hướng dẫn tiếp theo tại main-security-runtime-runbook.md.

## File và bằng chứng

Sửa deploy/main.env.example, deploy/nginx-main.windows.example.conf, deploy/application-main.example.yml; thêm tools/deployment/main_runtime_security.py, test_main_runtime_security.py, MainRsaReadCheck.java, check_main_step_a.py và src/test/java/vn/gaugaugau/fooddelivery/auth/MainRuntimeSecurityTest.java. Thêm báo cáo/runbook Bước A, cập nhật liên kết runbook baseline. Những thay đổi có sẵn khác trong working tree không thuộc lượt này.

Evidence: F:/New folder/fooddelivery-main-security-step-a-20261112/ gồm preparation-result.json, read-only-verification.json, index-verification.json, final-checks.json, backup-preservation-before.json, python-tests.log, maven-full.log, frontend-typecheck.log, frontend-tests.log và build/target/surefire-reports. Giữ dữ liệu/log, không có website Main được khởi chạy.
