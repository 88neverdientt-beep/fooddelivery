# Giai đoạn 8 — Toàn vẹn dữ liệu

Chỉ kiểm tra `fooddelivery_stage8_e2e` trên instance độc lập `127.0.0.1:3307`; 45 phép kiểm tra toàn vẹn có kết quả PASS.

Có 16 bảng; constraint thực tế: {"CHECK": 6, "FOREIGN KEY": 21, "PRIMARY KEY": 16, "UNIQUE": 13}. Không có orphan theo từng FK, liên kết Account sai role/profile, profile thiếu Account, email trùng, hash BCrypt sai cấu trúc hoặc version âm/null trong dữ liệu cuối.

Artifact backend mới yêu cầu bốn cột version. Các schema Stage1–7 và database hiện tại không được migration trong lượt này, nên không chạy binary mới lên chúng trước khi có migration riêng được duyệt. Hibernate validate sẽ từ chối schema thiếu cột; không chuyển sang update để vượt qua lỗi đó.

Kiểm tra riêng Order/OrderDetail/Payment/Delivery, tiền snapshot, số tiền thanh toán, giỏ hàng cùng nhà hàng và điều kiện đánh giá. Giá lịch sử không bị so sai với giá menu hiện tại. Không blacklist ID QA cũ trong database mới.

Số dòng cuối theo bảng:

- accounts: 1554
- auth_sessions: 4034
- cart_items: 107
- carts: 1128
- customers: 1367
- deliveries: 842
- drivers: 110
- food_items: 293
- order_details: 1322
- orders: 1322
- payment_methods: 14
- payments: 1322
- ratings: 177
- refresh_tokens: 11266
- restaurant_food_items: 199
- restaurants: 28

Bốn truy vấn đại diện có `EXPLAIN FORMAT=JSON`: menu, đơn của khách có dữ liệu, chuyến của tài xế có dữ liệu, aggregate thanh toán. Chi tiết plan nằm trong `database-integrity-final.json`. Dataset nhỏ không chứng minh capacity production; không tự thêm index/schema. Các index tối ưu chỉ được quyết định sau số liệu production và phê duyệt migration.

KPI, nhóm ngày và bảng xếp hạng được đối chiếu độc lập bằng SQL/Decimal/timezone: `mysql-admin-reporting-proof.json`; không gọi tổng thu COD là lợi nhuận hoặc tiền thực nhận.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-20261110/logs/`. Không đưa credential, private key hoặc SQL backup vào Git.
