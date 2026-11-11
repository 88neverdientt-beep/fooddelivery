# Giai đoạn 8 — API contract audit

Inventory ứng dụng hiện có được đối chiếu từ Spring handler mappings trong
`SecurityMySqlIntegrationTest`; ma trận 81 endpoint nằm tại
[security-endpoints.md](security-endpoints.md). Không thêm business endpoint trong
Giai đoạn 8. Actuator ở port management được kiểm tra HTTP riêng, không gộp vào
inventory business controller.

Các nhóm được hồi quy gồm auth/session/password, Customer/Cart/Order/rating,
Restaurant profile/menu/order/report, Driver availability/trip/COD/report và Admin
account/profile/monitoring/report. Các test inventory kiểm tra anonymous, bốn role
và tài khoản disabled, so checksum khi bị từ chối; positive mutation có rollback và
được bổ sung bằng luồng HTTP thật. Không suy ra rằng mọi tổ hợp payload đều đã thử.

Role và profile ID lấy từ principal được xác minh với account/session trong MySQL.
Các ID trên URL/body vẫn phải qua ownership; biết ID hoặc version không cấp quyền.
DTO output không chứa password/hash, signing key, refresh token/hash hoặc session
secret. Các projection/whitelist test vẫn chạy, chỉ bổ sung trường version đã duyệt.

Thay đổi contract có chủ đích:

- Profile Customer/Restaurant/Driver và trạng thái Account nhận optional
  `expectedVersion`, trả thêm `version`. Mặc định compatibility giữ request cũ;
  stale revision trả 409. Strict mode test yêu cầu revision và trả 428 khi thiếu.
  Giá trị âm hoặc JSON không hợp lệ trả 400. UI giữ revision của form, không tự
  lấy revision mới để ghi đè draft. Production strict chưa được bật/phê duyệt.
- DELETE disable profile cũ không có chỗ gửi revision, nên bị 428 khi bật strict;
  Admin UI hiện dùng PUT account status có revision. Cần kiểm kê consumer trước
  mọi rollout strict; không tuyên bố mọi client ngoài repository đều tương thích.
- Missing parameter/type error, method không hỗ trợ, Accept và Content-Type không
  hỗ trợ giữ đúng 400/405/406/415; 405 giữ Allow. Lỗi server chưa dự kiến vẫn là
  generic 500, không đổi tất cả thành lỗi client hoặc trả raw SQL/stack.
- Hai add-item hợp lệ của cùng khách được giữ cả hai lượng cộng, kể cả giỏ đầu
  tiên. Sửa transaction/current read không đổi DTO, tiền, phí hoặc status thành công
  201. Absolute quantity update vẫn giữ semantics cũ; không nhận là CAS/ABA.

Các danh sách mới dùng pagination tại database, giới hạn 50, sort/filter whitelist
và range ngày tối đa 93; analytics aggregate toàn tập trong kỳ, không tính từ một
trang UI. API list cũ còn tồn tại cho compatibility và không phải lựa chọn export
dữ liệu lớn. Xem định nghĩa KPI Giai đoạn 5–7 và đối chiếu SQL trong báo cáo database.

Không có automatic POST/PUT retry khi không biết response đã commit hay chưa.
Checkout/status/COD dùng khóa, kiểm trạng thái và read reconciliation; E2E có
lost-response, hai tab và race. JWT được kiểm tại admission, không cam kết hủy
transaction đã được nhận khi token hết hạn hoặc session bị thu hồi giữa chừng.

Kết quả chính xác, bao gồm FAIL WebKit còn lại, nằm trong
[phase8-test-results.md](phase8-test-results.md) và
[phase8-cross-browser.md](phase8-cross-browser.md). Bằng chứng nằm ngoài Git trong
thư mục thử nghiệm Phase8; không có production mutation hoặc migration từ audit này.
