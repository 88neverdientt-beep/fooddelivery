# A2.1 — Hoàn thiện tạo nhà hàng và xuất Excel

**Kết luận: PASS trong phạm vi A2.1 đã kiểm chứng.** Không phải kết luận production readiness. Đã dừng sau A2.1, chưa triển khai A2.2, ERD/Data Diagram/3NF hoặc báo cáo BTL mới.

Môi trường thực tế ngày 12/11/2026 (Asia/Saigon): JDK 25.0.4 từ IntelliJ, Maven 3.9.16 từ cache, Node 24.20.0, MySQL 8.0.46 độc lập tại 127.0.0.1:3307, database mới `fooddelivery_coursework_a21`. Backend 127.0.0.1:18080, management 19090, HTTPS gateway localhost 18443. Schema-only16bảng được tạo trong DB mới sau phê duyệt, không sao chép dữ liệu Stage 1–8.2. Sau bootstrap luôn Hibernate `ddl-auto=validate`, OSIV=false. App user riêng chỉ SELECT/INSERT/UPDATE/DELETE trên DB mới; credential và RSA/TLS test key ở thư mục thử nghiệm riêng, không trong Git/báo cáo.

## 1. File tạo/sửa

17 file source/test, không thay dependency, pom, Entity, schema đang có hoặc cấu hình development/production. File bàn giao này là file thứ 18 của A2.1 trong repository.

- `frontend/src/features/admin-management/CreatePages.tsx`
- `frontend/src/features/admin-management/ListPages.tsx`
- `frontend/src/features/admin-management/RestaurantExport.tsx`
- `frontend/src/features/admin-management/api.ts`
- `frontend/src/features/admin-management/model.ts`
- `frontend/src/features/admin-management/restaurant-export.test.ts`
- `frontend/src/lib/api/http.test.ts`
- `frontend/src/lib/api/http.ts`
- `src/main/java/vn/gaugaugau/fooddelivery/config/SecurityConfiguration.java`
- `src/main/java/vn/gaugaugau/fooddelivery/controller/RestaurantExcelController.java`
- `src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantRequestDTO.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantExcelExportService.java`
- `src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbook.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/ApprovedMySqlTestTarget.java`
- `src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantCreationMySqlTest.java`
- `src/test/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbookTest.java`

Mười file tracked được sửa và bảy file source/test mới; danh sách trên gồm cả file chưa được Git theo dõi. Mười tài liệu A1, bảy báo cáo8.2 và file untracked có sẵn được giữ nguyên. Tool/harness, log, ảnh, workbook mẫu và private config của lượt test ở thư mục ngoài repository:

`F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/`

## 2. Thiếu sót xác minh trước sửa và cách khắc phục

Đối chiếu A1 cùng CreatePages, model/api, ListPages, ProfilePages, Controller/DTO/AuthService/Repository/Restaurant/Account và DDL snapshot: form đã tồn tại, transaction hai bản ghi và chức năng đọc lại đều có. Không tạo form mới, không viết lại AuthService, không thêm quận/phường.

Thiếu thật sự: phone chỉ kiểm không rỗng/độ dài, chưa loại chữ/ký tự không hợp lệ; một số lỗi Zod max dùng thông báo mặc định; chưa có xuất XLSX; transport chỉ đọc JSON. Đã thêm schema riêng cho RESTAURANT và @Pattern ở RestaurantRequestDTO, giữ Driver/schema profile cũ; thêm nhánh blob tùy chọn vào transport, giữ đường JSON mặc định; bổ sung endpoint/admin button và workbook streaming. Nhãn/lỗi frontend mới bằng tiếng Việt.

### Đối chiếu trường nhập → MySQL

| Trường nhập | React hiện có | DTO | Validation thực tế | Entity | Cột MySQL | Trạng thái |
|---|---|---|---|---|---|---|
| Tên nhà hàng | AdminCreateProfile/name | RestaurantRequestDTO.name | FE trim,bắt buộc,≤150; BE NotBlank/Size150 | Restaurant.name | restaurants.name VARCHAR150 NOT NULL | Đã kiểm valid/thiếu/đọc lại |
| Email đăng nhập | email | email | FE ASCII policy,bắt buộc,≤255; BE Email/NotBlank/Size, EmailAddress normalize; UNIQUE cuối tạiDB | Account.email; Restaurant.email | accounts.email và restaurants.email VARCHAR255 NOT NULL UNIQUE | Đã kiểm sai/trùng/chuẩn hóa/đồng thời |
| Số điện thoại | phoneNumber | phoneNumber | Riêng tạo Restaurant: bắt buộc,≤15 ký tự, chỉ chữ số với dấu+ tùy chọn ở đầu; FE regex+BE Pattern | Restaurant.phoneNumber | restaurants.phone_number VARCHAR15 NOT NULL | Đã kiểm chữ/++/thiếu và lưu đúng số 0 đầu |
| Địa chỉ | address | address | FE trim,bắt buộc,≤255; BE NotBlank/Size255 | Restaurant.address | restaurants.address VARCHAR255 NOT NULL | Đã kiểm thiếu/quá dài/Vietnamese |
| Hoạt động | activity true/false | restaurantStatus Boolean | FE enum; API ánh xạ boolean; BE mặc địnhtrue nếu không truyền, giữ hợp đồng cũ | Restaurant.restaurantStatus | restaurants.restaurant_status BIT(1),nullable | Đã kiểm Mở/Đóng và bộ lọc |
| Mật khẩu | password,PasswordInput | password | Không trim byte; ≥12 code points,≤72 UTF-8bytes ởFE/AuthService; BCryptcost12 | Account.passwordHash; Restaurant.password legacy | accounts.password_hash; restaurants.password (chỉ hash) | Đã kiểm thiếu/ngắn/UTF-8 quá dài; không xuất/hiển thị response |
| Xác nhận mật khẩu | confirmPassword | Không gửi | FE refine phải bằngpassword | Không có | Không có | Đã kiểm; không thêm cột/không gửi roleclient |

Chính sách phone không suy đoán địa phương: không ép10số Việt Nam hoặc thêm định dạng quận/phường. Không xác minh số điện thoại tồn tại/OTP. BCrypt legacy của profile được giữ nguyên theo kiến trúc hiện tại, không xóa cột cũ.

## 3. Quy trình hiện tại đã kiểm chứng

ADMIN từ principal → `/admin/restaurants/new` → validation → dialog xác nhận → một POST `/restaurants` → AuthService.createRestaurant trong transaction READ_COMMITTED → lưu Restaurant rồi Account role RESTAURANT, Account.restaurant_id liên kết profile, email normalize và hash BCrypt → flush/commit → HTTP 201 có ID thật → invalidate cache ADMIN → mở detail bằng GET theoID → danh sách đã mở trước đó được làm mới.

Không tạo số liệu thành công bằng dữ liệu giả. Chromium đã thấy ID thực, tên/email/phone/address/status từ backend, rồi mở danh sách và tải workbook. Fixture synthetic mới chỉ dùng trong DBtest đã được duyệt; chức năng xuất không sinh dòng minh họa hoặc làm đẹp dữ liệu.

Khi mất phản hồi sau commit: form xóa hai ô mật khẩu, khóa gửi lại, tra tài khoản theo email/role để đối chiếu rồi mở detail. Không tự retry POST. Kiểm thử browser mô phỏng server 201 rồi abort response; chỉ một POST cho thao tác đó, query tìm được Account/profile và GET detail hiển thị dữ liệu đã lưu. Khi mất phản hồi, không tìm được Account trong một trang kết quả không được coi là “chưa lưu” để tự gửi lại.

Hai yêu cầu độc lập cùng email: đúng một 201 và một 409; đúng một Account/một Restaurant. UNIQUE toàn hệ thống và transaction là lớp bảo vệ server, không gọi khóa button là idempotency bền vững. Kiểm thử transaction ném lỗi sau saveAndFlush trong transaction thật: số Account/Restaurant trở về trước, không còn email thử rollback. Không thay transaction/logic đặt hàng/giao hàng/tính tiền.

## 4. API, quyền và bảng liên quan

| API | Mục đích | Quyền / dữ liệu |
|---|---|---|
| POST /restaurants | Tạo Account+profile | ADMIN; role do server gán; ghi restaurants/accounts |
| GET /admin-management/restaurants/{id} | Đọc detail đã lưu | ADMIN; query restaurants LEFTJOINaccounts; response khônghash |
| GET /admin-management/restaurants | Danh sách/filter/page | ADMIN; tái dùng API cũ; cache invalidate sau tạo |
| GET /admin-management/restaurants/export.xlsx | Xuất kết quả theo bộ lọc | ADMIN ở filterchain,controller,service; SELECT projection9 cột |

Export không mở endpoint public, không dùng GET public `/restaurants` để xuất dữ liệu quản trị. HTTP thật: anonymous401; Customer403; Restaurant403; method-security test bao gồmDriver. Unknown query, page/size truyền trực tiếp vào export và sort tùy ý bị từ chối400. Params SQL bind, sort allowlist, không ghép inputclient thành SQL.

Schema newtest có16 PK/21 FK/13 UNIQUE/6 CHECK, cùng thiết kế schema snapshot, không migration business. Restaurant↔Account không thiếu/saiemail qua hậu kiểm cuối; so sánh email dùng BINARY để đối chiếu hai collation khác nhau chính xác.

## 5. Xuất Excel

Nút **Xuất Excel** tại `/admin/restaurants`; filename chính xác `DanhSachNhaHang.xlsx`.

Phạm vi: **toàn bộ kết quả theo bộ lọc đang áp dụng** `q,accountStatus,activity,sort`, không chỉ trang hiện tại. q vẫn tìm mã/tên/địa chỉ đúng logic danh sách. Frontend bỏpage/size khi gọi export; backend chủ động từ chối page/size, không âm thầm cắt trang. Thay bộ lọc hoặc rời trang hủy yêu cầu cũ; kiểm lại account/generation trước download. Tiếp tục dùng session transport với Bearer/refresh, không tokenURL/localStorage hoặc fetch bypass auth.

9 cột: Mã nhà hàng; Tên nhà hàng; Email đăng nhập; Số điện thoại; Địa chỉ; Hoạt động; Ngày tạo; Mã tài khoản; Trạng thái tài khoản. Lấy từ cột có thật trong Restaurant/Account và DTO quản trị. Không password,password_hash,session,token,privatekey hoặc transactioncode. Ngày theo LocalDateTime nghiệp vụ, `dd/MM/yyyy HH:mm:ss`; trạng thái bằng tiếng Việt, phân biệt hoạt động nhà hàng và trạng thái tài khoản, nullable có nhãn rõ.

Không thêm dependency: dùng JavaZipOutputStream tạo package XLSX/OOXML với metadata/relationships/styles cần thiết. JdbcTemplate forward-only + Connector/J fetchSize=Integer.MIN_VALUE đọc từng row; không List toàn tập, không bảng sharedStrings gom mọi ô. Qua giới hạn1.048.575 dòng dữ liệu/sheet tự tách sheet và lặp header; unit test seam kiểm việc tách không mất dòng.

Header đậm, rộng cột, wrap, freeze dòng đầu, autofilter. Workbook rỗng vẫn có9 header. Tất cả ô kiểu inlineStr và định dạngtext: giữ số 0 đầu, ID lớn và dữ liệu bắt đầu=,+,-,@ nguyên văn nhưng không thành formula/hyperlink. XML escaping và lọc ký tự XML không hợp lệ. Không chỉ thêm dấu nháy bằng cách làm thay giá trị nghiệp vụ.

Đã kiểm file có23 bản ghi lọc, nhiều hơn 20/trang; đối chiếu đủ23 × 9 ô với SELECT độc lập từ MySQL. Kiểm file rỗng chỉheader, file tải qua UI và tên dữ liệu bắt đầu `=SUM(...)` vẫn literal. Microsoft Excel 12.0 thực tế mở hai workbook códữliệu/rỗng ở ReadOnly, nhận FileFormat 51, Unicode header đúng, rows24/1, columns 9, HasFormula=false, không hyperlink; file hash trước/sau không đổi.

## 6. Kết quả kiểm thử

| Nhóm | PASS | FAIL | ERROR | SKIPPED |
|---|---:|---:|---:|---:|
| JUnit regression được chọn | 105 | 0 | 0 | 0 |
| Frontend Vitest toàn bộ | 321 | 0 | 0 | 0 |
| Chromium luồng UI thực tế | 2 | 0 | 0 | 0 |
| Microsoft Excel mở readonly | 2file | 0 | 0 | 0 |

JUnit 105 gồm85 unit/regression không DB và20 test MySQL:13 AdminManagementMySqlTest + 7 RestaurantCreationMySqlTest. Không gọi đây là chạy lại toàn bộ 178 test8.2. Đủ packageJAR bằng Java25/Maven 3.9.16, typecheck/lint/buildfrontend đạt; không đổidependency. Workbook unit kiểm packageXML, relationships, rỗng, Unicode, formula prefixes, preserveID/phone và chia sheet. Frontend thêm6 test kiểm validation/Driverunchanged, role/session/exportfilters, binary MIME và không đọc JSONnhầm.

Các ca bắt buộc đã có: nhập đúng; thiếu các trường bắt buộc; email sai/trùng; điện thoại sai; password ngắn/quá72byte; confirm khôngtrùng; không ADMIN; gửi hai lần; network sau commit; đọc lại ID/list; rollback; xuất có data/rỗng; tiếngViệt; không secret; khớpMySQL. Nguồn hiện có cho doubleclick/unknownresult và cache-list đã được chạy lại trong321 test; browser kiểm mất phản hồi thật, JUnit vàHTTP kiểm race server.

### Lỗi trong quá trình kiểm thử và việc sửa

- Hai lỗi trích script/quote/encoding khi chuẩn bị code/tool đã sửa trước build cuối; không thay schema hoặc nới assertion.
- Maven sandbox không đọc được một JAR cache: chạy lại bằng runtime ngoài sandbox sau phê duyệt, không cài/nângdependency.
- Lượt105 test đầu có14 ERROR:13 do fixture COD thiếu vì DB mới schema-only;1 do phép soemail của test chưa chỉ rõ collation. Thêm COD mẫu chỉ DB mới, sửa phép đối chiếu BINARY; chạy lại đủ 105, không bỏ test. Log lỗi lưu `before-cod-fixture-*`.
- Lint bắt setState đồng bộ trong effect của exportbutton; sửa lifecycle dùng remount theo filterkey và cleanupAbort, không tắt lint. Chạy lại lint/build/Vitest.
- HTTP harness đã hoàn tất assertions, downloads và race nhưng readonly postcheck lỗi đường dẫn Windows của mysql.exe. Sửa path, chỉ tiếp tục SELECT/so sánh file đã tải, không replay mutation/không tạo lại22 fixture. `http-workbook-proof.json` ghi rõ giới hạn provenance; không báo script gốc làexit0.
- PowerShell policy chặn nativeExcel lầnđầu; người dùng duyệt Bypass chỉ một tiến trình. Đã chạy thành công đúng kiểmreadonly; không đổi ExecutionPolicy toànmáy.
- Sandbox CIM từ chối xác minh PID khi cleanup; đã xác minh commandline bằng quyền được duyệt rồi dừng đúng process. Không dừngPID chưa được kiểm tra.

## 7. Chưa kiểm chứng / giới hạn

Chưa chạy lại mọi178JUnit lịch sử, ma trậnE2E đa trình duyệt, tải lớn hoặc production. Không tuyên bố các blocker 8.2 đã đóng. Không loadtest hàng triệu nhà hàng; source có streaming, unit kiểm boundary táchsheet qua seam thay vì tạo triệurow. Không sửa các giới hạn legacy/profilepassword hoặc xác minh số điện thoại tồn tại.

## 8. Ảnh và bằng chứng

- [Ảnh detail nhà hàng sau GET backend](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/restaurant-created.png>).
- [Ảnh danh sách và nút Xuất Excel](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/restaurant-list-export.png>).
- [Hai kịch bản browser thật](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/browser-proof.json>).
- [105JUnit](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/junit-summary.json>).
- [321Vitest](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/frontend-unit.json>).
- [Đối chiếu workbook từng ô với MySQL](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/http-workbook-proof.json>).
- [Microsoft Excel native](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/excel-native-proof.json>).
- [Bảo toàn database cũ](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/preservation-proof.json>).
- [Bảo toàn source ngoài phạm vi](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/repository-preservation.json>).
- [Dừng tiến trình test](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/shutdown-proof.json>).
- [Quét giá trịcredential đã biết](<F:/New folder/food-delivery-mysql-test/coursework-a21-20261112/logs/secret-scan.json>).

Không thu auth trace/video chứa request body/token/password. Ảnh chụp sau khi rời form mật khẩu, đã xem lại. Đây là môi trường synthetic được duyệt, không dữ liệu khách/nhà hàng production.

## 9. Rủi ro còn lại

- Frontend nhậnBlob để tải file nên có bộ nhớ tương ứng kích thước file ởbrowser; backend không gom toàn bộdataset. Chưa bổ sung FileSystemAccessAPI hoặc background export.
- Với streaming, lỗi DB/network sau khi gửi header có thể làm file tải không hoàn chỉnh; cần tải lại, không coi thông báo download là xác nhận toàn bộ Excel đã mở. Không hứa exporttransaction giữa nhiềurequest; một export dùng mộtSELECT trong read-onlytransaction.
- Ngày được xuất là text theo giờ nghiệp vụ, rõ để đọc; không hứa là cellserialDate dùng tính toán Excel. ID/phone làtext có chủ ý.
- Tính duy nhất dựa trên email chuẩn hóa, không idempotency key tổng quát. Tạo lại cùngemail bị409; không tái thực hiện thao tác khi kếtquả chưa rõ.
- Kiểmphone mới chỉ áp dụng tạo Restaurant; không âm thầm đổi hợp đồngDriver/Customer hoặc cậpnhậtprofile. Không có ruleVN 10 số/OTP trong schema hiệntại.

## 10. Kết luận và an toàn

PASS cho luồng ADMIN→form→MySQL→đọcID/list→XLSX đã được kiểm trên môi trường được phê duyệt, gồm HTTP, UI và MicrosoftExcel. Không đánh đồng với production hoặc hoàn thành toàn bộ bài tập lớn.

Đối chiếu cuối: **14 schema/221 bảng cũ giữ nguyên CHECKSUM và DDL**; chỉ schema mới có fixture bổ sung. MySQL 80 vẫn Running, không kết nối/ghi3306 hoặc điều khiểnservice. Backend/gateway/MySQLtest đã dừng; cổng3307/18080/19090/18443 đóng IPv4/IPv6. Giữ lại toàn bộ dữ liệu/log/filetest để đối chiếu. Branch main/HEAD 0315de8 giữ nguyên, không commit/push/pull/reset/merge/deploy. Chưa bắt đầu A2.2.

## Source anchors

- [frontend/src/features/admin-management/CreatePages.tsx:22](<F:/New folder/food-delivery/frontend/src/features/admin-management/CreatePages.tsx:22>).

- [frontend/src/features/admin-management/model.ts:252](<F:/New folder/food-delivery/frontend/src/features/admin-management/model.ts:252>).

- [frontend/src/features/admin-management/api.ts:90](<F:/New folder/food-delivery/frontend/src/features/admin-management/api.ts:90>).

- [frontend/src/features/admin-management/ListPages.tsx:272](<F:/New folder/food-delivery/frontend/src/features/admin-management/ListPages.tsx:272>).

- [frontend/src/features/admin-management/ProfilePages.tsx:220](<F:/New folder/food-delivery/frontend/src/features/admin-management/ProfilePages.tsx:220>).

- [frontend/src/lib/api/http.ts:76](<F:/New folder/food-delivery/frontend/src/lib/api/http.ts:76>).

- [src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantRequestDTO.java:34](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/model/dto/RestaurantRequestDTO.java:34>).

- [src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/auth/service/AuthService.java:59>).

- [src/main/java/vn/gaugaugau/fooddelivery/controller/RestaurantExcelController.java:16](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/controller/RestaurantExcelController.java:16>).

- [src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:72](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/AdminManagementService.java:72>).

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantExcelExportService.java:22](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantExcelExportService.java:22>).

- [src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbook.java:27](<F:/New folder/food-delivery/src/main/java/vn/gaugaugau/fooddelivery/service/RestaurantWorkbook.java:27>).

- [src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantCreationMySqlTest.java:41](<F:/New folder/food-delivery/src/test/java/vn/gaugaugau/fooddelivery/auth/RestaurantCreationMySqlTest.java:41>).
