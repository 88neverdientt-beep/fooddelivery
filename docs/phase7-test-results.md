# Giai đoạn 7 — Kết quả kiểm thử thực tế

Nghiệm thu ngày 10/11/2026. Backend JDK25.0.4/Maven3.9.16/MySQL8.0.46. Chỉ `fooddelivery_stage7_e2e` tại127.0.0.1:3307, backend18080, previewlocalhost4173. Runtime Hibernate `validate`, OSIV=false, business JVM Asia/Ho_Chi_Minh; auth ClockUTC giữ nguyên. Schema-only với dữ liệu QA mới, không copy business rows Stage6.

## Kết quả cuối

- Backend JUnit: **149 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED**. Gồm136 test hồi quy và13 test Admin MySQL mới. Evidence: logs/backend-junit-summary.json, backend-all-tests.log, snapshot post-junit-before-e2e.sql ngoài Git.
- Frontend Vitest: **295 PASS, 0 FAIL, 0 SKIPPED**, gồm256 cũ và39 mới. Evidence: logs/frontend-unit.json, frontend-unit.log.
- Playwright: **70 PASS, 0 FAIL, 0 SKIPPED, 0 flaky**: Admin20 + Driver16 + hồi quy Auth/Customer/Restaurant/responsive/UI34. Không retry. Evidence: logs/admin-e2e-acceptance.json, driver-e2e-acceptance.json, regression-e2e-acceptance.json.
- Typecheck, ESLint max-warnings0, Prettier, production build: PASS. Entry JS 471,612byte; không chunk JS nào vượt500000byte; routes lazy. Không dependency mới.
- Console diagnostics:70scenario,0pageerror/0unexpected. Lỗi network/auth/conflict cố ý được phân loại theo đúng endpoint và scenario, không tắt cảnh báo chung.
- Responsive:375/768/1024/1440px. 284ảnh: Admin88, Driver32, hồi quy164. Admin20màn +2dialog trên4width, table scroll riêng, drawer/focus/Escape,375px action header đủ rộng. Đã xem trực tiếp ảnh mobile và desktop cuối.

## Kiểm chứng MySQL, bảo mật và đồng thời

13 test Admin kiểm HTTP+service authorization, literal search/SQL injection/sort whitelist, database pagination/count và page sau, validation bounds/enums/dates/unknown fields, DTO secrets/OSIV=false, real KPI/date boundaries/microseconds/no double-count, null denominator, loại pending/refunded/cancelled/sai amount, session revoke, self-disable/last-active, rollback và races.

Inventory81endpoint ×6actor=486tổ hợp, giữ69ACL cũ. JWT RS256/refresh/session/CSRF/limiter không thay. Admin chỉ đọc Order/Delivery/Payment lifecycle; body role/ID/status giả không cấp quyền. Review plaintext không thực thi HTML. Cache/mutation bound actor/generation, logout/switch không gửi writer từ form cũ.

Hai ADMIN đã qua xác thực trước khóa cùng disable nhau: đúng một commit200, bên đã bị revoke trả401 sau chờ; không cả hai DISABLED. Hai request cùng expectedStatus:200/409; stale2tab409. Rollback phục hồi Account status và revocation. Lost response sau commit: đúng1PUT, GET đúng account để xác minh; GET cũng lỗi thì UI giữ khóa/manual recovery, không PUT lại. expectedStatus không phát hiện ABA.

Driver hồi quy kiểm hai tài xế tự nhận một chuyến, hai pickup trùng, accept/cancel, trạng thái không hợp lệ, quyền sở hữu,2tab và lost-response accept/Delivered/COD. Restaurant hồi quy kiểm pricing conflict/checkout, confirm/cancel và lifecycle; Customer kiểm cart/order/rating/auth. Business writers Order/Delivery/Payment giữ nguyên hash baseline, gồm bản sửa khóa đọc cancel ở Giai đoạn6.

SQL hậu kiểm đã duyệt **89đơn hiện có**: SUM(OrderDetail)=subtotal, subtotal+shipping=total=Payment.amount, đúng1Payment/Order; COMPLETED cần SUCCESS+DELIVERED+driver/timestamps; CANCELLED không để Delivery còn active; không xuất hiện inverse cancel mới. Có 37đơn được tham chiếu trực tiếp bởi E2E; rating đối chiếu customer/restaurant với đơn COMPLETED (không bịa FK Order cho Rating). Hai hồ sơ mới từ UI có Account/profile đúng role, BCryptcost12, ID liên kết và không plaintext. Status targets đã DISABLED không còn session active. Evidence: logs/mysql-business-proof.json.

Schema giữ16bảng/21FK/13UNIQUE/6CHECK; không migration Giai đoạn7. Checksum77bảng trong5database thử nghiệm cũ giữ nguyên. Ba QA Stage6 số8932/9840/10120 giữ đúng nguyên trạng, không sửa/copy/blacklist trong API. Không kết nối ghi3306/fooddelivery. MySQL80 được quan sát Running và không điều khiển dịch vụ.

## Đối chiếu reporting độc lập

API và raw SQL rows được tính lại bằng Decimal, không sao chép nguyên aggregate SQL của service. Kỳ 2026-10-12→2026-11-10, timezone Asia/Ho_Chi_Minh; mọi KPI/count/state/day group/payment method/top Restaurant/top Driver khớp. Toàn tập89đơn; trong kỳ89đơn; 36thanh toán thành công ghi nhận, tổng1598000.0, tiền món1058000.0, giao hàng540000.0. Chuyến terminal44, DELIVERED36, tỷ lệ81.8182%. Không gọi tổng này là lợi nhuận/tiền thực nhận. Evidence: logs/mysql-admin-reporting-proof.json; scripts verify-reporting.py và verify-final.py ngoài Git.

## Lỗi trung gian và cách xử lý

- Lượt136test đầu thiếu6fixture migration hợp lệ mà test cũ yêu cầu: tạo mới fixture synthetic tương thích, không sửa assertion/hash cũ. Lượt147test có1lỗi harness double URL-encode query: dùng URI đúng, giữ kiểm tra literal. Sau bổ sung last-active/page sau,149/149PASS.
- Frontend phát hiện task preflight có thể tiếp tục PUT sau logout, điều hướng sau create phản hồi nhanh vướng unsaved guard, nhãn Account trùng và header375px quá hẹp: sửa tại feature/layout liên quan, bổ sung assertions;295/295PASS,20/20Admin E2E trên build cuối. Hai assertion unit money ban đầu dùng text không phân biệt headline/chart được scope theo region.
- Admin E2E đầu17/19PASS: email search substring hợp lệ khiến selector nhiều row; sửa chọn exact email. Nhà hàng đóng đã chặn cả thêm món nên chuẩn bị cart trước khi đóng để kiểm checkout409/giữ cart. Lượt sau20/20PASS; bản build cuối chạy lại20/20PASS.
- Driver lượt đầu15/16PASS vì assertion hardcode địa chỉ Stage6; UI trả đúng địa chỉ Stage7. Thay bằng địa chỉ từ API thật, giữ assertion cả pickup/dropoff, chạy lại đầy đủ16/16PASS. Log/ảnh/error-context lượt đầu được giữ riêng.
- MySQL test đã ngừng trong thời gian chờ; không kill PID tái sử dụng. Xác minh datadir/port/instance riêng, khởi động lại đúng binary --no-defaults, lưu mysql-restart-proof.json. mysqldump config ban đầu có option database không hỗ trợ: sửa config ngoài Git rồi archive thành công trước khi dọn fixture Stage7. Không dọn database khác.
- PowerShell có thể báo NativeCommandError vì warning NO_COLOR/FORCE_COLOR dù Playwright JSON toàn PASS; nghiệm thu căn cứ JSON stats và không che FAIL. Runner Python dùng stdout/stderr log và process exit code trực tiếp.

Log lần đầu được giữ; không tính lỗi chưa giải thích/skipped là PASS. Không tắt test, giảm assertion, sửa lifecycle hoặc fixture lịch sử để đạt PASS.

## Kết thúc và giới hạn

Đã dừng đúng backend18080, preview4173, MySQL test3307 sau xác minh PID/name/start time và port/datadir. Các cổng owned đóng ởIPv4/IPv6, MySQL80 vẫn Running; giữ data/log. Không can thiệp tiến trình5173 không thuộc lượt này; hậu kiểm cổng5173 cũng đã đóng. Evidence: logs/shutdown-proof.json.

Secret scan source/dist/docs/log/test outputs không in giá trị nhạy cảm; kết quả logs/secret-scan.json. Credentials/keys/config/dumps chỉ ở thư mục thử nghiệm ngoài Git. File người dùng h github main được bảo toàn. Không commit/push/deploy.

Chưa có pentest độc lập, load/chaos nhiều instance, Firefox/WebKit/thiết bị thật hoặc nghiệm thu TLS/production. Full-profile PUT chỉ có preflight UI, không CAS atomic; status không phát hiện ABA. Không có GPS, assignment, payout/refund/settlement, role editor, export hoặc audit history backend. Đây là giới hạn công khai, không nút giả/luồng bắt buộc bị BLOCKED. Giai đoạn7 đủ điều kiện bàn giao trong phạm vi đã phê duyệt; chưa tự triển khai Giai đoạn8.
