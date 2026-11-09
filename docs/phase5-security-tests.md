# Bảo mật và đồng thời Giai đoạn 5

## Phạm vi đã thực thi

Bộ JUnit chạy filter chain + MySQL thật: inventory65endpoint (55business+10auth), ma trận6actor tương ứng390tổ hợp; bốn GET mới deny anonymous/CUSTOMER/DRIVER/ADMIN, chỉ RESTAURANT có principal hiện hành. Test profile projection sáu trường, orders theo owner/filter, catalog giới hạn, expected pair/409/legacy. Auth/refresh/CSRF/revoke/password/limiter/transaction tests cũ tiếp tục chạy.

Playwright/HTTP thật kiểm tra RestaurantB không GET/PATCH đơn A, không PUT menu/profile A, giả restaurantId không vượt quyền, Restaurant không POST catalog ADMIN, CUSTOMER không gọi bốn GET management. Test frontend role guard CUSTOMER/DRIVER/Admin,401 refresh,403/404,logout/logout-all và không giữ token trong browser storage từ suite cũ vẫn chạy. API công khai vẫn cho đọc thông tin public của cơ sở khác theo hợp đồng đã có; không coi đó là lộ private management.

Profile cập nhật thật rồi logout A/login B, input và tên sidebar không còn dữ liệu A. Private response không hash/JWT/session. Form không nhận owner/role. Không có JWT secret/password/PEM trong source/dist/docs. Kiểm tra bí mật/log chi tiết ở evidence ngoài Git; không đưa giá trị secret vào báo cáo.

## Đồng thời và kết quả chưa rõ

JUnit hai thread MySQL đồng thời và HTTP Promise.all xác nhận conditional PUT cùng baseline một200/một409, giữ giá thắng. Hai browser tab giữ bản nháp khi409, Save bị khóa đến xác nhận dùng bản mới. Confirm đồng thời một200/một409; confirm/Customer cancel cho kết quả cuối CANCELLED, không trạng thái mâu thuẫn.

HTTP concurrent price update/checkout kiểm tra order snapshot nằm ở một giá hợp lệ và tổng tiền nhất quán. Ngừng bán sau cart chặn checkout409 và cart còn nguyên. Đơn đã hoàn tất không đổi unitPrice sau đổi menu.

Fault injection chỉ ở Playwright: chuyển PUT thật đến backend, nhận200 rồi làm mất response tại browser. UI refetch đúng giá đã commit; đếm chính xác một PUT, không retry. Console guard chỉ phân loại lỗi mạng dự kiến cho path cụ thể; không bỏ qua lỗi JS chung. Production runtime không có mock.

Không có pentest bên thứ ba, kiểm thử tải lớn hoặc chứng nhận OWASP/WCAG toàn diện. Baseline comparison bảo đảm auth client/session/security service gốc không bị viết lại; chỉ mở bốn GET và conditional menu theo phê duyệt. Xem phase5-test-results.md để biết số liệu nghiệm thu cuối.
