# Tổng kiểm toán hệ thống — hồ sơ làm việc

Đợt kiểm toán mới bắt đầu ngày 11/11/2026. Các báo cáo Giai đoạn 1–8 được giữ
nguyên làm baseline; kết quả cũ không được tính là test mới.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/full-audit-20261111/`.
Thư mục này có credential/key/SQL fixture và cần được giữ riêng, không đưa vào Git.

## Finding đã tái hiện

- **MEDIUM, AUTH-01:** 401 của GET retry thuộc generation cũ có thể xóa phiên mới.
  Hai regression FAIL trước sửa; cả 16 test session PASS sau sửa. Sửa kiểm tra
  generation và cancellation trước khi thay đổi trạng thái phiên.
- **MEDIUM, DATE-01:** khoảng ngày mặc định của thống kê Driver có thể đi xuống
  năm 0. Regression biên FAIL trước sửa; ba test ngày PASS sau sửa. Chặn khoảng
  không hợp lệ trước mọi truy vấn, giữ nguyên công thức thống kê.
- **LOW, FORMAT-01:** formatter phát hiện README frontend chưa chuẩn hóa.
  Đã định dạng lại và chạy `format:check` thành công.
- **MEDIUM, MONEY-01:** formatter tiền dùng chung làm tròn giá DECIMAL(12,2)
  của backend về số nguyên, che mất phần lẻ trên menu/cart/checkout/report.
  Bốn regression FAIL trước sửa, bảy test formatter PASS sau sửa; bộ frontend
  hiện có 315 test PASS. Smoke checkout thật xác minh giá 25.000,25 và tổng
  90.000,75. Không thay giá, phí hoặc công thức backend. Ma trận build cũ được
  lưu riêng, toàn bộ E2E được chạy lại; bộ strict thêm một ca trên mỗi engine.

## Finding còn mở sau kiểm chứng mới

- **HIGH, WK-01:** lượt mới có 6 FAIL chính và 1 FAIL strict với assertion SameSite
  trùng nhau; còn log console riêng WEB-02 bên dưới. Observer cùng điều kiện xác
  nhận Chromium/Firefox chặn Strict trong cross-site POST, WebKit Windows vẫn
  gửi Strict. Không coi bảy test là bảy lỗi độc lập; không suy PASS phía sau FAIL.
- **HIGH, OPS-01:** chưa có môi trường production được xác minh. Domain/TLS,
  secret manager, limiting nhiều instance, giám sát/cảnh báo và deployment thật
  vẫn cần quyết định vận hành; không tự tạo hoặc triển khai.
- **MEDIUM, DEP-01:** audit mới ghi npm production0 advisory, full/dev7moderate,
  không high/critical; OSV88 thư viện runtime không có advisory khớp. Không tự
  nâng/hạ dependency hoặc coi snapshot advisory là bảo đảm vĩnh viễn.
- **MEDIUM, WEB-02, OPEN:** lượt mới tái hiện pageerror ở ca Customer khi cart
  request cùng origin bị hủy. Control native fetch có catch với abort/combined
  signal/navigation không tái hiện lỗi đó; chưa xác định đủ root cause để sửa
  hoặc quy cho runtime. Không bỏ assertion console vì đã có finding SameSite.

## Môi trường và ranh giới

Database mới `fooddelivery_full_audit` trên instance test `127.0.0.1:3307` là bản
sao logic được đối chiếu đủ 16 bảng. Account ứng dụng chỉ có DML trên database
này; Hibernate `validate`, OSIV tắt. Stage1–8 và các restore cũ chỉ được đọc để
đối chiếu. MySQL80 không bị điều khiển, không có kết nối kiểm thử vào cổng 3306.

Linux WebKit **BLOCKED** sau khi lệnh kiểm kê WSL bị từ chối cấp quyền; không chạy
lại lệnh bị từ chối. Không có Safari/macOS thật để xác minh và không giả lập kết quả.

Các file `full-audit-*.md` ở thư mục docs ghi kết quả kiểm chứng mới và các giới hạn
còn lại. Verdict cuối là **FAIL**; Linux/Safari được ghi BLOCKED riêng. Các phép
kiểm tra local đã kết thúc và tiến trình test đã dừng, nhưng các điều kiện Production
Ready chưa được đáp ứng.
