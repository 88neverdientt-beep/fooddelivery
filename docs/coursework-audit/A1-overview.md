# A1 — Full Database Coursework Audit

## Trạng thái và phạm vi

**PARTIAL — đã hoàn tất kiểm toán từ nguồn khả dụng, chưa đủ bằng chứng xác minh DB live/demo và chưa đủ bộ nộp để kết luận đạt 10/10.** DB LIVE NOT VERIFIED. Mục tiêu là bài tập lớn CSDL theo rubric người dùng cung cấp, không production release.

Chỉ tạo 10 Markdown trong docs/coursework-audit/. Không sửa code/config/Entity/migration/SQL, không khởi động MySQL/backend/frontend, không tạo fixture, không chạy test/build có thể ghi file/DB, không đọc credential hoặc ghi DB. Không commit/push/pull/reset/rebase/merge/deploy. Không thay Git global config khi lệnh -C báo ownership; đọc lại bằng --git-dir/--work-tree chỉ định repository. Snapshot Git và SHA256 của 409 file ban đầu nằm ở evidence-index.

**Git baseline:** main; HEAD 0315de8566d299472b28b2f10bb50326c7d6b9aa. Remote github trỏ GitHub 88neverdientt-beep/fooddelivery, origin trỏ GitLab java-spring-192006/food-delivery. Không truy cập remote để xác minh GitHub trong A1. Baseline có 8 file untracked:7 báo cáo 8.2 và file tên `how -s --format=fuller 0315de8`; giữ nguyên tất cả. Không điều tra/ghi đè lịch sử từ cuộc kiểm toán trước.

## Kết quả trọng tâm

- Snapshot Stage8.2 có 16 bảng/107 cột/16 PK/21 FK/13 UNIQUE/6 CHECK/45 index. Có đủ 16 Entity tương ứng, gồm 13 nghiệp vụ+3 auth. Không mặc định production schema đã giống snapshot.
- ERD khái niệm và Data Diagram nộp bài: MISSING trong nguồn đã tìm. Không tự vẽ lại A1.
- Phân tích CK/FD cho 16 quan hệ, chỉ rõ ngoại lệ tổng dòng/tổng đơn và hạn refresh theo writer; chưa chứng nhận toàn mô hình nghiêm ngặt 3NF.
- Đã có hai form, một DB search và hai aggregate report phù hợp. Không thấy lý do phải viết thêm frontend chỉ để đáp ứng số màn hình.
- SQL có cả JdbcTemplate, JPQL/derived và Hibernate-generated. Thiếu base DDL độc lập trong repo và góiSQL nộp bài5 màn hình. Không giả SQL tương đương là DML viết tay hiện có.
- Ước lượng kỹ thuật bảo thủ4,75/10; giảng viên quyết định điểm thực và cách hiểuSQL. Đường ngắn nhất tăng điểm là tài liệu/mô hình/SQL và demo được duyệt, không production.

## Kiến trúc xác minh từ source

POM: Java25, SpringBoot4.1.1, spring-boot-starter-data-jpa, mysql-connector-j, validation, security và OAuth2ResourceServer. Frontend package.json: React19.2 range, TypeScript5.9 range, ReactRouter7.18.5, ReactHookForm/Zod, TanStackQuery; package-lock mới là phiên bản đã khóa. A1 chỉ đọc manifest, không chạy cài/build để xác minh runtime.

Luồng kiến trúc (sơ đồ chữ từ implementation, không phải ERD):

```text
React route/page → feature api.ts → session/http (same-origin /api)
 → Controller → Service (@Transactional + role/ownership)
 → JpaRepository/JPQL/Hibernate hoặc JdbcTemplate bound SQL → MySQL
 → DTO/ApiResponse → schema parse/query cache → UI
```

Nguồn backend: src/main/java/vn/gaugaugau/fooddelivery/; frontend: frontend/src/; migration: database/migrations/; tài liệu: docs/ và README; deploy/ là template, không là installer bài nộp. Snapshot DDL/log nằm ngoài repo ở food-delivery-mysql-test/phase8-2-load-boundary-20261111. Không đưa dump códata/secrets vào Git.

Cấu hình application.properties: datasource URL/username/password từ FOOD_DB_*; ddl-auto=validate; show-sql=false; open-in-view=false; auth.persistence-enabled=true; JWT keys/issuer/audience từ env. Không in giá trị env hoặc đoán database từ cấu hình biến. PersistenceConfiguration scan13entity nghiệp vụ; AuthPersistenceConfiguration bổ sung3 auth khi flagtrue. Migration manual không chạy tự động; không Flyway/Liquibase trong pom.

## Module và đường dẫn thực tế

Đường dẫn Java trong bảng tương đối với `src/main/java/vn/gaugaugau/fooddelivery/`; React tương đối với `frontend/src/features/`. Tên controller/service/repository là implementation đã kiểm kê, không module giả.

| Module | React | Controller → Service → dữ liệu | Liên quan BTL |
|---|---|---|---|
| Xác thực/Account | auth/, account/ | auth/controller/AuthController, AccountAdminController → auth/service/AuthService → auth/repository/AccountRepository,AuthSessionRepository,RefreshTokenRepository; auth/model/ | Hỗ trợ4 role, account/profile vàconstraint |
| Customer/profile | customer/, account/ | controller/CustomerController → AuthService tạo mới; service/CustomerService đọc/sửa → repository/CustomerRepository | Hồ sơ, input/validation |
| Restaurant/profile | admin-management/CreatePages.tsx, restaurant-management/ProfilePage.tsx | controller/RestaurantController → AuthService.createRestaurant hoặc service/RestaurantService → RestaurantRepository/AccountRepository | Form F1 |
| Driver/profile | admin-management/CreatePages.tsx, driver-management/ProfilePage.tsx | controller/DriverController → AuthService.createDriver hoặc service/DriverService → DriverRepository/AccountRepository | Formdựphòng |
| Catalog/menu | public/, restaurant-management/MenuPages.tsx | controller/FoodItemController,RestaurantFoodItemController → FoodItemService,RestaurantFoodItemService → FoodItemRepository,RestaurantFoodItemRepository,RestaurantRepository | N–N, form F2; ReactcatalogCRUD chưa có |
| Khám phá/tìm menu | public/PublicPages.tsx, RestaurantDetail.tsx | controller/CustomerReadController → service/CustomerReadService → RestaurantRepository,RestaurantFoodItemRepository,FoodItemRepository | DB searchdựphòng |
| Cart | cart/ | controller/CartController,CartItemController → service/CartService,CartItemService → CartRepository,CartItemRepository | Giỏ cùng nhà hàng; nativeupsert, quantity |
| Checkout/orders | checkout/,orders/ | controller/OrderController → service/OrderService → OrderRepository,CartItemRepository,...; PaymentService.createPayment | Transaction/snapshot/history |
| Payment/COD | orders/,driver-management/ | controller/PaymentController đọc → service/PaymentService; COD hoàn tất qua DeliveryService gọi confirmCashPayment → PaymentRepository | Money invariant, không bịa endpointCOD riêng |
| Delivery | driver-management/ | controller/DeliveryController → service/DeliveryService → DeliveryRepository,OrderRepository,DriverRepository | Trạngthái/ownership |
| Ratings | ratings/,restaurant-management/ReviewsPage.tsx | controller/RatingController → service/RatingService → RatingRepository,OrderRepository,profiles | EXISTS completed, không FKorder |
| Restaurant management | restaurant-management/OrderPages.tsx,DashboardPages.tsx | controller/RestaurantManagementController → service/RestaurantManagementService → JdbcTemplate; OrderRepository.findPageDetails | Search S1/report R1 |
| Driver management | driver-management/DeliveryPages.tsx,DashboardPages.tsx | controller/DriverManagementController → service/DriverManagementService → JdbcTemplate/DTO mapping | Reportcounts/timestamps dựphòng |
| Admin management | admin-management/ListPages.tsx,DashboardPages.tsx | controller/AdminManagementController → service/AdminManagementService → JdbcTemplate; OrderService cho detail | Report R2/DB lists |
| Validation/security | auth/guards và schemafeature | config/SecurityConfiguration; auth/security/AccessRules,CurrentActor; utils/GlobalExceptionHandler | Đa lớp, không tin role/IDclient |

Năm chuỗi chi tiết có controller/method/API/SQL/bảng/validation và nguồn trong forms-search-reports và sql-traceability. Không mọi truy cập DB đều qua Repository: các aggregate dùng JdbcTemplate trực tiếp.

## Baseline8.2 đã đọc và giới hạn sử dụng

Đủ7 file yêu cầu: phase8-2-result.md, test-results.md, files.txt, browser-matrix.md, security-audit.md, production-readiness.md, blocker-analysis.md. Không file nào NOT FOUND. JSON178 JUnit và metadata/log cũ cũng đã đọc. Đây là kết quả lịch sử, không test A1 mới:

Backend 178/178, frontend 315/315; Linux main 210/210+strict 15/15; Windows main 204/210+strict 14/15; integrity 54/54; load 24/24. WindowsWebKit/Safari/productioninfra vẫn là giới hạn Hướng B; không tự đóng hoặc đưa vào P0 coursework. Sốtest không tự tạo điểmERD/3NF.

SQLoracle ADMIN cuối có2417 đơn, paid COMPLETED 697,total32.972.000VND trong snapshot đã nêu. Bản prooftrước load có2187 đơn; không trộn hai thời điểm. JUnit summary sao chép sang rootload phục vụ linkage không là runmới.

## Hoàn thành nhiệm vụ A1

| Yêu cầu | Kết quả A1 |
|---|---|
| Khảo sát kiến trúc/source/module | VERIFIED tĩnh |
| Kiểm kê schema/cột/khóa/quan hệ | VERIFIED snapshot+Entity, DB LIVE NOT VERIFIED |
| ERD/DataDiagram | Đã xác định MISSING, không vẽ A1 |
| CK/FD/1NF/2NF/3NF | PARTIAL, đủ 16 quan hệ và ngoại lệ có căn cứ |
| Chọn2 form/1 search/2 report | Đủ implementation, live NOT VERIFIED |
| TraceSQL/ORM5 chức năng | VERIFIED source; SQL minh họa không thực thi |
| Chấm rubric/backlog/demo15 phút | Đã bàn giao, không bảo đảm điểm/do rehearsal |
| Bảo toàn Git/source | Đối chiếu cuối trong evidence-index, chỉ chấp nhận10 file A1 mới |

Không tuyên bố PASS hay chuyển A2. Không thiếu quyền nào ngăn đọc source; không yêu cầu khởi động DB để lấp chỗ trống trong giới hạn A1. Đề xuất duyệt A2 tập trung P0, trước hết chốt cách hiểuSQL và phạm vi mô hình chuẩn hóa.

## Source anchors

- [pom.xml:55](<F:/New folder/food-delivery/pom.xml:55>).

- [frontend/package.json:28](<F:/New folder/food-delivery/frontend/package.json:28>).

- [src/main/resources/application.properties:10](<F:/New folder/food-delivery/src/main/resources/application.properties:10>).

- [src/main/java/vn/gaugaugau/fooddelivery/config/PersistenceConfiguration.java:11](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/config/PersistenceConfiguration.java:11>).

- [src/main/java/vn/gaugaugau/fooddelivery/auth/config/AuthPersistenceConfiguration.java:9](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/config/AuthPersistenceConfiguration.java:9>).

- [frontend/src/app/router.tsx:285](<F:/New folder/food-delivery/frontend/src/app/router.tsx:285>).

- [frontend/src/lib/api/http.ts:1](<F:/New folder/food-delivery/frontend/src/lib/api/http.ts:1>).

- [src/main/java/vn/gaugaugau/fooddelivery/config/SecurityConfiguration.java:16](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/config/SecurityConfiguration.java:16>).
