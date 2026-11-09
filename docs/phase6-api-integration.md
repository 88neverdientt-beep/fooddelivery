# Giai đoạn 6 — API integration và capability

Khảo sát implementation ngày09/11/2026. Nhóm A và bốn GET nhóm B đã được người dùng phê duyệt, triển khai. Ngày10/11 người dùng phê duyệt riêng bản sửa khóa đọc Delivery trong cancelOrder và test hồi quy, mô tả cuối tài liệu. Không đổi schema, transition hoặc isolation toàn cục.

## Nghiệp vụ thực tế

ADMIN tạo Driver qua POST /drivers, Account.role DRIVER và Account.driver_id UNIQUE FK liên kết profile. Driver có nhiều Delivery, Order có một Delivery (UNIQUE order_id). Restaurant CONFIRMED tạo Delivery PENDING chưa có driver. DRIVER đang driveStatus=true tự nhận qua POST /deliveries/{id}/accept với driverId phải khớp principal. Không có Admin assignment/reassignment/unassign hoặc thuật toán phân công. Không giới hạn số chuyến đang làm. driveStatus chỉ boolean cho nhận chuyến mới, không phải AVAILABLE/BUSY/OFFLINE hay trạng thái xác minh ADMIN.

Nhận chuyến khi Order CONFIRMED/PREPARING/READY; pickup chỉ Order READY. Delivery PENDING→PICKED_UP→DELIVERING→DELIVERED, không skip. Pickup ghi pickupTime. DELIVERING đồng bộ Order DELIVERING; DELIVERED ghi deliveredTime, Order COMPLETED và COD Payment SUCCESS trong transaction hiện có. Không có FAILED/RETURNED/reason/refuse/reassign API; CANCELLED do luồng hủy Order. Không có assignedAt, delivery.createdAt, GPS/ETA/thu nhập/commission. Không tạo timestamp hoặc KPI cho trường không tồn tại.

## Capability matrix

| Chức năng | Backend/API hiện có | Quyền và giới hạn | Nhóm/trạng thái |
|---|---|---|---|
| Hồ sơ đọc/sửa, trạng thái nhận chuyến | GET/PUT /drivers/{id} | DRIVER own hoặc ADMIN, driverId từ verified account; name100/phone15/address255/license20; email/role/ID bất biến | A: triển khai ngay |
| Chuyến khả dụng và tự nhận | GET /deliveries/available, POST /deliveries/{id}/accept | Active DRIVER; available không có customer address; accept kiểm tra driverId thật, lock Order→Delivery; một driver thắng | A cho mutation; B cho list có giới hạn |
| Assigned list/history/filter/sort | Chưa có GET theo Driver; GET /drivers chỉ ADMIN | Không được tải tất cả Driver/Delivery hoặc scan Customer/orders để tìm assigned | B: list phân trang theo principal |
| Detail theo Delivery ID | GET /orders/{id} chỉ cho assigned Driver, PUT status trả DeliveryDTO | Thiếu mapping DeliveryID→Order để mở URL trực tiếp/recovery sau accept timeout | B: detail own theo ID, tái dùng OrderDTO hiện có |
| Pickup/giao/COD | PUT /deliveries/{id}/status | DRIVER own, transition/locking/isolation/cash-payment giữ nguyên; kết thúc có xác nhận COD | A: triển khai ngay |
| Dashboard/analytics | Không có aggregate | Không cộng một trang thành toàn tập, không suy thu nhập từ COD/ship fee | B: aggregate own đầy đủ, tối đa93ngày |
| Giao thất bại/từ chối/reassign/GPS | Không có API/schema cho nghiệp vụ này | Không tạo nút giả, không sửa transition/schema | Ngoài hỗ trợ hiện có; không triển khai |

## Bốn API đọc đã phê duyệt và triển khai

Tất cả GET /driver-management/* chỉ DRIVER ACTIVE; driverId lấy CurrentActor, không nhận owner ID chọn phạm vi. ADMIN không impersonate. Dùng ApiResponse và PageResponse hiện có, validation400, auth401, role403, owner/notfound404. Không có mutation/DDL hoặc đổi quyền65API cũ. Transaction chỉ readOnly=true, không thay transaction/isolation/locking lifecycle đang có.

1. GET /driver-management/deliveries?q=&status=&scope=active|history|all&sort=newest|oldest&page=&size=
   - Request: query, q≤100 ký tự literal LIKE; page0..10000,size1..50, enum/sort allowlist, scope mặc địnhactive. active=PENDING/PICKED_UP/DELIVERING; history=DELIVERED/CANCELLED; scope chỉ chọn tập đã assigned cho principal.
   - Response PageResponse<AssignedDelivery>: deliveryId,orderId,driverId,deliveryStatus,orderStatus,orderCreatedAt,pickupTime,deliveredTime,pickup{restaurantId,name,address},deliveryAddress,totalAmount,paymentMethod,paymentStatus. Không email/hash/account/session hoặc contact mới; q chỉ ID Delivery/Order hoặc tên nhà hàng; sort ID ổn định (không giả assignedAt). Detail/address chỉ assigned own.
2. GET /driver-management/deliveries/{deliveryId}
   - Request path ID dương. Trả404 nếu không assigned hoặc driver khác, kể cả chuyến đang available.
   - Response {deliveryId,driverId,deliveryStatus,pickupTime,deliveredTime,pickup{restaurantId,name,address},order:OrderResponseDTO hiện có}. Tái dùng snapshot món/giá/customer name/address/payment được GET /orders cho phép; không thêm phone/email khách, không expose toàn bộ entity.
   - Recovery khi mất accept response: chỉ query detail theo ID, nếu chưa own thì kiểm tra available; không phát lại POST. Không giả assignment thành công.
3. GET /driver-management/available?q=&sort=newest|oldest&page=&size=
   - Active Driver theo AccessRules.activeDriver hiện có. Chỉ PENDING,driver IS NULL,Order CONFIRMED/PREPARING/READY phù hợp điều kiện accept. Query max100,page/size như trên; lọc ở database.
   - PageResponse<AvailableDelivery> giữ đúng5field hiện tại (deliveryId/orderId/restaurantId/name/address), không deliveryAddress/customer/payment/COD trước khi assigned. Đơn đã bị nhận hoặc hủy biến mất. Không sửa GET /deliveries/available cũ hoặc cơ chế tự nhận.
4. GET /driver-management/analytics?from=&to=
   - ISO date inclusive, default30ngày, tối đa93ngày, invalid400. Toàn bộ own assigned deliveries, không một trang.
   - Response {from,to,totalAssignedAllTime,activeNow,statesAllTime,completedInPeriod,pickedUpInPeriod,completedByDay:[{date,count}],pickedUpByDay:[{date,count}],averagePickupToDeliveredMinutes:null|number}. Completed dùng deliveredTime và statusDELIVERED; pickedup dùng pickupTime có thật. Average chỉ DELIVERED có đủ timestamp đúng thứ tự trong cùng deliveredTime period, không tự suy travel time/ETA.
   - Dashboard counts toàn thời gian/hiện tại có nhãn rõ; đồ thị theo mốc pickup/delivered có thật. Không count assigned trong kỳ vì không có assignedAt; không SUCCESS/FAILED rate hoặc tiền công/COD income.

## Kiểm thử triển khai

Real MySQL/filters: role matrix, fake driverId ignored/không đổi scope, owner404, list/available query bounds/literal LIKE/status/history, aggregate toàn tập so SQL, privacy, OSIV=false/LAZY/bounded query, không ghi khi GET. Giữ toàn bộ126JUnit cũ. Existing accept/status sẽ kiểm thử race hai Driver, duplicate transitions, not-ready, cancel race, money rollback và response loss; không đổi lifecycle code để đạt test nếu chưa có phê duyệt mutation/transaction riêng.

Playwright thực: hồ sơ, own list/detail/history, pool nhận chuyến theo cơ chế thật, profile switch/cache, 401/403/404/409, hai tab, lost response, full Customer→Restaurant→Driver→Customer và COD/Rating SQL. Không có unassign/reassign API: báo rõ giới hạn, negative ownership dùng fixture độc lập trong test, không SQL bypass luồng E2E.

Test database mới fooddelivery_stage6_e2e trên3307 đã được prompt cho phép; validate sau copy schema hiện có, app SQL chỉ DML trong database mới; không reset Stage1–5, không3306/fooddelivery. Không migration/dependency mới. Source/config/dữ liệu production giữ nguyên.

## Implementation và giới hạn

DriverManagementController/Service/Dtos mới; SQL parameterized và LIMIT/OFFSET tối đa50, projections riêng. Detail tái dùng OrderRepository.findPageDetails và OrderService mapper trong readOnly transaction. Không sửa DriverService/DeliveryService/PaymentService, transaction isolation, cascade, auth hoặc quyền65endpoint cũ. OrderService có bản sửa đọc Delivery dưới khóa khi hủy, được phê duyệt riêng và mô tả dưới đây. Whitelist test chỉ thêm đúng fooddelivery_stage6_e2e; inventory tăng59business+10auth=69endpoint/414tổ hợp6actor.

Status mutations vẫn JSON enum string: PUT /deliveries/{deliveryId}/status body "PICKED_UP"/"DELIVERING"/"DELIVERED"; POST accept body {driverId:verifiedDriverId}. PUT /drivers/{driverId} chỉ name,phoneNumber,address,licensePlate,driveStatus. Không gửi accountId/role/email/status quản trị. Response được Zod và owner kiểm tra, lỗi contract502 được xem là kết quả mutation chưa rõ rồi refetch. Success GET/PUT/accept200, create fixtureADMIN201; validation400, role403, owner404, business409, auth401/429. Không bịa422 khi backend không trả.

Backend136JUnit gồm126hồi quy,7DriverMySQL mới và3test hồi quy cancellation mới (2MySQL+1unit). Test detail/active/history/available/privacy/aggregate/bounds/LAZY/query growth và full role matrix. Kết quả browser, hồi quy và SQL cuối xem phase6-test-results.md.

## Race confirm/cancel — đã phê duyệt và sửa khóa đọc (10/11/2026)

SQL hậu kiểm lượt race Restaurant confirm / Customer cancel: Order9840=CANCELLED,Payment=CANCELLED,Delivery=PENDING trong fooddelivery_stage6_e2e. Scenario ownership-and-concurrency trước đây chỉ assert Order/Payment, nên HTTP suite PASS chưa đủ nghiệm thu. Không sửa dữ liệu9840; giữ bằng chứng ngoài Git.

Nguyên nhân đã được test MySQL tái hiện xác định: cancelOrder trong transaction REPEATABLE_READ; sau khóa Order, inverse OneToOne Delivery có thể được đọc từ snapshot trước lúc transaction confirm tạo Delivery. order.getDelivery() trảnull, cancellation bỏ qua Delivery vừa commit. DeliveryService/PaymentService đã có current-read/refresh riêng; cancelOrder trước sửa chưa có.

Người dùng đã phê duyệt sửa OrderService.java/DeliveryRepository.java và test. Thêm DeliveryRepository.findLockedByOrderId (PESSIMISTIC_WRITE), trong cancelOrder sau khóa Order detach Delivery cache nếu có, nạp lại Delivery dưới khóa theo order_id rồi gắn lại quan hệ và kiểm trạng thái cũ trước khi hủy. Đây là cách làm mới dữ liệu thay cho EntityManager.refresh: refresh trong trường hợp newly committed row ngoài snapshot đã gây EntityNotFoundException ở lượt kiểm thử trung gian. Giữ thứ tự Order→Delivery; không đổi isolation toàn cục, enum/transition, quyền, schema/cascade, giá/phí hoặc checkout/COD.

Bổ sung JUnit MySQL tái hiện snapshot RR bằng latch: snapshot Delivery rỗng→confirm commit→cancel; assert database Order/Payment/Delivery cùng CANCELLED. Test thứ hai kiểm Driver accept sau snapshot không bị ghi đè mất FK khi cancel. Unit test kiểm khóa đọc lại khi inverse reference null. E2E confirm/cancel assert Delivery nếu tồn tại phải CANCELLED, không chỉ Order/Payment. Test đầu FAIL trước sửa; bản cuối136/136JUnit PASS. Các lượt cũ và bằng chứng lỗi được lưu riêng.

Ba dòng QA trước sửa, gồm Order9840, được giữ nguyên làm bằng chứng theo yêu cầu; không migrate/repair database cũ hoặc production. Audit sau E2E so toàn bộ tập bất nhất với ảnh chụp trước sửa, yêu cầu không có dòng lỗi mới. Kết quả E2E/SQL nghiệm thu cuối xem phase6-test-results.md; không coi các dòng bằng chứng cũ là dữ liệu đã được sửa.
