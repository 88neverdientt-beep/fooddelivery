# A1 — Kiểm tra chuẩn hóa 1NF, 2NF và 3NF

**PARTIAL. DB LIVE NOT VERIFIED.** Chưa đủ căn cứ tuyên bố toàn bộ mô hình đạt 3NF. Không tìm thấy hồ sơ chuẩn hóa cũ. Không suy FD từ mẫu dữ liệu, từ 54/54 integrity hoặc từ việc có PK/FK.

## Phương pháp

1NF: các cột scalar, không thấy repeating group/CSV các ID. TEXT, tên và địa chỉ là một giá trị theo miền ứng dụng. 2NF xét mọi khóa ứng viên (CK), kể cả khóa ghép, không chỉ surrogate PK. 3NF yêu cầu với mỗi FD không tầm thường X→A, X là superkey hoặc A là prime. UNIQUE nullable trong MySQL chỉ tạo khóa có điều kiện khác NULL, không là CK cổ điển của toàn quan hệ.

`all` nghĩa mọi thuộc tính trong cùng quan hệ. “Tương thích F” chỉ là kết luận đối với tập FD có bằng chứng, chưa chứng minh tập FD đầy đủ: **INSUFFICIENT EVIDENCE** nếu chưa chốt quy tắc nghiệp vụ. Khóa email xét theo collation thực tế. Các bảng dưới viện dẫn Entity cùng tên tại model/ hoặc auth/model/; DDL từng cột/constraint nằm ở [inventory](A1-database-inventory.md).

## Kết luận từng quan hệ

| TABLE | CANDIDATE KEYS | FUNCTIONAL DEPENDENCIES | 1NF | 2NF | 3NF | EVIDENCE | FINDING |
|---|---|---|---|---|---|---|---|
| customers | customer_id; email | id→all; email→all | Đạt cấu trúc | Đạt CK đơn đã biết | Tương thích F; đầy đủ NOT VERIFIED | Customer; DDL | Phone/name không UNIQUE; credential legacy là dư thừa xuyên bảng |
| restaurants | restaurant_id; email | id→all; email→all | Đạt cấu trúc | Đạt CK đơn | Tương thích F; đầy đủ NOT VERIFIED | Restaurant; DDL | restaurant_status khác account.status |
| drivers | driver_id; email | id→all; email→all | Đạt cấu trúc | Đạt CK đơn | Tương thích F; đầy đủ NOT VERIFIED | Driver; DDL | License plate nullable, không UNIQUE, không suy plate→driver |
| food_items | item_id; name chỉ CK logic dự định | item_id→name,category,description | Đạt cấu trúc | Đạt CK đã chứng minh | Tương thích F; INSUFFICIENT EVIDENCE đầy đủ | FoodItem; FoodItemService.existsByName | Kiểm tên trùng ở app không bảo vệ toàn DB. Category chỉ là nhãn, không có category_id |
| restaurant_food_items | m_id; (restaurant_id,item_id) | id→all; cặp→id,price,is_available | Đạt cấu trúc | Đạt theo quy tắc giá/trạng thái thuộc toàn cặp | Tương thích F; đầy đủ NOT VERIFIED | RestaurantFoodItem; UNIQUE cặp | Catalog không có price; không có căn cứ item_id→price hoặc restaurant_id→price |
| carts | cart_id; customer_id là khóa có điều kiện khác NULL | cart_id→customer_id,restaurant_id; customer≠NULL→cart_id,restaurant_id | Đạt cấu trúc SQL | Đạt CK đơn | Tương thích F, cần giải thích NULL | Cart; CartRepository | restaurant_id là cache của giỏ cùng nhà hàng, invariant xuyên bảng |
| cart_items | cart_item_id; (cart_id,m_id) là CK logic dự định, chưa UNIQUE | id→all; cặp→quantity,note theo quy tắc gộp service | Đạt cấu trúc | Tương thích toàn cặp logic | INSUFFICIENT EVIDENCE CK/FD đầy đủ | CartItem; CartItemService | Không UNIQUE cặp; giá/subtotal của DTO được tính, không lưu tại bảng |
| orders | order_id | id→all; (subtotal,shipping_fee)→total_amount | Đạt cấu trúc | Đạt CK đơn đã biết | Ngoại lệ dư thừa dẫn xuất; chưa đạt chứng minh 3NF nghiêm ngặt | Order; OrderService.createOrder | Nhóm hai khoản tiền không superkey, total không prime; address là snapshot hợp lệ |
| order_details | order_detail_id | id→all; (quantity,unit_price)→subtotal | Đạt cấu trúc | Đạt CK đơn đã biết | Ngoại lệ 3NF nghiêm ngặt theo FD số học | OrderDetail; OrderService.createOrder | Quantity/price không superkey; historical unit_price không do menu_id xác định xuyên thời gian |
| payments | payment_id; order_id NOT NULL UNIQUE | payment_id→all; order_id→all | Đạt cấu trúc | Đạt CK đơn | Tương thích F; đầy đủ NOT VERIFIED | Payment; DDL | amount là snapshot, equality với order là invariant xuyên bảng; transaction_code không CK |
| payment_methods | method_id; method_code | id→all; code→all | Đạt cấu trúc | Đạt CK đơn | Tương thích F; đầy đủ NOT VERIFIED | PaymentMethod; DDL | method_name không UNIQUE; COD không suy SUCCESS |
| deliveries | delivery_id; order_id unique có điều kiện khác NULL | id→all; order≠NULL→all | Đạt cấu trúc SQL | Đạt CK đơn | Tương thích F, cần giải thích NULL | Delivery; DDL | Driver có nhiều chuyến, không suy driver_id→status/time |
| ratings | rating_id | rating_id→all | Đạt cấu trúc | Đạt CK đơn | Tương thích F; đầy đủ NOT VERIFIED | Rating; RatingService.createRating | Không khóa cặp customer/restaurant; có thể nhiều review; không có order_id |
| accounts | account_id; email; profile IDs chỉ khóa có điều kiện | id→all; email→all; profile≠NULL→account trong nhánh tương ứng | Đạt cấu trúc SQL | Đạt CK đơn | PARTIAL, FD điều kiện/NULL cần hình thức hóa | Account; ck_accounts_profile | Role xác định loại liên kết, không xác định profile ID cụ thể |
| auth_sessions | session_id | session_id→account_id,created_at,expires_at,revoked_at | Đạt cấu trúc | Đạt CK đơn | Tương thích F; đầy đủ NOT VERIFIED | AuthSession; DDL | Account có nhiều phiên; account_id không suy expiry |
| refresh_tokens | refresh_token_id; token_hash | id→all; hash→all; session_id→expires_at theo writer hiện tại | Đạt cấu trúc | Đạt CK đơn | Ngoại lệ có điều kiện nếu mọi token chung hạn phiên | RefreshToken; AuthService.issue | session_id không UNIQUE; entity chỉ yêu cầu expiry≤session expiry, cần xác nhận invariant bằng hay không vượt |

## NF-01 — Thành tiền dòng đơn

OrderService.createOrder tính subtotalItem=quantity.multiply(unitPrice), rồi lưu cả ba cột. Trên miền dòng hợp lệ, (quantity,unit_price)→subtotal. Determinant không superkey và RHS không prime: có phụ thuộc từ khóa dòng qua các thuộc tính không khóa đến subtotal, cần giải trình khi đánh giá 3NF nghiêm ngặt.

Unit_price riêng là snapshot cần thiết. Không có FD menu_id→historical unit_price xuyên thời gian vì giá menu có thể đổi. Không đề xuất thay bằng giá hiện tại để “chuẩn hóa”. A1 không xóa cột.

## NF-02 — Tổng Order

Writer lưu total_amount=subtotal+shipping_fee: (subtotal,shipping_fee)→total_amount, nhóm hai khoản tiền không superkey, total không prime. Bản vật lý giữ tổng dẫn xuất không thể chứng nhận nghiêm ngặt 3NF dưới FD này. Lưu record giao dịch là lý do thiết kế, không thay đổi định nghĩa 3NF.

Order.subtotal=SUM(detail.subtotal) là dư thừa aggregate xuyên bảng, không tự gọi là FD nội bảng qua thuộc tính không tồn tại. Shipping hiện là hằng số writer nhưng không suy ∅→shipping_fee cho mọi lịch sử/chính sách chưa được xác nhận.

## NF-03 — Refresh expiry

AuthService.issue đặt expiresAt=session.getExpiresAt() cho mọi token. Nếu mọi token luôn cùng hạn phiên bất biến, session_id→expires_at là FD không superkey→nonprime. Nhưng RefreshToken.validate chỉ yêu cầu token không vượt hạn phiên. Đây là ngoại lệ theo writer hiện tại; quy tắc toàn miền **INSUFFICIENT EVIDENCE**. Cần chốt “bằng” hay “không vượt” trước đề xuất A2, không tự sửa rotation/TTL.

## Snapshot, dư thừa và bất thường

- Dữ liệu gốc: catalog name/category/description; menu price/is_available; địa chỉ hồ sơ hiện tại.
- Snapshot: order_details.unit_price; orders.delivery_address; payments.amount. Không suy customer_id→delivery_address của mọi đơn hoặc menu_id→historical price. Equality payment.amount/order.total là invariant xuyên quan hệ, không FD bắc cầu nội bảng payments.
- Dẫn xuất/cache: detail.subtotal; order.subtotal/total; carts.restaurant_id. UPDATE một toán hạng mà quên tổng/header có nguy cơ lệch. Checkout transaction và hậu kiểm lịch sử giảm rủi ro qua writer hiện tại.
- Credential legacy: profile.password và accounts.password_hash được tạo cùng BCrypt lúc đầu; changePassword chỉ cập nhật Account. Đây là dữ liệu chuyển tiếp, không coi hai hash phải luôn bằng sau đổi mật khẩu.
- INSERT SQL trực tiếp có thể ghi quantity/price/score không hợp lệ do thiếu CHECK và liên kết thiếu do FK nullable. Khoảng trống enforce không đồng nghĩa mọi bảng sai 3NF.
- DELETE menu có lịch sử bị FK chặn là bảo vệ lịch sử, không phải lỗi chuẩn hóa. Không có cascade REMOVE từ detail sang món/nhà hàng.
- Catalog existsByName không có UNIQUE(name) hỗ trợ: có rủi ro race, chưa tái hiện trong A1; phải xác nhận tên có thực sự là khóa trước đề nghị constraint.

## A2 tối thiểu

Chốt CK/FD và NULL từng quan hệ, chứng minh trên tập FD đã công bố; tách snapshot hợp lệ khỏi denormalization. Trình bày mô hình logic chuẩn hóa và bản vật lý hiện tại có ngoại lệ. Xác nhận giảng viên chấp nhận giải trình hay yêu cầu đổi vật lý; nếu đổi cần migration/test riêng sau phê duyệt. Không dùng số liệu mẫu để suy FD mới, không tự sửa writer Stage1.

## Bằng chứng theo dòng

- [OrderService.java:149](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/OrderService.java:149>) — `BigDecimal subtotalItem`.

- [OrderService.java:162](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/OrderService.java:162>) — `order.setTotalAmount`.

- [AuthService.java:104](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:104>) — `refresh.saveAndFlush`.

- [RefreshToken.java:22](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/model/RefreshToken.java:22>) — `expiresAt.isAfter`.

- [CartItemService.java:110](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/CartItemService.java:110>) — `cartItemTmp`.

- [RatingService.java:59](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RatingService.java:59>) — `hasCompletedOrder`.

- [FoodItemService.java:35](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/FoodItemService.java:35>) — `existsByName`.

- [AuthService.java:131](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:131>) — `a.setPasswordHash`.


## Phụ lục thực đơn độc lập — 14/11/2026

Kết quả A1 phía trên giữ nguyên như bằng chứng lịch sử. Source mới và DB fooddelivery_independent_menu sau migration04 dùng FoodItem như nội dung riêng của một menu: item_id ở restaurant_food_items UNIQUE, nên FoodItem→Menu đổi từ0..N thành0..1. Main chưa được migration, không đổi kết luận schema Main ở phần lịch sử. Xem [ERD, quan hệ và FD/3NF version04](../independent-menu-data-model.md) cùng schema-reference-independent-menu.json. Không có bảng mới/cascade mới; mọi cart/order FK theo menuID và giá snapshot giữ nguyên.
