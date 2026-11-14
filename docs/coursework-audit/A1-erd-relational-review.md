# A1 — ERD và Data Diagram

**ERD khái niệm: MISSING. Data Diagram vật lý: MISSING. DB LIVE NOT VERIFIED.** Đã quét root/source/docs/resources và file .drawio/.mwb/.puml/.vsdx/.pdf/.docx, tên ERD/diagram. Không thấy sơ đồ nộp bài; SVG bowl/favicon là asset UI. schema-config.ts không phải sơ đồ CSDL. Không vẽ lại ERD hoặc tạo ảnh trong A1.

## Đối chiếu sơ đồ với schema khả dụng

| Kiểm tra | Kết quả |
|---|---|
| Bảng có ở snapshot nhưng chưa được thể hiện trong sơ đồ khả dụng | Đủ 16: accounts, auth_sessions, refresh_tokens, customers, restaurants, drivers, food_items, restaurant_food_items, carts, cart_items, orders, order_details, payments, payment_methods, deliveries, ratings |
| Bảng trong sơ đồ nhưng thiếu ở schema | NOT VERIFIED: không có sơ đồ |
| FK không khớp / sai bội số trong sơ đồ | NOT VERIFIED: không có sơ đồ, không bịa lỗi vẽ |
| Kiểu ID không khớp trong snapshot | Chưa thấy: BIGINT FK đồng kiểu PK; session CHAR(36) ascii_bin đồng nhất |
| Bảng trung gian cần mô tả | restaurant_food_items, cart_items, order_details; ratings là thực thể có thuộc tính và không UNIQUE cặp |

Nguồn: [inventory](A1-database-inventory.md) chứa nguyên định nghĩa 21 FK và cột từ stage8-final-backup.sql; 16 Entity tương ứng tại model/ và auth/model/. Đây là bảng kiểm bội số từ schema, không phải ERD mới.

## Bội số phải diễn giải

| Cha ← FK ở con | Mỗi con có cha | Mỗi cha có con | Bằng chứng |
|---|---|---|---|
| Customer ← Cart.customer_id | 0..1 | 0..1 | Nullable UNIQUE |
| Restaurant ← Cart.restaurant_id | 0..1 | 0..N | Nullable, giỏ rỗng không nhà hàng |
| Cart ← CartItem.cart_id | 1 | 0..N | NOT NULL FK |
| RestaurantFoodItem ← CartItem.restaurant_food_item_id | 1 | 0..N | NOT NULL FK |
| Restaurant ← RestaurantFoodItem.restaurant_id | 1 | 0..N | NOT NULL FK |
| FoodItem ← RestaurantFoodItem.item_id | 1 | 0..N | NOT NULL FK, UNIQUE cặp restaurant/item |
| Customer ← Order.customer_id | 0..1 theo DDL | 0..N | Service yêu cầu 1 nhưng FK nullable |
| Restaurant ← Order.restaurant_id | 0..1 theo DDL | 0..N | Service yêu cầu 1 nhưng FK nullable |
| Order ← OrderDetail.order_id | 0..1 theo DDL | 0..N | Checkout cần ≥1 dòng, DDL không bắt min1 |
| RestaurantFoodItem ← OrderDetail.restaurant_food_item_id | 0..1 theo DDL | 0..N | Nullable FK |
| Order ← Payment.order_id | 1 | 0..1 | NOT NULL UNIQUE; cha vẫn có thể thiếu con ở DDL |
| PaymentMethod ← Payment.payment_method_id | 0..1 | 0..N | Nullable FK |
| Order ← Delivery.order_id | 0..1 | 0..1 | Nullable UNIQUE, chưa confirm chưa có Delivery |
| Driver ← Delivery.driver_id | 0..1 | 0..N | Chưa nhận có thể NULL |
| Customer ← Rating.customer_id | 0..1 theo DDL | 0..N | Nullable FK |
| Restaurant ← Rating.restaurant_id | 0..1 theo DDL | 0..N | Nullable FK; không có rating.order_id |
| Customer/Restaurant/Driver ← Account.profile_id | 0..1 từng FK, theo role CHECK | 0..1 | 3 FK nullable UNIQUE; ADMIN không profile |
| Account ← AuthSession.account_id | 1 | 0..N | NOT NULL FK |
| AuthSession ← RefreshToken.session_id | 1 | 0..N | Rotation giữ nhiều token |

Dòng Account chứa ba FK riêng: tổng bảng kiểm là 21 FK. Không bịa bảng roles hoặc food_categories; tên thật là account.role và food_items.category. Không gọi order_details là order_items trong sơ đồ nộp.

## Yêu cầu tối thiểu cho A2

ERD khái niệm cần đối tượng, thuộc tính, định danh, quan hệ và quy tắc bắt buộc; Data Diagram cần đúng tên bảng/cột/kiểu/PK/UK/FK/CHECK. Cần chú giải khi quy tắc nghiệp vụ chặt hơn nullable SQL. Có thể trình bày lõi 13 bảng và phần auth hỗ trợ riêng cho dễ đọc nhưng không bỏ phạm vi 16 bảng/21 FK. Không đổi schema chỉ để sơ đồ đẹp. Chưa có artifact nên không chấm tối đa 2,5 điểm ERD hoặc toàn bộ 2 điểm mô hình quan hệ.


## Phụ lục thực đơn độc lập — 14/11/2026

Kết quả A1 phía trên giữ nguyên như bằng chứng lịch sử. Source mới và DB fooddelivery_independent_menu sau migration04 dùng FoodItem như nội dung riêng của một menu: item_id ở restaurant_food_items UNIQUE, nên FoodItem→Menu đổi từ0..N thành0..1. Main chưa được migration, không đổi kết luận schema Main ở phần lịch sử. Xem [ERD, quan hệ và FD/3NF version04](../independent-menu-data-model.md) cùng schema-reference-independent-menu.json. Không có bảng mới/cascade mới; mọi cart/order FK theo menuID và giá snapshot giữ nguyên.
