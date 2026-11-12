# A1 — SQL traceability cho năm màn hình

**VERIFIED source; DB LIVE NOT VERIFIED.** Tất cả SQL minh họa dưới đây là nội dung giải thích trong Markdown, **KHÔNG được thực thi trong A1**. Named parameters chỉ là ký hiệu; JdbcTemplate hiện dùng dấu ? và bind vị trí. SQL tương đương ORM chưa phải SQL viết tay tồn tại/thực thi trực tiếp trong source.

## Ma trận truy vết

| SCREEN | ROUTE | API | CONTROLLER | SERVICE | REPOSITORY / ACCESS | SQL OPERATION | TABLES | EVIDENCE |
|---|---|---|---|---|---|---|---|---|
| F1 tạo nhà hàng | /admin/restaurants/new | POST /restaurants | RestaurantController.createRestaurant | AuthService.createRestaurant | RestaurantRepository.save, AccountRepository.saveAndFlush; JpaRepository/Hibernate | SELECT email; INSERT restaurant; INSERT account trong transaction | restaurants,accounts | CreatePages.tsx/adminApi.createProfile/AuthService; E2E admin:186 |
| F2 thêm menu | /restaurant/menu/new | POST /restaurant-food-items | RestaurantFoodItemController.createRestaurantFoodItem | RestaurantFoodItemService.createRestaurantFoodItem | findById inherited; existsBy... derived; save/Hibernate | SELECT parent/exists; INSERT menu | restaurants,food_items,restaurant_food_items | MenuPages/MenuForm; service; E2E restaurant:169 |
| S1 tìm đơn | /restaurant/orders | GET /restaurant-management/orders | RestaurantManagementController.orders | RestaurantManagementService.orders; OrderService.convertToOrderResponseDTO | JdbcTemplate COUNT/ID native SQL; OrderRepository.findPageDetails JPQL | SELECT JOIN WHERE ORDER BY LIMIT/OFFSET; graph SELECT IDs | orders,customers; detail graph bảng dưới | orders() source; integration filter/query bound |
| R1 thống kê nhà hàng | /restaurant/analytics | GET /restaurant-management/analytics | RestaurantManagementController.analytics | RestaurantManagementService.analytics | JdbcTemplate, không repository cho aggregate | SELECT COUNT/SUM/AVG, JOIN, GROUP BY, top LIMIT10 | orders,payments,order_details,menu,food_items,ratings | analytics() + integration fixture/E2E |
| R2 báo cáo ADMIN | /admin/analytics | GET /admin-management/analytics | AdminManagementController.analytics | AdminManagementService.analytics | JdbcTemplate, không repository cho aggregate | SELECT COUNT/SUM, JOIN, GROUP BY, top LIMIT10 | orders,payments,deliveries,drivers,restaurants,methods,profiles,accounts | analytics() + independent SQL proof lịch sử |

Frontend dùng /api prefix cùng origin; đường dẫn controller không có prefix đó. Security/principal lookup còn có SELECT account/session và kiểm ownership; bảng trên tập trung thao tác nghiệp vụ, không hứa mỗi request chỉ có số query minh họa.

## F1 — SQL tương đương Hibernate INSERT (không có bản viết tay này trong source)

AuthService normalize email, BCrypt bằng PasswordEncoder rồi save profile trước, Account sau. Không dùng plaintext password làm bind cho cột SQL; :bcrypt_hash là kết quả encoder, không giá trị thật. Timestamps/version có thể do ORM cung cấp, tên/thứ tự bind dưới chỉ minh họa.

```sql
-- Ranh giới transaction do Spring @Transactional quản lý.
INSERT INTO restaurants
 (name,email,password,phone_number,address,restaurant_status,created_at,version)
VALUES (:name,:normalized_email,:bcrypt_hash,:phone,:address,:open,:created_at,0);
-- :new_restaurant_id lấy từ generated key của INSERT trên, cùng transaction.
INSERT INTO accounts
 (email,password_hash,role,status,restaurant_id,customer_id,driver_id,created_at,version)
VALUES (:normalized_email,:bcrypt_hash,'RESTAURANT','ACTIVE',:new_restaurant_id,NULL,NULL,:created_at,0);
```

AccountRepository.findByEmail là truy vấn repository kiểm email trước, UNIQUE vẫn là lớp chặn race cuối. account flush lỗi thì transaction rollback profile. Không thêm COMMIT thủ công vào service. Đối chiếu chỉ đọc khi demo được duyệt:

```sql
SELECT a.account_id,a.email,a.role,a.status,r.restaurant_id,r.name,r.restaurant_status
FROM accounts a JOIN restaurants r ON r.restaurant_id=a.restaurant_id
WHERE a.account_id=:response_account_id;
```

Không SELECT password/hash để trình chiếu. Đây là truy vấn đối chiếu đề xuất, chưa thực thi A1.

## F2 — Derived query và SQL INSERT tương đương

```sql
SELECT COUNT(*) FROM restaurant_food_items
WHERE restaurant_id=:own_restaurant_id AND item_id=:selected_item_id;
INSERT INTO restaurant_food_items (restaurant_id,item_id,price,is_available)
VALUES (:own_restaurant_id,:selected_item_id,:price,:available);
```

COUNT là ý nghĩa tương đương existsBy...; Hibernate có thể dùng SELECT ID/FETCH FIRST/LIMIT thay COUNT. Không khẳng định SQL runtime chính xác nếu chưa có statement log. Cha được tìm theo PK; FK và UNIQUE cặp bảo vệ dữ liệu. Catalog thực tế có NOT EXISTS để loại món đã thêm, SQL nằm ngay trong RestaurantManagementService.catalog.

```sql
SELECT m.restaurant_food_item_id,m.price,m.is_available,r.restaurant_id,f.item_id,f.name
FROM restaurant_food_items m
JOIN restaurants r ON r.restaurant_id=m.restaurant_id
JOIN food_items f ON f.item_id=m.item_id
WHERE m.restaurant_food_item_id=:response_menu_id;
```

## S1 — SQL đã viết tay trong service

Hai statement dưới phản ánh source cho một lựa chọn có đủ status/from/to. Khi bỏ filter, service bỏ đoạn predicate tương ứng, không cố bind tên cột/sort do client gửi. :pattern do ReadQuery.literalPattern tạo, escape !/%/_. RestaurantId từ principal.

```sql
SELECT COUNT(*)
FROM orders o JOIN customers c ON c.customer_id=o.customer_id
WHERE o.restaurant_id=:own_restaurant_id
 AND (CAST(o.order_id AS CHAR) LIKE :pattern ESCAPE '!'
      OR LOWER(c.name) LIKE :pattern ESCAPE '!')
 AND o.order_status=:status AND o.created_at>=:start AND o.created_at<:end_exclusive;

SELECT o.order_id
FROM orders o JOIN customers c ON c.customer_id=o.customer_id
WHERE o.restaurant_id=:own_restaurant_id
 AND (CAST(o.order_id AS CHAR) LIKE :pattern ESCAPE '!'
      OR LOWER(c.name) LIKE :pattern ESCAPE '!')
 AND o.order_status=:status AND o.created_at>=:start AND o.created_at<:end_exclusive
ORDER BY o.order_id DESC LIMIT :size OFFSET :offset;
```

Sort khác được allowlist: o.order_id ASC; hoặc o.total_amount DESC,o.order_id DESC. OFFSET=page*size, không lấy toàn tập rồi cắt frontend. Không kết quả trả danh sách rỗng. Bounds, ISO date/year, đảo kỳ, enum/sort sai trả400.

Hydrate JPQL thật trong OrderRepository.findPageDetails: select distinct Order với join fetch customer, left customer.cart, restaurant, left orderDetails→restaurantFoodItem→foodItem, delivery, payment→paymentMethod, WHERE orderId IN :ids. SQL tương đương graph join các bảng customers/carts/restaurants/order_details/restaurant_food_items/food_items/deliveries/payments/payment_methods. Không áp LIMIT trên collection fetch join; service sắp lại thứ tự bằng tập ID. Không gọi JPQL là SQL viết tay.

## R1 — SQL aggregate đã có trong source

Kỳ [start,end_exclusive) dùng created_at cho đơn và paid_at cho tiền. Default30, max93 ngày inclusive. Mọi query ràng buộc restaurant_id từ principal.

```sql
SELECT o.order_status,COUNT(*)
FROM orders o WHERE o.restaurant_id=:rid AND o.created_at>=:start AND o.created_at<:end_exclusive
GROUP BY o.order_status;

SELECT DATE(o.created_at),COUNT(*)
FROM orders o WHERE o.restaurant_id=:rid AND o.created_at>=:start AND o.created_at<:end_exclusive
GROUP BY DATE(o.created_at) ORDER BY DATE(o.created_at);

SELECT COUNT(*) AS n,COALESCE(SUM(o.subtotal),0) AS food,
 COALESCE(SUM(o.shipping_fee),0) AS shipping
FROM orders o JOIN payments p ON p.order_id=o.order_id
WHERE o.restaurant_id=:rid AND o.order_status='COMPLETED' AND p.payment_status='SUCCESS'
 AND p.paid_at>=:start AND p.paid_at<:end_exclusive;

SELECT DATE(p.paid_at),SUM(o.subtotal)
FROM orders o JOIN payments p ON p.order_id=o.order_id
WHERE o.restaurant_id=:rid AND o.order_status='COMPLETED' AND p.payment_status='SUCCESS'
 AND p.paid_at>=:start AND p.paid_at<:end_exclusive
GROUP BY DATE(p.paid_at) ORDER BY DATE(p.paid_at);

SELECT m.restaurant_food_item_id,f.name,SUM(d.quantity) AS qty,SUM(d.subtotal)
FROM order_details d JOIN orders o ON o.order_id=d.order_id
JOIN payments p ON p.order_id=o.order_id
JOIN restaurant_food_items m ON m.restaurant_food_item_id=d.restaurant_food_item_id
JOIN food_items f ON f.item_id=m.item_id
WHERE o.restaurant_id=:rid AND o.order_status='COMPLETED' AND p.payment_status='SUCCESS'
 AND p.paid_at>=:start AND p.paid_at<:end_exclusive
GROUP BY m.restaurant_food_item_id,f.name
ORDER BY qty DESC,m.restaurant_food_item_id LIMIT 10;

SELECT COUNT(*) FROM restaurant_food_items WHERE restaurant_id=:rid AND is_available=1;
SELECT COUNT(*) FROM ratings WHERE restaurant_id=:rid;
SELECT AVG(rating_score) FROM ratings WHERE restaurant_id=:rid;
```

Active menu là hiện tại; ratings là mọi thời gian, không dùng filter kỳ. Money là giá trị món trước đối soát, shipping riêng; không lợi nhuận. OrderDetail JOIN chỉ cho top món, không SUM(Order.subtotal) trên graph chi tiết gây double-count. REFUNDED/CANCELLED/PENDING không vào paid query; không giả định có lịch sử settlement/refund ledger.

## R2 — SQL aggregate ADMIN đã có trong source

```sql
SELECT DATE(p.paid_at),SUM(p.amount)
FROM orders o JOIN payments p ON p.order_id=o.order_id
WHERE o.order_status='COMPLETED' AND p.payment_status='SUCCESS'
 AND p.amount=o.total_amount AND p.amount=o.subtotal+o.shipping_fee
 AND p.paid_at>=:start AND p.paid_at<:end_exclusive
GROUP BY DATE(p.paid_at) ORDER BY DATE(p.paid_at);

SELECT COUNT(*) AS n,COALESCE(SUM(o.subtotal),0) AS food,
 COALESCE(SUM(o.shipping_fee),0) AS shipping,COALESCE(SUM(p.amount),0) AS total
FROM orders o JOIN payments p ON p.order_id=o.order_id
WHERE o.order_status='COMPLETED' AND p.payment_status='SUCCESS'
 AND p.amount=o.total_amount AND p.amount=o.subtotal+o.shipping_fee
 AND p.paid_at>=:start AND p.paid_at<:end_exclusive;

SELECT d.delivery_status,COUNT(*)
FROM deliveries d JOIN orders o ON o.order_id=d.order_id
WHERE o.created_at>=:start AND o.created_at<:end_exclusive GROUP BY d.delivery_status;

SELECT m.method_code,m.method_name,COUNT(*),
 SUM(CASE WHEN p.payment_status='SUCCESS' THEN 1 ELSE 0 END)
FROM payments p LEFT JOIN payment_methods m ON m.method_id=p.payment_method_id
WHERE p.created_at>=:start AND p.created_at<:end_exclusive
GROUP BY m.method_id,m.method_code,m.method_name ORDER BY m.method_code;

SELECT r.restaurant_id,r.name,COUNT(*) AS total,
 SUM(CASE WHEN o.order_status='COMPLETED' THEN 1 ELSE 0 END)
FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id
WHERE o.created_at>=:start AND o.created_at<:end_exclusive
GROUP BY r.restaurant_id,r.name ORDER BY total DESC,r.restaurant_id LIMIT 10;

SELECT v.driver_id,v.name,COUNT(*) AS total
FROM deliveries d JOIN drivers v ON v.driver_id=d.driver_id
WHERE d.delivery_status='DELIVERED' AND d.delivered_time>=:start AND d.delivered_time<:end_exclusive
GROUP BY v.driver_id,v.name ORDER BY total DESC,v.driver_id LIMIT 10;
```

Còn các COUNT mọi thời gian cho customers/restaurants/drivers/accounts/orders; Order cohort/status/ngày giống cấu trúc R1 nhưng toàn hệ thống, SUM(total_amount) chỉ loại CANCELLED và vẫn gồm chưa thu. Ratio delivered/(delivered+cancelled) tính từ counts cùng cohort, null khi mẫu số0. Nhãn/timezone trong docs/phase7-reporting-definitions.md. Không gán ratio cho số sự kiện phân công, không suy COD earnings.

## Phân loại toàn dự án

- JdbcTemplate với bound native SQL: RestaurantManagementService, AdminManagementService, DriverManagementService; báo cáo đã có SQL viết tay và thực thi qua template.
- Native SQL qua @Query(nativeQuery=true): CartRepository.ensureCustomerCart INSERT ... ON DUPLICATE KEY UPDATE. Không dùng thao tác này làm bằng chứng form F1/F2 dùng SQL trực tiếp.
- JPQL: OrderRepository.findPageDetails; searchPublic/searchRestaurantMenu; lock queries và compareAndUpdate.
- Spring Data derived/inherited: existsBy..., findBy..., JpaRepository.save/findById; DML do Hibernate sinh.
- Không phát hiện JDBC Connection/PreparedStatement tự quản cho năm chức năng đã chọn. JdbcTemplate vẫn là JDBC; không ép toàn bộ backend chuyển sang JDBC trong A1.

## Hai cách hiểu yêu cầu SQL của giảng viên

**A — Chấp nhận SQL tương đương ORM:** giữ nguyên backend; A2 biên soạn SQL/DDL để nộp, chú thích SQL viết tay hay tương đương và cách bind, có bằng chứng SQL runtime trên DB demo được duyệt. Hai form cần đối chiếu row mới; search/report cần so IDs/count/sums. Không cần rewrite JPA.

**B — Yêu cầu SQL viết tay phải thực thi trực tiếp:** search và hai report đã đáp ứng ở implementation JdbcTemplate. Hai form F1/F2 vẫn thiếu bằng chứng DML viết tay gắn UI; không lấy native upsert giỏ thay thế. Trước tiên xác nhận giảng viên có chấp nhận script demo SQL thực thi riêng hay bắt buộc UI gọi trực tiếp SQL. Nếu script được chấp nhận, đề xuất bộ DML trên DB demo được duyệt. Nếu bắt buộc UI, lập thay đổi tối thiểu cho writer được chọn với transaction/validation/ownership/rollback tests, xin duyệt riêng; không tự chuyển kiến trúc hay cho plaintext vào SQL. Không làm B trong A1.

## Kiểm chứng độc lập và giới hạn

A1 chỉ đọc oracle cũ: mysql-admin-reporting-proof.json của root load-boundary báo2417 source rows,697 successful completed payments,total32.972.000 VND. Đây là oracle lịch sử dựa raw rows, không một lần SELECT mới. A2 dùng cùng kỳ/principal/timezone, đọc raw rows rồi cộng bằng Decimal, so API JSON và UI, kiểm cả boundary/ngày rỗng/refund/sai amount; không chỉ chạy lại y hệt aggregate để tự chứng minh.

SQL DDL nộp bài còn thiếu base13 bảng/schema-only trong repository, dù dump ngoài repo đủ16. Không copy full backup có credential/dữ liệu. Không tạo file .sql hoặc chạy script trong A1.

## Source anchors

- [src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59>) — `public Me createRestaurant`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantFoodItemService.java:57](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantFoodItemService.java:57>) — `createRestaurantFoodItem(RestaurantFoodItemRequestDTO`.

- [src/main/java/vn/gaugaugau/fooddelivery/repository/RestaurantFoodItemRepository.java:46](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/repository/RestaurantFoodItemRepository.java:46>) — `boolean existsByRestaurant`.

- [src/main/java/vn/gaugaugau/fooddelivery/repository/OrderRepository.java:30](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/repository/OrderRepository.java:30>) — `findPageDetails`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:56](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:56>) — `public PageResponse<OrderResponseDTO> orders`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:74](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantManagementService.java:74>) — `public Analytics analytics`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:90](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:90>) — `public Analytics analytics`.

- [src/main/java/vn/gaugaugau/fooddelivery/repository/CartRepository.java:17](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/repository/CartRepository.java:17>) — `INSERT INTO carts`.

- [src/main/java/vn/gaugaugau/fooddelivery/service/ReadQuery.java:29](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/ReadQuery.java:29>) — `literalPattern`.
