# HanoiFood — Ảnh minh họa giao diện

Hai ảnh mới được tạo bằng **built-in image_gen**, chế độ generate, `photorealistic-natural`; không dùng CLI, không cần API key và không lấy ảnh từ website nhà hàng khác. Chúng là minh họa món ăn, không khẳng định phản ánh sản phẩm của nhà hàng cụ thể. Nguồn được giữ nguyên và sao chép vào repository trước khi sử dụng.

## Ảnh phở

Nguồn dự án: `frontend/src/assets/food/pho-v2-source.png`.

Bản phục vụ: `frontend/public/images/pho-v2-480.webp`, `pho-v2-800.webp`, `pho-v2-1024.webp` (60,796 / 152,902 / 211,554 bytes).

Prompt mô tả sử dụng: Premium natural Vietnamese food delivery editorial photography, square composition. Overhead slightly angled generous Hanoi pho bo in a ceramic bowl, rice noodles, cooked beef, spring onions, Thai basil, chili, amber broth and subtle steam. A side of golden crisp spring rolls cut to show filling, mint, lime and chopsticks on an ivory tabletop. Soft upper-left window light, inviting natural food texture. No text, logos, brand, watermark or people. Generic illustrative food, not a specific restaurant.

## Ảnh cơm tấm

Nguồn dự án: `frontend/src/assets/food/rice-v2-source.png`.

Bản phục vụ: `frontend/public/images/rice-v2-480.webp`, `rice-v2-800.webp`, `rice-v2-1024.webp` (65,472 / 176,224 / 244,712 bytes).

Prompt mô tả sử dụng: Premium natural overhead Vietnamese com tam editorial food photograph, square composition. Caramelized lemongrass pork, broken rice, fried egg, pickled carrot and daikon, cucumber, tomato, scallion oil and a small sauce bowl. Ivory table and ceramic plate, warm natural light, appetizing realistic textures. No text, logo, watermark or people. Generic illustrative Vietnamese meal, not a specific restaurant.

## Xuất ảnh

Giữ nguyên PNG nguồn. Chỉ resize/xuất WebP kỹ thuật bằng browser canvas, không sửa nội dung ảnh bằng script. Các file được phục vụ cùng origin, không có phụ thuộc CDN hoặc URL ảnh tạm. FoodImage chọn biến thể qua srcset/sizes và dùng alt theo ngữ cảnh. Nhãn “Ảnh minh họa” được hiển thị trên card nhà hàng và vùng ảnh đăng nhập/đăng ký.
