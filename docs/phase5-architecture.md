# Kiến trúc Giai đoạn 5 — Restaurant Management

Triển khai trên backend và React hiện có. Không thay auth, dependency, schema hoặc transaction checkout/delivery/COD. Bốn GET và PUT có điều kiện được người dùng phê duyệt riêng trong lượt này.

## Frontend

Feature `src/features/restaurant-management` gồm model/Zod, adapter API, shared hooks, dashboard/analytics, hồ sơ, menu, đơn hàng và reviews. Route lazy load từng module; dùng Workspace/RoleGuard/AuthProvider/Session/HTTP/QueryClient và các control/dialog/toast hiện có. Không refresh JWT bằng một cơ chế khác.

Query key riêng `['restaurant-management', accountId, restaurantId, ...]`. Mọi ID nhà hàng lấy từ account đã được `/auth/me` xác minh. Response menu/order/private profile được kiểm tra schema và owner. List dùng phân trang database, không tải toàn tập để giả phân trang. Mutation retry=false, khóa đồng bộ bằng ref, ghi nhận accountId/generation bất biến; kết quả từ phiên cũ không làm toast/cache phiên mới. Logout và đổi tài khoản dùng cơ chế xóa cache hiện hữu.

`useAction` chỉ cập nhật UI từ response/refetch. Lỗi mạng hoặc5xx là kết quả chưa rõ: đọc lại các query đang mở trước khi mở khóa; nếu đọc thất bại giữ khóa và nút kiểm tra máy chủ. POST thêm món có kết quả chưa rõ không tự gửi lại; chuyển danh sách đối chiếu. Form menu giữ baseline và bản nháp riêng;409/refetch phát hiện thay đổi thì khóa Save, chỉ rebase sau xác nhận. React Hook Form/Zod và useBlocker/beforeunload cảnh báo rời form.

Đơn đang mở poll20giây khi tab visible; dừng ở trạng thái cuối và không poll nền. Không có WebSocket/notification giả. Các chart dùng dữ liệu aggregate thật, DOM đơn giản, không thêm chart library. Font/token/icon và màu kem/cam theo design system cũ.

## Backend đọc

RestaurantManagementController → RestaurantManagementService `@Transactional(readOnly=true)` + `@PreAuthorize(RESTAURANT)`. SQL parameterized luôn có `restaurant_id` từ CurrentActor. Catalog loại các món đã liên kết. Orders truy vấn ID có LIMIT/OFFSET/count, sau đó fetch graph giới hạn bằng repository hiện có và mapper OrderService; tránh pagination trên collection. Analytics tổng hợp bằng SQL toàn tập trong phạm vi được phép, khoảng tối đa93ngày. Profile chỉ sáu trường cần thiết.

SecurityConfiguration thêm bốn exact GET matcher. Guard frontend không thay bảo mật backend. Public catalog/review API vẫn theo quyền public cũ; xem public khác với quản trị.

## PUT menu có điều kiện

DTO thêm expectedPrice/expectedIsAvailable optional, phải đủ cặp. Nhánh mới khóa dòng, refresh rồi dùng atomic compare-and-update với predicate cả hai expected; số dòng cập nhật khác1 trả409. Refresh entity trước mapping. Không sửa bảng/version/cascade. Client cũ không có expected giữ hành vi trước đây; đây là giới hạn tương thích có chủ ý, không tuyên bố mọi client cũ được bảo vệ khỏi overwrite.

## Dữ liệu và vận hành

Chỉ `fooddelivery_stage5_e2e` tại127.0.0.1:3307 được ghi. Dữ liệu nền sao chép nhất quán chỉ đọc từ Stage4 test; fixtures QA mới qua API. Runtime validate/OSIV=false; app DML-only, migrator riêng cho negative migration regression. Credentials/PEM/log/evidence ở thư mục test ngoài Git. Không ghi3306, không migrate production, không deploy. Xem phase5-test-results.md và phase5-business-rules.md.
