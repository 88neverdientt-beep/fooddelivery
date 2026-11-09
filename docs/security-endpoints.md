# Endpoint authorization matrix

69 endpoints: 59 business routes and 10 Auth/Admin routes. Deny all unmatched routes.

Every route is tested with anonymous, CUSTOMER, RESTAURANT, DRIVER, ADMIN, DISABLED in the two inventory-driven security tests. Denied requests execute without test rollback and compare persistent checksums. Allowed mutation samples roll back; functional positives are verified separately. Common errors: 400 validation, 401 authentication, 403 role/CSRF, 404 ownership, 409 conflict.

- `GET /cart/{customerId}`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `POST /{customerId}/cart-items`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 201.
- `PUT /cart-items/{cartItemId}`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `DELETE /cart-items/{cartItemId}`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `POST /customers`: PUBLIC + CSRF. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 201.
- `GET /customers`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `GET /customers/{customerId}`: CUSTOMER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `PUT /customers/{customerId}`: CUSTOMER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `DELETE /customers/{customerId}`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `GET /deliveries/available`: DRIVER. Active driver, matching driverId on accept; only assigned driver can update. Available view omits customer delivery address. Success 200.
- `POST /deliveries/{deliveryId}/accept`: DRIVER. Active driver, matching driverId on accept; only assigned driver can update. Available view omits customer delivery address. Success 200.
- `PUT /deliveries/{deliveryId}/status`: DRIVER. Active driver, matching driverId on accept; only assigned driver can update. Available view omits customer delivery address. Success 200.
- `POST /drivers`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 201.
- `GET /drivers`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `GET /drivers/{driverId}`: DRIVER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `PUT /drivers/{driverId}`: DRIVER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `DELETE /drivers/{driverId}`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `POST /food-items`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 201.
- `GET /food-items`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `GET /food-items/{itemId}`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `PUT /food-items/{itemId}`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `DELETE /food-items/{itemId}`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `GET /`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `POST /customers/{customerId}/orders`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 201.
- `GET /customers/{customerId}/orders`: CUSTOMER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `GET /orders/{orderId}`: CUSTOMER, RESTAURANT, DRIVER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `PUT /orders/{orderId}/delivery-address`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `PATCH /orders/{orderId}/status`: RESTAURANT. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `PATCH /orders/{orderId}/cancel`: CUSTOMER, RESTAURANT. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `GET /payments/orders/{orderId}`: CUSTOMER, RESTAURANT, DRIVER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `POST /restaurants/{restaurantId}/ratings`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 201.
- `GET /restaurants/{restaurantId}/ratings`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `GET /restaurants/{restaurantId}/ratings/average`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `PUT /ratings/{ratingId}/customers/{customerId}`: CUSTOMER. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `DELETE /ratings/{ratingId}/customers/{customerId}`: CUSTOMER, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `POST /restaurants`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 201.
- `GET /restaurants`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `GET /restaurants/{restaurantId}`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `PUT /restaurants/{restaurantId}`: RESTAURANT, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `DELETE /restaurants/{restaurantId}`: ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `POST /restaurant-food-items`: RESTAURANT, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 201.
- `GET /restaurant-food-items`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `GET /restaurant-food-items/{restaurantFoodItemId}`: PUBLIC. Public sanitized response; registration fixes CUSTOMER role and rejects extra fields. Success 200.
- `PUT /restaurant-food-items/{restaurantFoodItemId}`: RESTAURANT, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `DELETE /restaurant-food-items/{restaurantFoodItemId}`: RESTAURANT, ADMIN. Service verifies matching principal profile/resource owner; ADMIN only where explicitly listed. Success 200.
- `GET /auth/csrf`: PUBLIC. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 200.
- `POST /auth/register/customer`: PUBLIC + CSRF. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 201.
- `POST /auth/login`: PUBLIC + CSRF. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 200.
- `POST /auth/refresh`: Cookie refresh + CSRF. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 200.
- `POST /auth/logout`: Cookie refresh + CSRF. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 204.
- `POST /auth/logout-all`: M?i role ACTIVE + JWT + CSRF. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 204.
- `POST /auth/change-password`: M?i role ACTIVE + JWT + CSRF. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 204.
- `GET /auth/me`: M?i role ACTIVE + JWT. Account/session from DB; CSRF on unsafe auth methods; refresh/logout use scoped cookie. Success 200.
- `GET /admin/accounts`: ADMIN + JWT. Current DB role ADMIN; status change cannot disable the acting administrator. Success 200.
- `PUT /admin/accounts/{id}/status`: ADMIN + JWT. Current DB role ADMIN; status change cannot disable the acting administrator. Success 200.

Response contracts: ApiResponse<AuthDtos.Me> for registration/profile creation and /auth/me; Tokens for login/refresh, CSRF headerName/token for /auth/csrf, List<Me> for admin accounts, Me for account status. 204 routes have no body. Public restaurant GET uses PublicRestaurant, menu phoneNumber is null, public rating uses generic Customer name. AvailableDelivery contains delivery/order/restaurant IDs and restaurant name/address; assigned driver reads GET /orders/{id} for details. Other business routes retain their existing response DTOs (collection for list endpoints; String for DELETE; Double for average rating). Profile DELETE disables Account without deleting history.

Policy/DTO details and integration notes: phase2-auth.md. Full evidence: phase2-result.md.

## Bổ sung Giai đoạn 5 (phê duyệt ngày09/11/2026)

GET /restaurant-management/profile, /catalog, /orders, /analytics: chỉ RESTAURANT ACTIVE, CurrentActor.restaurantId; anonymous401, CUSTOMER/DRIVER/ADMIN403. Không nhận ID chủ thể từ client để chọn phạm vi. Inventory hiện tại65endpoint:55business và10auth; các quyền61endpoint trước giữ nguyên. PUT menu có expected pair là hợp đồng conditional write cùng quyền owner404 hiện hữu, không mở role mới. Xem phase5-api-integration.md và phase5-security-tests.md.

## Bổ sung Giai đoạn 6 — Driver (đã phê duyệt)

GET /driver-management/deliveries, /deliveries/{deliveryId}, /available, /analytics: chỉ DRIVER ACTIVE, CurrentActor.driverId; không impersonation từ ADMIN, không owner từ query. Detail/list/history chỉ own assigned; pool chỉ active Driver theo driveStatus=true và không lộ dropoff/customer/payment trước khi nhận. DriveStatus=false vẫn đọc/xử lý chuyến đã nhận, pool bị404 theo AccessRules cũ. List giới hạn50, query/date/scope/status/sort validation400; owner404/role403/auth401. Inventory hiện tại69route:59business+10auth,414tổ hợp6actor. Quyền65route trước và các mutation accept/status/profile không đổi. Xem phase6-api-integration.md, phase6-business-rules.md và phase6-security-tests.md.

Bản sửa confirm/cancel đã được phê duyệt riêng: cancelOrder khóa và nạp lại Delivery sau Order để tránh inverse reference cũ trong REPEATABLE_READ; không thay endpoint, ACL, enum hoặc isolation toàn cục. Test tái hiện và bằng chứng dữ liệu QA trước sửa được ghi trong phase6-test-results.md.
