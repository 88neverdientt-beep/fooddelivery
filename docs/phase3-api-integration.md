# Tích hợp API Giai đoạn 3

Đã đọc implementation Controller/DTO/Security/GlobalExceptionHandler và test Giai đoạn 2. Không tạo endpoint giả. Base public mặc định /api; URL backend chỉ thuộc Vite proxy server, không chứa DB/key/credential. Response trừ /auth/csrf và 204 là envelope {status,message,data,errorCode,timestamp}; frontend lấy data và kiểm tra schema, không render message nội bộ tùy ý.

## Endpoint sử dụng

- GET /food-items: danh mục công khai. Frontend chỉ đọc category, bỏ trống/null và gộp nhãn khác hoa/thường để hiển thị nhóm món trên trang chủ. Đây là danh mục thật, không giả lập bộ lọc nhà hàng theo danh mục.

- GET /auth/csrf: response trực tiếp {headerName: X-XSRF-TOKEN, token}. Browser giữ cookie XSRF-TOKEN Secure, Path=/; frontend giữ token CSRF tạm trong request. Không đọc refresh cookie.
- POST /auth/login: {email,password}, trả Tokens {accessToken,tokenType:Bearer,expiresIn,account:Me}. CSRF + credentials include, không tự retry. Sau thành công gọi GET /auth/me để xác nhận Account trước render/redirect.
- POST /auth/register/customer: {name,email,password,phoneNumber,address}. Không gửi confirmPassword, role hoặc ID. Account/Customer do backend tạo atomic; 201 Me. Email trùng 409 hiển thị thông báo cụ thể, các lỗi khác không suy diễn đã tạo thành công.
- POST /auth/refresh: không body, cookie + CSRF, trả Tokens và cookie rotated. Khóa chung liên tab bao cả CSRF và refresh; không đọc JWT claims để phân quyền.
- GET /auth/me: Bearer, trả Account ID/email/role/status/profile IDs. Schema yêu cầu ACTIVE và đúng cấu trúc liên kết role. Lấy role/ID từ server, không body/query/URL tự khai báo.
- POST /auth/logout: cookie + CSRF, 204; clear state/cache sau ACK. POST /auth/logout-all: Bearer + CSRF, 204; cũng clear identity ở tab khác. Cookie xóa đúng path đã proxy rewrite.
- POST /auth/change-password: {currentPassword,newPassword}, Bearer + CSRF, 204. Confirm chỉ ở UI. Thành công thu hồi mọi phiên, UI trở lại login. Không replay POST khi sai password/không chắc request đã xử lý.
- GET /restaurants: PublicRestaurant[] {restaurantId,name,address,restaurantStatus}. GET /restaurants/{id}: PublicRestaurant. Không tự bổ sung email/phone/rating/ETA.
- GET /restaurant-food-items: menu[] với restaurantFoodItemId, price, isAvailable, restaurant{restaurantId,name,address}, foodItem{itemId,name,category,description}. Frontend lọc theo restaurantId để hiện thực đơn vì backend chưa có list menu theo nhà hàng riêng. Bỏ qua phoneNumber null; không fetch dữ liệu riêng tư ngoài scope.
- GET /customers/{customerId}, /drivers/{driverId}: hồ sơ của principal. GET /restaurants/{restaurantId} chỉ trả profile public; email lấy từ /auth/me, không có API đọc phone riêng của chủ nhà hàng. ADMIN không có business profile; chỉ hiển thị /auth/me.

## Validation và lỗi

Customer: name 1..100, email <=255 hợp lệ/normalize, phone 1..15, address 1..255. Mật khẩu mới >=12 codepoints và <=72 UTF-8 byte, không trim/lowercase. Login hỗ trợ mật khẩu legacy ngắn, vẫn giới hạn byte. Confirm không gửi backend. Form báo lỗi tiếng Việt liên kết input; server là kiểm tra cuối cùng.

400/422 dữ liệu sai; 401 login sai dùng thông báo generic, protected session bị thu hồi/hết hạn dẫn xác minh/refresh một lần; 403 quyền/CSRF; 404 tài nguyên không có/ngoài scope; 409 conflict; 429 limiter; 5xx máy chủ; timeout/network riêng. Không hiển thị stack trace hoặc SQL. Abort query khi unmount/chuyển identity; không retry mutation tự động. Logout lỗi mạng không giả vờ backend đã thu hồi cookie.

## CORS, cookie và local

Dev/preview giữ Host gốc, không đổi Origin hoặc tắt CSRF. /api prefix được bỏ ở upstream. Chỉ rewrite Set-Cookie Path=/auth → /api/auth để cookie gửi đúng URL browser; Secure, HttpOnly, Strict giữ nguyên. Browser Chromium thật trên localhost xác nhận cookie/CSRF, reload/rotation/logout. 127.0.0.1 là upstream độc lập, browser luôn localhost; không trộn origin giữa tab. Production cần HTTPS/reverse proxy/CORS allowlist chính xác, không có wildcard hoặc credential VITE.

## Giới hạn backend được tôn trọng

Chưa có pagination/search server: lọc/pagination trên danh sách public đã tải, UI ghi rõ. Menu list hiện tải toàn bộ rồi lọc local; cần endpoint/pagination riêng khi có tải lớn, phải duyệt backend thay đổi. GET restaurant profile không cung cấp contact riêng của chủ. Không có forgot-password/email verification/role change API, frontend không tạo liên kết hoặc chức năng giả. Limiter backend một instance có thể gộp IP sau proxy; E2E không tắt limiter và dùng fixture/lượt chạy kiểm soát. Không gọi API ghi Cart/Order/Delivery/Payment/Rating trong runtime Giai đoạn 3.

Không có thay đổi Java, security, schema hoặc dependency backend để tích hợp frontend. MySQL test chỉ 3307/rehearsal; không dùng production, không sửa 88 hash và không reset evidence. Xem phase3-result.md cho số liệu kiểm thử.
