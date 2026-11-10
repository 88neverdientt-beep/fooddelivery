# Giai đoạn 7 — Kiến trúc Admin Management

Feature frontend `src/features/admin-management` tách model/Zod, API adapters, shared mutation/recovery, typed table/filter, dashboard/reporting, account status, hồ sơ, tạo Restaurant/Driver và màn hình giám sát. Tái dùng AuthProvider/Session/API client/RoleGuard/QueryClient, RHF/Zod/Radix và design tokens hiện có. Không auth flow hoặc dependency mới.

## Phạm vi và nguồn dữ liệu

ADMIN lấy từ /auth/me và DB session, không từ role client hoặc JWT tự decode. Mọi /admin/* qua RoleProtectedRoute; server xác minh lại. Query key `['admin-management',accountId,...]`. Logout/chuyển phiên dùng cache clear/generation của auth hiện có. Hai ADMIN có quyền giám sát toàn hệ thống giống nhau; không nhầm quyền toàn hệ thống với ownership của Customer/Restaurant/Driver. Hồ sơ cá nhân ADMIN chỉ Me/email, không có entity/name editable giả.

Route-level lazy modules, list server-side filter/page20 (API tối đa50), stable ID sort, không load findAll rồi chia trang frontend. Table có caption/header/scroll region/tabIndex, không tràn toàn trang. Không dependency chart/map; đồ thị thanh có số liệu chữ và nguồn/kỳ rõ ràng, empty/null đúng dữ liệu. Không notifications/GPS/thu nhập giả. Refresh có kiểm soát bằng nút; không polling quá dày.

## Mutation và recovery

Không optimistic update, không retry POST/PUT sau network/5xx/contract failure. Ref lock chặn double submit trước cả re-render. Task gắn accountId/generation; kiểm lại sau await và trước bước ghi tiếp theo của preflight hồ sơ, trước cache/navigate. Callback cũ không được thực hiện PUT sau logout hoặc áp dữ liệu lên phiên khác.

Status tài khoản dùng expectedStatus từ form đã đọc. Khi response chưa rõ, GET đúng accountId; GET cũng hỏng thì giữ khóa và cho kiểm tra lại thủ công. Chỉ invalidate/hiển thị kết quả sau xác minh, không chỉ refetch một trang đã lọc và đoán account biến mất là thành công. expectedStatus không là version và không phát hiện ABA.

Restaurant/Driver full-profile PUT cũ: confirmation hiển thị các trường sẽ lưu, warning unsaved, preflight so các trường mutable với bản đã đọc để phát hiện form cũ. Đây không là CAS atomic; không sửa locking/schema của writer cũ hoặc tuyên bố chống mọi TOCTOU. Khi xung đột giữ draft để người dùng chủ động nạp dữ liệu hiện tại.

Tạo Restaurant/Driver dùng POST cũ, loại hồ sơ xác định bởi endpoint server, không gửi role/accountId hoặc confirmPassword. Password giữ nguyên byte và chỉ trong memory; không mặc định. Response Me chỉ dùng lấy ID liên kết, không thay phiên ADMIN bằng tài khoản vừa tạo. Thành công invalidate cache quản trị; kết quả POST không rõ thì xóa password khỏi form, khóa tạo lại, GET accounts có giới hạn và so email/role chính xác. Không tìm thấy trong trang đã đọc không chứng minh account chưa tồn tại; giữ khóa, cho đối chiếu danh sách, không phát lại POST.

## Backend

12GET mới đã được phê duyệt: AdminManagementController/Service/Dtos. Projections JdbcTemplate, tham số bind và whitelist filter/sort; count + LIMIT/OFFSET; aggregate toàn tập. Detail Order/Customer/Driver/Payment tái dùng API cũ; Delivery detail materialize OrderDTO trong transaction với OSIV=false. Không expose entity hoặc credentials/session/transaction code.

Status writer thay đổi theo phê duyệt riêng: khóa các ADMIN theo ID tăng dần trước target Account, refresh state, xác minh lại actor ACTIVE và session sau khi chờ; self-disable/last-active guard và optional expectedStatus409. Account→Session order theo auth hiện tại. Không đổi isolation toàn cục hoặc writer Order→Delivery/Payment/checkout. Việc serialize status qua tập ADMIN là đánh đổi tính nhất quán, chưa phải kiểm chứng tải lớn.

## Môi trường

Chỉ `fooddelivery_stage7_e2e` ở127.0.0.1:3307, schema-only từ Stage6, không sao chép business rows. Runtime validate/OSIV=false; app chỉ DML trên Stage7. JVM test riêng Asia/Ho_Chi_Minh cho business LocalDateTime; auth ClockUTC giữ nguyên. Sáu fixture migration hợp lệ mới đáp ứng regression cũ, không sửa assertion. Snapshot JUnit lưu trước khi dọn chỉ fixture Stage7 để seed E2E thật; không đụng database cũ. Ba QA8932/9840/10120 ở Stage6 giữ nguyên.

Credentials/keys/config/snapshots/log ở thư mục thử nghiệm ngoài Git. Backend18080 và preview4173 chỉ loopback, proxy rõ18080. Không điều khiển MySQL80 hoặc ghi3306/fooddelivery. Kết quả test/SQL/teardown xem phase7-test-results.md; không commit/push/deploy.
