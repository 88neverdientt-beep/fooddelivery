# Bàn giao Giai đoạn 5 — Restaurant Management

**Giai đoạn5 đủ điều kiện hoàn thành trong phạm vi đã phê duyệt**, với126/126JUnit,224/224frontend và34/34Playwright PASS;0FAIL/ERROR/SKIPPED. Typecheck, lint, formatter, build PASS. Nền tảng sẵn sàng để bắt đầu Giai đoạn6 sau quyết định tiếp theo của người dùng; chưa triển khai Giai đoạn6.

## Chức năng và route

Restaurant đăng nhập bằng auth hiện có; dashboard thật, thông tin nhà hàng sửa được, menu chọn catalog/thay giá/bật-ngừng bán/xóa theo FK, danh sách đơn tìm/lọc/phân trang, detail/xác nhận/chuẩn bị/ready/hủy theo rule, reviews chỉ đọc và analytics toàn tập. Route mới: /restaurant/dashboard,/profile,/menu,/menu/new,/menu/:id/edit,/orders,/orders/:id,/reviews,/analytics dưới prefix Restaurant. Tài khoản/password/sessions/logout giữ luồng hiện hữu.

Giá đơn cũ bất biến; Customer checkout và trạng thái nhận đúng từ server. Tổng tiền/stat không lấy từ một trang hoặc demo; giá trị món COMPLETED+PaymentSUCCESS theo paidAt loại shipping, trước đối soát, không phải thực nhận/lợi nhuận. Không còn API bắt buộc bị chặn phê duyệt.

## Backend đã được phê duyệt

Bốn GET /restaurant-management/profile,/catalog,/orders,/analytics, CurrentActor scope;65endpoint tổng,61cũ giữ quyền. Conditional PUT /restaurant-food-items/{id} thêm optional expectedPrice/expectedIsAvailable đủ cặp, atomic CAS trả409 stale, client cũ giữ hành vi. Không sửa checkout/order/delivery/payment business service, schema, cascade hoặc dependency. Danh sách hợp đồng và capability matrix trong [API](phase5-api-integration.md).

## Nghiệm thu

- Backend126:119cũ+7MySQL mới; filter-chain role/owner/schema/rollback/cascade/LAZY/query bound.
- Frontend224:200cũ+24mới; validation, identity, form/draft/cache/mutation.
- E2E34:24cũ+10Restaurant, MySQL thật, retry0,0flaky. Hồi quy đầy đủ Customer và Authentication.
- OwnerA/B, giả ID, role denial, logout/cache isolation PASS. Parallel CAS/confirm/cancel/price-checkout và lost-response PASS.
- Responsive bốn chiều rộng,36ảnhRestaurant/tổng164ảnh. Entry464714byte, khôngJS chunk>500kB.
- SQL order/payment/detail và sáu aggregate so API khớp. Stage1/2/4 checksum không đổi; không ghi3306/fooddelivery hoặc đổi production schema. MySQL80 vẫn chạy; đúng backend/preview/MySQL test đã được dừng sau kiểm tra, datadir/log giữ lại (xem shutdown-proof).

Chi tiết số liệu, lỗi đã sửa và đường dẫn bằng chứng: [kết quả kiểm thử](phase5-test-results.md). File tạo/sửa: [manifest](phase5-files.txt). Thiết kế: [architecture](phase5-architecture.md), [routes](phase5-restaurant-routes.md), [business rules](phase5-business-rules.md), [security](phase5-security-tests.md).

## Giới hạn

Chưa có API upload ảnh/description riêng, Restaurant tạo catalog chung, phản hồi đánh giá, ledger đối soát/payout hoặc notification realtime; không làm chức năng giả. Không có migration cần phê duyệt. Conditional CAS không bảo vệ client cũ không gửi expected, không phát hiện ABA. Chưa test production HTTPS, Firefox/WebKit, thiết bị vật lý/tải lớn hoặc pentest độc lập. Các giới hạn này được ghi rõ, không còn chức năng bắt buộc đã phê duyệt chưa kiểm chứng.

Không commit, push hoặc deploy. Không đổi auth nền tảng, không thay dữ liệu các database cũ. Untracked file người dùng có từ đầu “h github main” được giữ nguyên.
