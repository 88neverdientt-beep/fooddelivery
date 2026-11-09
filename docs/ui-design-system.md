# HanoiFood — Hệ thống giao diện

Áp dụng cho frontend hiện tại; không đổi API, backend, schema hoặc luồng xác thực.

## Màu và typography

Token dùng chung nằm trong `frontend/src/app/styles.css`. Cam thương hiệu `#F97316`, nền `#FFFDF9`, surface trắng, chữ chính `#1F2937`, chữ phụ `#6B7280`, viền `#E5E7EB`. Nút nền đậm dùng `#C2410C`, hover `#9A3412` để chữ trắng đạt tương phản AA; màu cam sáng giữ vai trò nhận diện. Success `#15803D`, error `#DC2626`. Vai trò nhà hàng dùng amber, tài xế dùng xanh lá, quản trị dùng tím để định hướng.

Be Vietnam Pro được phục vụ local, đủ dấu tiếng Việt; không tải font bên ngoài. Token cỡ chữ 12/14/16/18/22px, heading dùng clamp responsive, hero desktop 64px. Nội dung chính ưu tiên 14–16px; chữ nhỏ dành cho nhãn phụ. Khoảng cách theo nhịp 4/8/12/16/20/24/32/40/48/64/80px. Bo góc 10/16/24/32px; ba mức shadow nhẹ.

## Thành phần

Button primary/secondary/danger/ghost có loading và disabled. Input có label, validation, focus ring; password có nút hiện/ẩn. Card, badge, skeleton, empty/error state, toast, dropdown và modal dùng cùng token. ConfirmDialog được tách khỏi UI barrel để public route không tải Radix Dialog ngay từ đầu; behavior và test cũ được giữ lại.

FoodImage dùng ảnh local WebP 480/800/1024px, width/height cố định để giữ tỉ lệ, `sizes`, lazy loading cho card, eager/high priority cho hero. Ảnh nhà hàng hiện là minh họa được gắn nhãn; không thể hiện ảnh thực tế của cơ sở kinh doanh. Khi API có ảnh thật, cần thay nguồn ảnh theo dữ liệu đó.

## Bố cục và responsive

Header sticky, menu mobile có Escape và trả focus. Trang chủ desktop hai cột, mobile một cột; grid danh mục và nhà hàng co theo viewport. Login/register chia đôi desktop; vùng ảnh được ẩn trên điện thoại để form giữ đủ chiều rộng.

Workspace có sidebar desktop, drawer bàn phím ở màn hình đến 1023px, topbar và account dropdown. Tài xế có bottom navigation tại cùng breakpoint của drawer, có khoảng trống nội dung, footer và toast để không bị thanh cố định che. Profile và form chuyển về một cột khi cần. Test bao phủ 375/768/1024/1440px.

Hover/focus và animation nhẹ cho card, menu, dialog, toast; `prefers-reduced-motion` tắt chuyển động và transform trang trí. Icon dùng Lucide thống nhất. Category giới thiệu tĩnh được ghi rõ; danh mục thật vẫn đọc từ backend. Không có rating, doanh thu, đơn hàng hoặc chỉ số giả.
