# A1 — Kiểm kê database

## Phạm vi và nguồn

**DB LIVE NOT VERIFIED.** Cổng MySQL test 3307 không có listener khi bắt đầu A1. Không khởi động instance, không đọc credential hoặc kết nối 3306. Không xác minh schema fooddelivery hiện tại.

Nguồn DDL là [stage8-final-backup.sql](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql>), SHA-256 `5bb2f7c72bf05b370b255cdb575ba21c20fed95e82b9059001e2753d723695dc`, snapshot thử nghiệm fooddelivery_phase8_2/3307 trước A1. Metadata đối chiếu: [database-integrity-final.json](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/database-integrity-final.json>). Chỉ đọc/trích cấu trúc, không chép INSERT/credential/hash/token/PII vào tài liệu.

**16 bảng, 107 cột, 16 PK, 21 FK, 13 UNIQUE ngoài PK, 6 CHECK; 45 index có tên** =16 PK+13 UNIQUE+16 nonunique. Composite index tính một index. Tất cả InnoDB. Kết quả snapshot khớp con số báo cáo 8.2; không suy sang DB live A1.

ID nghiệp vụ/account/refresh dùng signed BIGINT ↔ Long; session CHAR(36) ascii_bin ↔ String. Tiền DECIMAL(12,2) ↔ BigDecimal; DATETIME(6) ↔ LocalDateTime không offset. Không suy timezone lịch sử từ cột. Mặc định bảng utf8mb4_0900_ai_ci, riêng accounts.email as_cs và session_id ascii_bin. Email UNIQUE từng profile không bảo vệ duy nhất xuyên mọi profile; accounts.email bảo vệ phạm vi đăng nhập.

NULL=YES nghĩa cho NULL. DEFAULT `—` là không khai báo; không tự coi là 0/rỗng. AUTO_INCREMENT là identity; counter snapshot không là quy tắc thiết kế.

## accounts

Tài khoản trung tâm và role/profile. Entity: [Account](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/model/Account.java>). [DDL dòng 25](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:25>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `account_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `email` | `varchar(255)` | NO | `—` |  |
| `password_hash` | `varchar(255)` | NO | `—` |  |
| `role` | `varchar(20)` | NO | `—` |  |
| `status` | `varchar(20)` | NO | `'ACTIVE'` |  |
| `customer_id` | `bigint` | YES | `NULL` |  |
| `restaurant_id` | `bigint` | YES | `NULL` |  |
| `driver_id` | `bigint` | YES | `NULL` |  |
| `created_at` | `datetime(6)` | NO | `CURRENT_TIMESTAMP(6)` |  |
| `password_changed_at` | `datetime(6)` | YES | `NULL` |  |
| `version` | `bigint` | NO | `'0'` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`account_id`)
UNIQUE KEY `uq_accounts_email` (`email`)
UNIQUE KEY `uq_accounts_customer` (`customer_id`)
UNIQUE KEY `uq_accounts_restaurant` (`restaurant_id`)
UNIQUE KEY `uq_accounts_driver` (`driver_id`)
CONSTRAINT `fk_accounts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
CONSTRAINT `fk_accounts_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`)
CONSTRAINT `fk_accounts_restaurant` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
CONSTRAINT `ck_accounts_email_normalized` CHECK ((`email` = lower(trim(`email`))))
CONSTRAINT `ck_accounts_profile` CHECK ((((`role` = _utf8mb4'CUSTOMER') and (`customer_id` is not null) and (`restaurant_id` is null) and (`driver_id` is null)) or ((`role` = _utf8mb4'RESTAURANT') and (`restaurant_id` is not null) and (`customer_id` is null) and (`driver_id` is null)) or ((`role` = _utf8mb4'DRIVER') and (`driver_id` is not null) and (`customer_id` is null) and (`restaurant_id` is null)) or ((`role` = _utf8mb4'ADMIN') and (`customer_id` is null) and (`restaurant_id` is null) and (`driver_id` is null))))
CONSTRAINT `ck_accounts_role` CHECK ((`role` in (_utf8mb4'CUSTOMER',_utf8mb4'RESTAURANT',_utf8mb4'DRIVER',_utf8mb4'ADMIN')))
CONSTRAINT `ck_accounts_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'DISABLED')))
```

Entity ↔ snapshot: Tên cột, PK/UK/FK khớp. CHECK/default/collation email chỉ được DDL mô tả đầy đủ. Java validate kiểm BCrypt; SQL CHECK không kiểm hash BCrypt.

## auth_sessions

Phiên đăng nhập có thời hạn/thu hồi. Entity: [AuthSession](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/model/AuthSession.java>). [DDL dòng 69](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:69>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `session_id` | `char(36)` | NO | `—` |  |
| `account_id` | `bigint` | NO | `—` |  |
| `created_at` | `datetime(6)` | NO | `CURRENT_TIMESTAMP(6)` |  |
| `expires_at` | `datetime(6)` | NO | `—` |  |
| `revoked_at` | `datetime(6)` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`session_id`)
KEY `ix_sessions_account` (`account_id`)
KEY `ix_sessions_expiry` (`expires_at`)
CONSTRAINT `fk_sessions_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`)
CONSTRAINT `ck_sessions_expiry` CHECK ((`expires_at` > `created_at`))
```

Entity ↔ snapshot: CHAR(36) ascii_bin và FK BIGINT khớp. Index account/expiry, CHECK expiry và default timestamp thuộc DDL.

## cart_items

Quantity/note và liên kết món của giỏ. Entity: [CartItem](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/CartItem.java>). [DDL dòng 100](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:100>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `quantity` | `int` | NO | `—` |  |
| `cart_id` | `bigint` | NO | `—` |  |
| `cart_item_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `restaurant_food_item_id` | `bigint` | NO | `—` |  |
| `note` | `varchar(255)` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`cart_item_id`)
KEY `FKpcttvuq4mxppo8sxggjtn5i2c` (`cart_id`)
KEY `FKog89jg3e4pp958ldf2dtk0jf2` (`restaurant_food_item_id`)
CONSTRAINT `FKog89jg3e4pp958ldf2dtk0jf2` FOREIGN KEY (`restaurant_food_item_id`) REFERENCES `restaurant_food_items` (`restaurant_food_item_id`)
CONSTRAINT `FKpcttvuq4mxppo8sxggjtn5i2c` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`)
```

Entity ↔ snapshot: Hai FK/quantity NOT NULL khớp. @Positive không là SQL CHECK. Không UNIQUE(cart_id,restaurant_food_item_id).

## carts

Giỏ hiện tại; nhà hàng NULL khi rỗng. Entity: [Cart](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Cart.java>). [DDL dòng 131](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:131>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `cart_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `customer_id` | `bigint` | YES | `NULL` |  |
| `restaurant_id` | `bigint` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`cart_id`)
UNIQUE KEY `UK88sv4i13lo80s74ox7rsb5a2c` (`customer_id`)
KEY `FK1wwmot9772p901aismub7pd5c` (`restaurant_id`)
CONSTRAINT `FK1wwmot9772p901aismub7pd5c` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
CONSTRAINT `FK8ba3sryid5k8a9kidpkvqipyt` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
```

Entity ↔ snapshot: Customer OneToOne khớp UNIQUE nullable. Restaurant nullable. JPA ALL/orphanRemoval chỉ tới cart_items, không tới Customer/Restaurant.

## customers

Hồ sơ khách. Entity: [Customer](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Customer.java>). [DDL dòng 160](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:160>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `created_at` | `datetime(6)` | NO | `—` |  |
| `customer_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `phone_number` | `varchar(15)` | NO | `—` |  |
| `name` | `varchar(100)` | NO | `—` |  |
| `address` | `varchar(255)` | NO | `—` |  |
| `email` | `varchar(255)` | NO | `—` |  |
| `password` | `varchar(255)` | NO | `—` |  |
| `version` | `bigint` | NO | `'0'` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`customer_id`)
UNIQUE KEY `UKrfbvkrffamfql7cjmen8v976v` (`email`)
```

Entity ↔ snapshot: BIGINT/Long, độ dài, email UNIQUE khớp; created_at dump NOT NULL mạnh hơn annotation CreationTimestamp không ghi nullable=false. Version SQL DEFAULT 0, JPA @Version.

## deliveries

Chuyến giao, có thể chưa gán tài xế. Entity: [Delivery](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Delivery.java>). [DDL dòng 191](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:191>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `delivered_time` | `datetime(6)` | YES | `NULL` |  |
| `delivery_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `driver_id` | `bigint` | YES | `NULL` |  |
| `order_id` | `bigint` | YES | `NULL` |  |
| `pickup_time` | `datetime(6)` | YES | `NULL` |  |
| `delivery_status` | `enum('CANCELLED','DELIVERED','DELIVERING','PENDING','PICKED_UP')` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`delivery_id`)
UNIQUE KEY `UKk36n9p5v7dd96hpgkwybvbogt` (`order_id`)
KEY `FK8ateuqis5a8je9rimyvt1nmps` (`driver_id`)
CONSTRAINT `FK7isx0rnbgqr1dcofd5putl6jw` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
CONSTRAINT `FK8ateuqis5a8je9rimyvt1nmps` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`)
```

Entity ↔ snapshot: OneToOne order khớp UNIQUE nullable dù JoinColumn không ghi unique=true. Driver/order/status nullable; Order chưa confirm có thể chưa có Delivery.

## drivers

Hồ sơ tài xế/biển số/trạng thái nhận chuyến. Entity: [Driver](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Driver.java>). [DDL dòng 223](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:223>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `drive_status` | `bit(1)` | YES | `NULL` |  |
| `created_at` | `datetime(6)` | NO | `—` |  |
| `driver_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `phone_number` | `varchar(15)` | NO | `—` |  |
| `license_plate` | `varchar(20)` | YES | `NULL` |  |
| `name` | `varchar(100)` | NO | `—` |  |
| `address` | `varchar(255)` | NO | `—` |  |
| `email` | `varchar(255)` | NO | `—` |  |
| `password` | `varchar(255)` | NO | `—` |  |
| `version` | `bigint` | NO | `'0'` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`driver_id`)
UNIQUE KEY `UKre66mdta4hy6pxm2w1rqu08jv` (`email`)
```

Entity ↔ snapshot: Như Customer; drive_status/license_plate nullable, không UNIQUE phone/plate.

## food_items

Catalog dùng chung, category là chuỗi. Entity: [FoodItem](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/FoodItem.java>). [DDL dòng 256](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:256>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `item_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `category` | `varchar(150)` | YES | `NULL` |  |
| `name` | `varchar(150)` | NO | `—` |  |
| `description` | `varchar(255)` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`item_id`)
```

Entity ↔ snapshot: Cột/độ dài khớp; name được service kiểm trùng, SQL không UNIQUE(name). Không có bảng categories.

## order_details

Dòng đơn với đơn giá lịch sử và thành tiền. Entity: [OrderDetail](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/OrderDetail.java>). [DDL dòng 282](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:282>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `quantity` | `int` | NO | `—` |  |
| `subtotal` | `decimal(12,2)` | YES | `NULL` |  |
| `unit_price` | `decimal(12,2)` | YES | `NULL` |  |
| `order_detail_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `order_id` | `bigint` | YES | `NULL` |  |
| `restaurant_food_item_id` | `bigint` | YES | `NULL` |  |
| `note` | `varchar(255)` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`order_detail_id`)
KEY `FKjyu2qbqt8gnvno9oe9j2s2ldk` (`order_id`)
KEY `FKc5cccl4giure8wvnrwt4v5xdn` (`restaurant_food_item_id`)
CONSTRAINT `FKc5cccl4giure8wvnrwt4v5xdn` FOREIGN KEY (`restaurant_food_item_id`) REFERENCES `restaurant_food_items` (`restaurant_food_item_id`)
CONSTRAINT `FKjyu2qbqt8gnvno9oe9j2s2ldk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
```

Entity ↔ snapshot: DECIMAL khớp; quantity NOT NULL nhưng hai FK nullable, không CHECK quantity/price/subtotal.

## orders

Đơn, địa chỉ giao và các khoản tiền đã chốt. Entity: [Order](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Order.java>). [DDL dòng 315](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:315>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `shipping_fee` | `decimal(12,2)` | YES | `NULL` |  |
| `subtotal` | `decimal(12,2)` | YES | `NULL` |  |
| `total_amount` | `decimal(12,2)` | YES | `NULL` |  |
| `created_at` | `datetime(6)` | NO | `—` |  |
| `customer_id` | `bigint` | YES | `NULL` |  |
| `order_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `restaurant_id` | `bigint` | YES | `NULL` |  |
| `delivery_address` | `varchar(255)` | NO | `—` |  |
| `order_status` | `enum('CANCELLED','COMPLETED','CONFIRMED','DELIVERING','PENDING','PREPARING','READY')` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`order_id`)
KEY `FKpxtb8awmi0dk6smoh2vp1litg` (`customer_id`)
KEY `FK2m9qulf12xm537bku3jnrrbup` (`restaurant_id`)
CONSTRAINT `FK2m9qulf12xm537bku3jnrrbup` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
CONSTRAINT `FKpxtb8awmi0dk6smoh2vp1litg` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
```

Entity ↔ snapshot: Enum Java STRING lưu native MySQL ENUM trong dump; tiền nullable ở mapping/schema. created_at SQL NOT NULL mạnh hơn annotation. Không CHECK arithmetic.

## payment_methods

Mã/tên/trạng thái phương thức thanh toán. Entity: [PaymentMethod](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/PaymentMethod.java>). [DDL dòng 350](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:350>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `is_active` | `bit(1)` | NO | `—` |  |
| `method_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `method_code` | `varchar(30)` | NO | `—` |  |
| `method_name` | `varchar(50)` | NO | `—` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`method_id`)
UNIQUE KEY `UKpu3rxdcaus39di8g7s6xv4sk6` (`method_code`)
```

Entity ↔ snapshot: Code NOT NULL UNIQUE, method_id và Boolean/bit khớp. Không SQL DEFAULT active.

## payments

Thanh toán duy nhất cho một Order. Entity: [Payment](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Payment.java>). [DDL dòng 377](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:377>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `amount` | `decimal(12,2)` | NO | `—` |  |
| `created_at` | `datetime(6)` | NO | `—` |  |
| `order_id` | `bigint` | NO | `—` |  |
| `paid_at` | `datetime(6)` | YES | `NULL` |  |
| `payment_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `payment_method_id` | `bigint` | YES | `NULL` |  |
| `refunded_at` | `datetime(6)` | YES | `NULL` |  |
| `transaction_code` | `varchar(100)` | YES | `NULL` |  |
| `payment_status` | `enum('CANCELLED','PENDING','REFUNDED','SUCCESS')` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`payment_id`)
UNIQUE KEY `UK8vo36cen604as7etdfwmyjsxt` (`order_id`)
KEY `FKce1n8pa67lq4l57l9mhugdgab` (`payment_method_id`)
CONSTRAINT `FK81gagumt0r8y3rmudcgpbk42l` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
CONSTRAINT `FKce1n8pa67lq4l57l9mhugdgab` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`method_id`)
```

Entity ↔ snapshot: Order NOT NULL UNIQUE khớp. Naming strategy ánh xạ createdAt/refundedAt sang snake_case. created_at SQL NOT NULL mạnh hơn annotation; transaction_code không UNIQUE.

## ratings

Đánh giá khách–nhà hàng; không có order_id. Entity: [Rating](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Rating.java>). [DDL dòng 412](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:412>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `rating_score` | `int` | NO | `—` |  |
| `created_at` | `datetime(6)` | NO | `—` |  |
| `customer_id` | `bigint` | YES | `NULL` |  |
| `rating_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `restaurant_id` | `bigint` | YES | `NULL` |  |
| `comment` | `text` | YES | `—` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`rating_id`)
KEY `FKb0aai9hp9gtd2don8c08qxn3y` (`customer_id`)
KEY `FKntiwrmxidegn417oxunmtnjpa` (`restaurant_id`)
CONSTRAINT `FKb0aai9hp9gtd2don8c08qxn3y` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`)
CONSTRAINT `FKntiwrmxidegn417oxunmtnjpa` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
```

Entity ↔ snapshot: Score NOT NULL, TEXT và FK khớp. Không CHECK score 1..5; không UNIQUE customer/restaurant. created_at SQL NOT NULL mạnh hơn annotation.

## refresh_tokens

Hash refresh token luân phiên; không raw token. Entity: [RefreshToken](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/model/RefreshToken.java>). [DDL dòng 444](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:444>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `refresh_token_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `session_id` | `char(36)` | NO | `—` |  |
| `token_hash` | `binary(32)` | NO | `—` |  |
| `created_at` | `datetime(6)` | NO | `CURRENT_TIMESTAMP(6)` |  |
| `expires_at` | `datetime(6)` | NO | `—` |  |
| `used_at` | `datetime(6)` | YES | `NULL` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`refresh_token_id`)
UNIQUE KEY `uq_refresh_hash` (`token_hash`)
KEY `ix_refresh_session` (`session_id`)
KEY `ix_refresh_expiry` (`expires_at`)
CONSTRAINT `fk_refresh_session` FOREIGN KEY (`session_id`) REFERENCES `auth_sessions` (`session_id`)
CONSTRAINT `ck_refresh_expiry` CHECK ((`expires_at` > `created_at`))
```

Entity ↔ snapshot: BINARY(32), CHAR(36) và FK khớp; SQL chỉ CHECK expires>created; entity kiểm thêm expiry không vượt session.

## restaurant_food_items

Món bán tại nhà hàng, giá và availability. Entity: [RestaurantFoodItem](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/RestaurantFoodItem.java>). [DDL dòng 480](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:480>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `is_available` | `bit(1)` | NO | `—` |  |
| `price` | `decimal(12,2)` | NO | `—` |  |
| `item_id` | `bigint` | NO | `—` |  |
| `restaurant_food_item_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `restaurant_id` | `bigint` | NO | `—` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`restaurant_food_item_id`)
UNIQUE KEY `UKgkbdxkabiy3ijm702fqc7y7ci` (`restaurant_id`,`item_id`)
KEY `FKoh4v7c17s0jry1so965x2yiy5` (`item_id`)
CONSTRAINT `FK86eyfbft1xsjbbgtd9f2g9tv4` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`restaurant_id`)
CONSTRAINT `FKoh4v7c17s0jry1so965x2yiy5` FOREIGN KEY (`item_id`) REFERENCES `food_items` (`item_id`)
```

Entity ↔ snapshot: UK(restaurant_id,item_id), hai FK NOT NULL, DECIMAL(12,2) khớp. Builder availability=true không là SQL DEFAULT; không CHECK price>0.

## restaurants

Hồ sơ/trạng thái nhà hàng. Entity: [Restaurant](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/Restaurant.java>). [DDL dòng 511](<F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/stage8-final-backup.sql:511>).

| Cột | Kiểu SQL | NULL | DEFAULT | Identity |
|---|---|---|---|---|
| `restaurant_status` | `bit(1)` | YES | `NULL` |  |
| `created_at` | `datetime(6)` | NO | `—` |  |
| `restaurant_id` | `bigint` | NO | `—` | AUTO_INCREMENT |
| `phone_number` | `varchar(15)` | NO | `—` |  |
| `name` | `varchar(150)` | NO | `—` |  |
| `address` | `varchar(255)` | NO | `—` |  |
| `email` | `varchar(255)` | NO | `—` |  |
| `password` | `varchar(255)` | NO | `—` |  |
| `version` | `bigint` | NO | `'0'` |  |

PK, FK, UNIQUE, CHECK và INDEX (trích DDL sẵn có, không thực thi):

```sql
PRIMARY KEY (`restaurant_id`)
UNIQUE KEY `UKfe6aq2gbudopv20yl6b77798m` (`email`)
```

Entity ↔ snapshot: Như Customer; restaurant_status nullable. True khi tạo là mặc định service, không phải SQL DEFAULT.

## Quan hệ và cascade

21 FK nằm đầy đủ ở các phần trên. Không có ON DELETE/UPDATE CASCADE trong DDL, mặc định RESTRICT/NO ACTION. JPA cascade không đồng nghĩa SQL cascade: chỉ Cart→CartItem và Order→OrderDetail có ALL/orphanRemoval; không REMOVE từ con sang Customer/Restaurant/Driver/FoodItem. Account/profile, Session/Account, Refresh/Session không cascade REMOVE. A1 không thực thi xóa.

FK nullable: mỗi con có 0..1 cha; NOT NULL: đúng 1 cha. Mỗi cha có 0..N con, riêng FK UNIQUE có 0..1. FK không bắt cha phải có con: SQL không bắt mỗi Order phải có Payment/Detail/Delivery. Account CHECK thêm cấu trúc role/profile.

## Khoảng trống enforce và độ đồng bộ

Không có CHECK nghiệp vụ cho quantity, price, score, phép nhân/cộng tiền. DTO/service validation không thay thế SQL CHECK. Nhiều FK nullable dù luồng ứng dụng đòi đủ. Không UNIQUE tên catalog, plate, phone, transaction_code hoặc cặp cart/menu; không tự bổ sung khi chưa xác nhận quy tắc/dữ liệu. Rating không có order FK hay UNIQUE cặp profile.

Hibernate validate chứng minh tương thích mapping cơ bản khi boot lịch sử, không chứng minh mọi default/index/CHECK/nullability đều giống annotation. Metadata created_at NOT NULL mạnh hơn một số annotation không mặc nhiên là lỗi startup.

## Kiểm kê SQL và đối tượng DB

| Thành phần | Source repository | Snapshot thử nghiệm | Kết luận |
|---|---|---|---|
| CREATE DATABASE | NOT FOUND bộ SQL nộp bài | Dump không phải installer tự tạo DB | Thiếu gói cài độc lập |
| 13 bảng nghiệp vụ | Entity, không có bộ base CREATE TABLE SQL trong repo | Có đủ 13 DDL | DB từng được tạo; thiếu tài liệu/gói nộp, không phải thiếu DB |
| 3 bảng auth | 01_expand_auth.sql | Có đủ | Migration guard cố định Stage2, không dùng nguyên để cài DB demo mới |
| FK/UNIQUE/CHECK/INDEX | Auth migration và annotation từng phần | Đủ 16 bảng | Có thể biên soạn schema-only trong A2 sau duyệt |
| Version | 03_stage8_versions.sql | Có 4 cột version | Guard Stage8; không chạy trên target khác |
| Procedure | 3 helper trong 01/02/03 | Không có CREATE PROCEDURE trong backup | Source tạo/CALL/DROP tạm; tồn tại live NOT VERIFIED |
| Trigger / function / view | NOT FOUND định nghĩa trong SQL source | Không có định nghĩa trong backup | Live NOT VERIFIED; rubric không bắt buộc tất cả |
| SQL 5 màn hình | Java JdbcTemplate/JPQL/derived/JPA | Bằng chứng test/log cũ | Thiếu gói SQL tương ứng để nộp |

00_preflight_readonly.sql chỉ SELECT. 01 tạo routine/bảng; 02 routine INSERT backfill có transaction/rollback; 03 ALTER version. 01/03 DDL implicit commit: không hứa rollback DDL. CREATE PROCEDURE xảy ra trước CALL kiểm guard, nên guard bên trong không khiến script an toàn cho mọi DB. A1 không chạy SQL nào.

Không Flyway/Liquibase/autostart migration trong pom và cấu hình được đọc. README manual có “default false” là bối cảnh Stage2; application.properties hiện auth persistence=true: cần giải thích lịch sử, không đổi cấu hình A1. Không cần thêm trigger/procedure/view chỉ để đủ số loại đối tượng nếu giảng viên không yêu cầu.

Nguồn SQL: database/migrations/00_preflight_readonly.sql, 01_expand_auth.sql, 02_backfill_accounts.sql, 03_stage8_versions.sql; hướng dẫn ở database/README.md. Việc xuất gói nộp cần schema-only có FK/INDEX/CHECK đầy đủ, không đưa backup chứa dữ liệu và secrets vào Git.
