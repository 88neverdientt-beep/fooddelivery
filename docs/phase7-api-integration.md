# Giai đoạn 7 — Capability và hợp đồng API

Khảo sát mã nguồn ngày10/11/2026. Người dùng đã phê duyệt12GET/KPI/test và phê duyệt riêng bảo vệ status writer. Phần dưới ghi hợp đồng đã triển khai và ranh giới phê duyệt. Giữ69ACL hiện có, auth/CSRF/refresh, lifecycle Order/Delivery/Payment và bản sửa confirm/cancel Giai đoạn6.

## Capability matrix

| Module | Chức năng | Endpoint hiện có | Method | Role thực tế | Đủ/Thiếu |
|---|---|---|---|---|---|
| Auth/profile | Login/me/password/logout | /auth/* | GET/POST | Theo contract auth | A: tái dùng; ADMIN không có profile riêng/name editable |
| Accounts | Danh sách/trạng thái | /admin/accounts; /admin/accounts/{id}/status | GET/PUT | ADMIN | List không phân trang; status ACTIVE/DISABLED, chặn self-disable, thiếu bảo vệ cross-disable/stale write |
| Customer | List/detail/update/disable | /customers; /customers/{id} | GET/PUT/DELETE | ADMIN (detail/update còn CUSTOMER own) | A: detail; B: list phân trang; không chỉnh cart/tạo đơn thay khách |
| Restaurant | List/detail | /restaurants; /restaurants/{id} | GET | PUBLIC sanitized | B: list quản trị và detail đầy đủ tối thiểu; không dùng public DTO để ghi đè contact |
| Restaurant | Tạo/sửa hồ sơ/đóng mở | /restaurants; /restaurants/{id} | POST/PUT | ADMIN, PUT còn RESTAURANT own | A: dùng DTO đầy đủ và confirmation; không approval workflow |
| Driver | List/detail/create/update | /drivers; /drivers/{id} | GET/POST/PUT | ADMIN, detail/PUT còn DRIVER own | A: detail/full profile; B: list phân trang và counts |
| Order | Detail | /orders/{id} | GET | ADMIN và các owner theo role | A: tái dùng; B: list toàn hệ thống phân trang |
| Delivery | Theo dõi/chi tiết | Không có GET ADMIN; OrderDTO chỉ delivery status/timestamps | GET | API management hiện chỉ DRIVER | B: list và detail ADMIN; không mở DRIVER APIs cho ADMIN |
| Delivery | Assign/unassign/reassign | Không có | — | — | Không triển khai; self-accept DRIVER giữ nguyên |
| Payment | Detail theo Order | /payments/orders/{orderId} | GET | ADMIN và các owner | A: tái dùng; B: list phân trang; không mutation/refund/settlement |
| Review | List theo Restaurant | /restaurants/{id}/ratings[/page] | GET | PUBLIC sanitized | B: list ADMIN toàn hệ thống; detail dialog từ row; không sửa/xóa review |
| Reporting | Dashboard/aggregate | Không có ADMIN aggregate | GET | — | B: API toàn tập, không cộng một trang |
| Audit | Xem audit history | Không có table/API audit | — | — | Application logger có event account/status, không audit history bền vững; không tạo schema |

## Nhóm B —12GET đã phê duyệt và triển khai

Prefix /admin-management; tất cả chỉ ADMIN ACTIVE từ principal/DB, không impersonation. CUSTOMER/RESTAURANT/DRIVER403, anonymous/revoked/disabled401. Security HTTP và service @PreAuthorize, không tin role/body/query client. Mỗi endpoint readOnly=true, projection parameterized, không mutation/DDL/lock lifecycle. ApiResponse/PageResponse hiện có, page0..10000,size1..50; default20, sort newest|oldest theo ID ổn định; q≤100 literal LIKE escape, không SQL fragment từ client. ID dương, enums/date/filter không hợp lệ400, notfound404; không dùng422 giả. Không trả entity/hash/token/session/key hoặc transaction_code.

1. GET /admin-management/accounts?q=&role=&status=&sort=&page=&size=
   - Page<AccountRow>: accountId,email,role,status,createdAt,customerId/restaurantId/driverId nullable,name nullable. Filter role/status đúng enum. Không thêm đổi role/create ADMIN.
2. GET /admin-management/accounts/{accountId}
   - AccountRow cùng projection, dùng detail và refetch xác minh sau timeout/status mutation. Không truy xuất auth_sessions/refresh_tokens.
3. GET /admin-management/customers?q=&accountStatus=&sort=&page=&size=
   - Page<CustomerRow>: customerId,name,email,createdAt,accountId/accountStatus nullable,orderCount toàn tập. Detail tái dùng GET /customers/{id}. Không bulk address/phone.
4. GET /admin-management/restaurants?q=&accountStatus=&activity=all|open|closed&sort=&page=&size=
   - Page<RestaurantRow>: restaurantId,name,address,restaurantStatus nullable,createdAt,accountId/accountStatus nullable,orderCount và menuCount toàn tập. Detail không N+1.
5. GET /admin-management/restaurants/{restaurantId}
   - RestaurantDetail: RestaurantResponseDTO (name/email/phone/address/status/createdAt) + accountId/accountStatus nullable,orderCount/menuCount. Dùng API riêng, không đổi public response/quyền.
6. GET /admin-management/drivers?q=&accountStatus=&activity=all|receiving|paused&sort=&page=&size=
   - Page<DriverRow>: driverId,name,email,licensePlate,driveStatus nullable,createdAt,accountId/accountStatus nullable,deliveryCount/activeDeliveryCount toàn tập. Detail tái dùng GET /drivers/{id}; lịch sử dùng endpoint8 với driverId.
7. GET /admin-management/orders?q=&status=&paymentStatus=&restaurantId=&customerId=&from=&to=&sort=&page=&size=
   - Page<OrderRow>: orderId,customer{id,name},restaurant{id,name},createdAt,subtotal,shippingFee,totalAmount,orderStatus,paymentId/paymentStatus nullable,deliveryId/deliveryStatus nullable. Detail tái dùng GET /orders/{id}; không mutation trạng thái ADMIN.
8. GET /admin-management/deliveries?q=&status=&driverId=&restaurantId=&from=&to=&sort=&page=&size=
   - Page<DeliveryRow>: deliveryId,orderId,driver{id,name} nullable,restaurant{id,name},orderStatus,deliveryStatus,pickupTime/deliveredTime nullable,orderCreatedAt. Filter kỳ theo Order.createdAt, ghi nhãn rõ; không giả assignedAt.
9. GET /admin-management/deliveries/{deliveryId}
   - DeliveryDetail: {delivery:DeliveryRow,pickupAddress,deliveryAddress,licensePlate nullable,order:OrderResponseDTO hiện có}. Không customer phone/email hoặc GPS. Không tự phân công/sửa driver_id.
10. GET /admin-management/payments?q=&status=&method=&from=&to=&sort=&page=&size=
    - Page<PaymentRow>: paymentId,orderId,methodCode/methodName nullable,amount,paymentStatus,createdAt,paidAt/refundedAt nullable,orderStatus. Kỳ theo Payment.createdAt, không trộn paidAt; detail dùng GET /payments/orders/{orderId}. Không trả transactionCode, không PUT PaymentStatus.
11. GET /admin-management/reviews?q=&restaurantId=&score=&from=&to=&sort=&page=&size=
    - Page<ReviewRow>: ratingId,score,comment,createdAt,customer{id,name},restaurant{id,name}. Score1..5, q tìm ID/nội dung/tên nhà hàng, không bulk customer contact. Detail dialog dùng row đầy đủ, refresh từ list; không moderation mutation.
12. GET /admin-management/analytics?from=&to=
    - Default30ngày, inclusive1..93ngày; today/7/30 do frontend tạo từ businessToday của server. Return from/to/businessToday/timeZone; allTimeCounts{customers,restaurants,drivers,accounts,orders}; orderCohort{total,states,nonCancelledOrderValue,days}; recordedSuccessfulPayments{count,foodValue,shippingValue,totalValue,days}; deliveryCohort{states,terminalCount,deliveredCount,deliveredSharePercent nullable}; paymentMethods; topRestaurants/topDrivers tối đa10. Chi tiết KPI/SQL trong phase7-reporting-definitions.md.

Danh sách GET từ9module dùng count + bounded projection, aggregate theo nhóm/bulk query có giới hạn; không gọi API theo từng row, không hydrate tất cả rồi paginate trong Java. Query list có thể đổi giữa count/data bởi giao dịch khác, không tuyên bố snapshot xuyên nhiều request; refresh cho dữ liệu mới. Không hardcode ID QA để lọc production: Stage7 dùng schema-only + fixture mới hợp lệ, hoàn toàn không sao chép3row QA lỗi từ Stage6.

Test plan cho12GET: role matrix với filters thật, fake role/ID request, strict DTO privacy/keys allowlist, bounds/search wildcard literal/sort/date, list-total đúng, không N+1/query growth, LAZY với OSIV=false, denied GET không ghi, aggregates SQL độc lập và ranh giới00:00/end-exclusive, không double count joins, empty denominator/null. Mở rộng inventory69→81endpoint/486tổ hợp6actor; không bỏ assertion cũ. Whitelist test chỉ thêm fooddelivery_stage7_e2e, hồi quy toàn bộ136JUnit và frontend/E2E Giai đoạn1–6.

## Nhóm C/D — bảo vệ mutation tài khoản đã phê duyệt riêng

Trước sửa AuthService.setStatus chỉ khóa account đích, cấm DISABLED chính mình, sau đó set và revoke session nếu DISABLED. Không có count/lock tập ADMIN hoặc kiểm lại actor sau khi chờ khóa; hai ADMIN có thể cùng qua xác thực rồi vô hiệu hóa lẫn nhau. DTO Status trước sửa chỉ có status. Bản đã phê duyệt bổ sung các kiểm tra bên dưới; MySQL test kiểm hai actor đã xác thực trước barrier, HTTP E2E kiểm cross-disable/same-target thực tế.

Đã triển khai trên PUT /admin/accounts/{id}/status:

- Request thêm optional expectedStatus: ACTIVE|DISABLED; client mới luôn gửi, client cũ không gửi giữ hợp đồng cũ trừ invariant an toàn. Không role/email/ID mass assignment. Response Me hiện có, không đổi schema.
- Sửa AuthService/AccountRepository/AccountAdminController/AuthDtos và test: status update khóa toàn bộ hàng role ADMIN theo accountId tăng dần trước khi khóa account đích; kiểm lại actor tồn tại, roleADMIN,statusACTIVE dưới khóa (và phiên chưa bị thu hồi). Chỉ sau đó kiểm expectedStatus (khác409), giữ self-disable409 và cấm mất ADMIN ACTIVE cuối cùng409. Không chỉ SELECT COUNT không khóa. Mọi status writer/disableProfile dùng cùng đường này. Không tạo ADMIN mới hoặc đổi role trong HTTP.
- Đọc/kiểm phiên actor dưới Account→Session order hiện có, không khóa theo thứ tự Session→Account; auth rotate/logout giữ nguyên. Không đổi isolation toàn cục hoặc Order→Delivery. Concurrent cross-disable phải còn ≥1ACTIVE ADMIN; request actor đã bị disabled phải thất bại; concurrent cùng expectedStatus chỉ một đổi trạng thái, request cũ409. No-op status không tự tạo revision/version giả; expectedStatus không phát hiện vòng ACTIVE→DISABLED→ACTIVE, công khai giới hạn ABA nếu không migration.
- Chỉ revoke sessions sau kiểm điều kiện, transaction rollback khi lỗi. UI confirm, retry=false, không optimistic; timeout đọc account detail, nếu chưa rõ giữ khóa cho tới refetch thành công; không gửi lại PUT tự động.
- Test MySQL2ADMIN thật (fixture riêng Stage7): cross-disable latch, same-target expectedStatus, self-disable, last-active protection, invalid body/role, revocation/rollback, response-loss và hồi quy các profile DELETE có chung disableProfile. Không tắt security.

Các file đã triển khai đúng phạm vi: AdminManagementController/Service/Dtos, AdminManagementMySqlTest; whitelist/inventory và4file status nêu trên. Không thay dependency/schema/auth keys/password/JWT/refresh/CSRF, checkout, Order/Delivery/Payment writers, hoặc3row QA. Kết quả cuối xem phase7-test-results.md.

## Giới hạn không triển khai mới

Không có API assign/reassign/FAILED/RETURNED/GPS/settlement/refund/audit history; không tạo workflow/schema giả. ADMIN không có entity profile để sửa tên riêng: /admin/profile đọc /auth/me và dùng password/logout cũ. Restaurant/Driver trạng thái hoạt động khác Account.status: chỉnh bằng full profile PUT hiện có, confirmation và hiển thị mọi trường sẽ lưu; không gọi đó là khóa tài khoản, không tự hủy đơn/chuyến. API full-profile cũ chưa có CAS: không tuyên bố chống mọi stale overwrite, không tự đổi locking của chúng. Không mở edit role, sửa review, cart/customer-order proxy, Order/Delivery/Payment status ADMIN.
