# Giai đoạn 6 — Kiến trúc Driver Management

Feature frontend `src/features/driver-management` gồm model/Zod, API adapter, shared mutation/visibility hooks, Components, dashboard/analytics, list/detail/available/history và profile. Dùng React/TypeScript/Vite/Router/Query/RHF/Radix/design system sẵn có; không dependency mới hoặc auth riêng.

## Session, cache và mutation

Account đã xác minh từ /auth/me là nguồn duy nhất cho driverId. Key riêng ['driver-management',accountId,driverId,...]; response profile/list/detail/mutation kiểm owner và nested Delivery/Order consistency bằng Zod. Access token giữ trong Session memory; cookie refresh/CSRF/single-flight giữ nguyên. Logout/chuyển tài khoản clear cache theo AuthProvider hiện có. Không decode JWT để cấp quyền hoặc lưu token/password trong browser storage.

`useDriverAction` giữ ref lock chống double-submit, retry=false, capture accountId/generation cho từng thao tác; không áp response của actor cũ. Mutation không rõ kết quả (network/5xx/contract) đọc lại các query đang mở trước khi cho thao tác tiếp; lỗi refetch khóa nút, chỉ mở sau kiểm tra thành công. Thông báo không giả định thao tác đã thất bại hoặc thành công.

Available/accept có recovery riêng: lưu deliveryId+accountId+generation bất biến. Nếu mất response, GET detail own;200 dẫn đến detail thực,404 thì kiểm available để biết còn khả dụng hay không còn thuộc tập công khai. Không gửi lại POST. Nếu GET cũng hỏng, giữ khóa nhận chuyến và nút kiểm tra kết quả. Mọi continuation kiểm actor trước khi query/navigate. Không cho dữ liệu hoặc navigation của DriverA áp lên DriverB.

List/available/dashboard poll20giây, detail15giây khi visible và chưa terminal; dừng nền/trạng thái cuối. Nút refresh dùng API thật. Không WebSocket/GPS giả. Form hồ sơ dùng warning unsaved hiện có được chuyển nguyên logic sang components/ui/UnsavedChanges; Restaurant reexport lại để giữ hợp đồng cũ.

## Backend và dữ liệu

Bốn GET mới được phê duyệt, security role DRIVER và owner CurrentActor. List/available: count+bounded SQL projection, không hydrate collection hoặc quét dữ liệu toàn hệ thống trên client. Detail owner predicate trước Order fetch graph; không expose entity hoặc contact nhạy cảm mới. Analytics SQL toàn tập theo owner, labels all-time/current/period rõ ràng.

Ngoại lệ writer đã được người dùng phê duyệt: cancelOrder khóa Order rồi đọc lại Delivery bằng PESSIMISTIC_WRITE theo order_id. Bỏ entity Delivery đã cache khỏi persistence context trước khi nạp lại để tránh snapshot cũ làm mất driver_id hoặc bỏ sót Delivery vừa được tạo. Không đổi isolation toàn cục, transition, checkout/COD, cascade, schema hoặc dependency. Hai test MySQL xác định bằng latch kiểm snapshot rỗng trước confirm và snapshot trước Driver accept; xem báo cáo test. Driver self-accept là nghiệp vụ có sẵn, không thuật toán Admin phân công.

Runtime test chỉ fooddelivery_stage6_e2e,127.0.0.1:3307,validate/OSIV=false; backend18080 và previewlocalhost4173. Tất cả credentials/PEM/log/snapshot ở thư mục test ngoài Git; appDML-only trên Stage6, migrator chỉ Stage6. Sao chép nguồn Stage5 nhất quán chỉ đọc; checksum mọi test schema cũ. Không3306/fooddelivery. Xem phase6-test-results.md cho bằng chứng và teardown.
