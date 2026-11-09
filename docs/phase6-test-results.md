# Kiểm thử Giai đoạn 6 — 10/11/2026

Lượt nghiệm thu cuối: **136/136 backend JUnit, 256/256 frontend và 50/50 Playwright PASS**. FAIL=0, ERROR=0, SKIPPED=0; Playwright retries=0 và flaky=0. Typecheck, ESLint, Prettier và production build PASS. Các lượt thất bại trong quá trình phát triển được giữ riêng, không cộng vào số PASS cuối.

## Môi trường và cách ly

JDK25.0.4 của IntelliJ, Maven3.9.16 cache offline, Node24.20.0/npm11.19.0, MySQL8.0.46 binary hiện có. Chỉ thay JAVA_HOME trong tiến trình kiểm thử. Instance MySQL --no-defaults ở 127.0.0.1:3307, datadir riêng food-delivery-mysql-test/data. Database mới fooddelivery_stage6_e2e lấy snapshot nhất quán chỉ đọc từ Stage5, --hex-blob giữ UUID và FK. Schema không sửa:16bảng/21FK/13UNIQUE/6CHECK. App chỉ có DML trên Stage6; migrator riêng chỉ Stage6 dùng cho các regression migration âm. Hibernate validate, OSIV=false; backend127.0.0.1:18080 và production previewlocalhost:4173.

Không ghi3306/fooddelivery hoặc đổi MySQL80. Checksum tất cả bảng trong Stage1(13), Stage2 rehearsal(16), Stage4(16), Stage5(16) trước/sau giống nhau. Không sửa88hash fixture Stage1. Bằng chứng bảo toàn database chính dựa trên target/datadir/grants và các thao tác được kiểm soát; không tuyên bố có checksum production chưa đo.

## Backend136 và frontend256

Backend gồm126test hồi quy,7DriverMySQL mới và3test cancellation mới (2MySQL+1unit). Tất cả integration test cần MySQL đã chạy, không tính SKIPPED là PASS. Bao phủ role/owner, projection pool, phân trang/filter/search literal/enum/input bounds, aggregate toàn tập, OSIV=false/LAZY, tăng trưởng số query có giới hạn, schema/UNIQUE/FK/CHECK/rollback/cascade, checkout/payment/concurrency và auth. Inventory69endpoint=59business+10auth; ma trận6actor=414tổ hợp, denied request phải không sửa dữ liệu.

Frontend gồm224test cũ+32test mới: model/schema, owner và nested Order/Delivery consistency, ID/role, profile validation (name100 hợp lệ,101 bị chặn), trạng thái/action gating, timeline thật, dashboard/list/history/detail/analytics, loading/error, form/unsaved warning, double-submit và recovery/cache. Không chỉ test snapshot, không tắt filters hoặc dùng mock runtime để chứng minh nghiệp vụ.

## Lỗi confirm/cancel được tái hiện và sửa có phê duyệt

SQL cuối phát hiện Order9840=CANCELLED, Payment=CANCELLED nhưng Delivery=PENDING dù suite HTTP trước đó PASS. Assertion Restaurant race cũ chỉ kiểm Order/Payment. MySQL REPEATABLE_READ có thể giữ inverse OneToOne Delivery=null từ snapshot trước confirm; khóa Order không tự làm mới quan hệ đó.

Sau phê duyệt của người dùng, thêm DeliveryRepository.findLockedByOrderId và sửa cancelOrder: khóa Order, detach Delivery đã cache nếu có, nạp lại Delivery dưới PESSIMISTIC_WRITE theo order_id, gắn quan hệ rồi thực hiện kiểm trạng thái/hủy như cũ. Giữ Order→Delivery, không đổi isolation toàn cục, role/transition/schema/cascade/giá/phí hoặc checkout/COD. DriverService/DeliveryService/PaymentService và auth không sửa.

Test latch đầu tiên cố ý tạo snapshot Delivery rỗng, cho confirm commit rồi cancel: **lượt trước sửa134test có1FAIL** (DeliveryPENDING). Thử EntityManager.refresh trong lượt trung gian135test có1ERROR EntityNotFoundException với row vừa commit ngoài read view; thay bằng detach/nạp lại dưới khóa. Test MySQL thứ hai giữ driver_id vừa được accept sau snapshot để ngăn stale overwrite; unit test kiểm nạp lại khi inverse reference null và thứ tự khóa. **Bản cuối136/136PASS**. E2E Restaurant thêm assertion DeliveryCANCELLED nếu Delivery tồn tại, không làm yếu test.

Ba dòng QA bất nhất trước sửa, gồm9840, được giữ nguyên theo yêu cầu. pre-fix-cancel-inconsistencies.json và known-pre-fix-evidence-preserved.json chứng minh chúng không bị sửa và **không xuất hiện dòng cancelled-Delivery bất nhất mới** sau các lượt nghiệm thu. Không repair database cũ hoặc production. Nếu cần sửa dữ liệu lịch sử, phải có phân tích và phê duyệt riêng.

## Playwright50:16Driver và34hồi quy

Hai batch mới đều dùng artifact backend136 và cùng frontend build: driver-e2e-postfix.json(16) và regression-e2e-postfix.json(34). Khởi động lại đúng backend test giữa batch để reset limiter10/email,100/IP/15phút; không tắt hoặc nâng limiter. PASSWORD_CUSTOMER được đăng ký mới bằng API trước mỗi lượt regression password, không reset account cũ.

16scenario Driver bao phủ28mục E2E yêu cầu, nhóm theo luồng thực:

- Hồ sơ thật, validation/save, driveStatus=false chặn nhận mới nhưng vẫn xử lý chuyến đã nhận; dashboard/own active/history/analytics và chi tiết.
- Full browser flow: Customer login→chọn món→cart→checkout COD; Restaurant confirm→preparing→ready; Driver tự nhận theo API có sẵn→pickup→delivering→delivered; Customer/Restaurant thấy trạng thái mới và CODSUCCESS. Customer đánh giá rồi chọn đúng Restaurant để xem lại MyRatings.
- DriverA không GET/PUT chuyếnB, không nhận owner từ URL/body/query hoặc đổi Order/Payment tùy ý. Customer/Restaurant/Admin không vào management DRIVER. Wrong-role route, reload/refresh, logout/switchB không lộ dữ liệuA; không token/password trong browser storage.
- Hai Driver cùng accept: một200/một409, driver_id winner khớp MySQL. Duplicate pickup: một200/một409, OrderREADY/PaymentPENDING. Accept/cancel nhất quán; not-ready/skip/terminal409, unknown enum400, unassigned/other-owner404.
- Hai tab: stale pickup409 rồi refetch trạng thái thật, không bỏ qua bước.
- Mất response sau DELIVERED commit: đúng mộtPUT; refetch xác minh DELIVERED/COMPLETED/SUCCESS. Mất response accept và GET cùng lỗi: đúng mộtPOST, khóa nhận lại tới khi GET own detail thành công. Fault injection chuyển request thật tới backend rồi cắt response, không giả nghiệp vụ.
- Mạng lỗi ở list hiển thị recovery, không tạo chuyến giả. Bốn responsive scenario375/768/1024/1440 kiểm cả7trang và dialog.

34regression chạy lại Authentication/refresh/logout/logout-all/password/role, Customer discovery/cart/checkout/history/cancel/rating/profile/lost-response, Restaurant menu/profile/order/CAS/review/analytics, public UI và responsive. Hai assertion Driver placeholder cũ đổi sang heading chức năng thật; các kiểm tra quyền và flow cũ giữ nguyên. Restaurant confirm/cancel kiểm thêm Delivery.

Chưa có API unassign/reassign/FAILED/RETURNED; không giả mutation đó để tính PASS. Owner/unassigned negative test vẫn thực hiện. Không giới hạn số test bằng cách tạo test rỗng.

## SQL thực tế sau E2E

Đối chiếu trực tiếp 27Order QA: subtotal=SUM(OrderDetails), total=subtotal+shipping, Payment.amount khớp và đúng một Payment/Order. COMPLETED có DeliveryDELIVERED/PaymentSUCCESS/driver/timestamps; CANCELLED có PaymentCANCELLED và DeliveryNONE hoặcCANCELLED. Pickup có driver/timestamp thật. Winner accept race đúng FK. Rating full Driver flow còn tồn tại5sao, customer/restaurant khớp OrderCOMPLETED; rating regression CRUD đã xóa đúng mong đợi. Rating không có order FK, không tuyên bố liên kết schema không tồn tại.

API Driver#3923 trong[2026-10-12,2026-11-10] khớp SQL toàn tập: assigned=43, active=27, completed=10, pickup=25; states, day groups và average pickup→delivered đều khớp. Không suy thu nhập hoặc ETA từ COD.

## Responsive, build và các lỗi UI đã sửa

375/768/1024/1440 không tràn ngang; navigation4mục và dialog/focus hoạt động. Fixture375 là Driver thật có tên100ký tự liền nhau tạo qua ADMIN API. Lỗi tên dài gây overflow đã sửa bằng min-width/ellipsis/wrap scoped Driver; giữ fixture biên. Lỗi Save bị bottomnav che ở375/768 sửa bằng sticky action phía trên nav, giữ assertion vị trí. Đã xem ảnh dashboard1440 và profile375 của lượt postfix.

196ảnh nghiệm thu=32Driver+164hồi quy, lưu driver-postfix-screenshots và regression-postfix-screenshots. EntryJS=466555byte, không chunkJS>500000byte. Không thêm thư viện map/chart, thay dependency hoặc nâng ngưỡng cảnh báo. Route lazy loading, page tối đa50, polling visible và dừng detail terminal.

Console guard50scenario:0pageerror và0unexpected. Lỗi auth/owner/network dự kiến chỉ phân loại theo endpoint và scenario cụ thể; không silence chung. Các page Customer/Restaurant phụ của full flow cũng kiểm pageerror.

Các lỗi harness đã sửa đúng hành vi: route placeholder dùng deliveryId cho inventory; skeleton query dùng loading role; date input không gọi type chuỗi rỗng; full MyRatings phải chọn nhà hàng; audit rating CRUD phải mong đợi đã xóa. Không sửa dữ liệu để vượt rule. Lượt Driver đầu15PASS/1FAIL và trước sửa Save14PASS/2FAIL được lưu riêng. Một focused run gặp429 và1test không chạy, không tính PASS; batch cuối không còn SKIPPED.

## Bảo toàn mã nguồn, evidence và teardown

Hash baseline xác minh các source backend cũ chỉ đổi9file đã liệt kê: Security matchers, preflight whitelist,2helper inventory/target, OrderService/DeliveryRepository và3file test liên quan. POM, entity/DTO nghiệp vụ cũ, Driver/Delivery/Payment writers và auth source giữ nguyên. Frontend source cũ chỉ router/Workspace và tách nguyên UnsavedChanges để Restaurant reexport dùng lại; dependencies/package-lock không đổi.

Evidence ngoài Git: F:/New folder/food-delivery-mysql-test/phase6-20261109/logs. Run giữ tên ngày09 theo lúc bắt đầu, hoàn tất ngày10. Bao gồm acceptance-summary, backend-junit-summary, frontend-unit, *-e2e-postfix JSON/log, browser-*-postfix, ảnh, mysql-delivery-proof, mysql-driver-analytics-proof, existing-databases-proof, baseline/artifact hashes, pre-fix evidence, secret-scan và shutdown-proof. Credentials/keys/config nằm riêng ngoài Git, không ghi mật khẩu vào báo cáo. Secret scan source/dist/docs/log kiểm known secrets/PEM/JWT, không thay cho pentest.

Backend, preview và MySQL test đã dừng sau xác minh đúng tiến trình/instance. Cổng3307/18080/4173 đóng; MySQL80 vẫn Running. Vite khác trên5173 (PID37636 tại lúc kiểm tra) không có trong PID manifest của phiên test, không dùng cho nghiệm thu, nên được giữ nguyên để tránh dừng nhầm công việc khác. Kiểm tra dọn dẹp đầu tiên đã báo5173còn mở; shutdown-first-observation.json giữ nguyên kết quả đó, shutdown-proof.json phân biệt rõ cổng thuộc phiên test với tiến trình chưa xác minh sở hữu. Datadir và log giữ lại. Không commit/push/deploy, không thay untracked file người dùng “h github main”.

## Giới hạn nghiệm thu

Chưa kiểm Firefox/WebKit, thiết bị vật lý/keyboard mobile, tải lớn/chaos, HTTPS production hoặc pentest độc lập. Backend chưa có GPS/ETA/background location/map, failed/reassign/refuse hoặc mô hình tiền công/commission/wallet; không dựng UI/số liệu giả. Không có assignedAt để thống kê phân công theo ngày. Không có API/migration bắt buộc đang chờ duyệt. Không có lỗi code hoặc test thất bại còn mở trong phạm vi đã phê duyệt;3row QA trước sửa vẫn được đánh dấu bằng chứng, chưa repair. Chưa triển khai Giai đoạn7.
