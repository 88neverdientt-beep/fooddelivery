# Tổng kiểm toán Food Delivery — báo cáo bàn giao

Verdict: **FAIL**. Thời điểm sinh: 2026-11-11T10:15:01.340226+00:00.

## 1. Tổng quan hệ thống

Tái sử dụng Java25/Spring Boot4.1.1/MySQL8, React/TypeScript/Vite, bốn role và luồng COD đã duyệt. Inventory đọc nội dung 359 file text (38.419 dòng), gồm 62 tài liệu cũ; rà soát trọng tâm controller/service/repository/entity/DTO/security và auth/cache/router/checkout. Không coi inventory hoặc kiểm thử hữu hạn là chứng minh không còn mọi lỗi.

## 2. Danh sách lỗi phát hiện

AUTH-01 stale retried GET401 có thể xóa phiên mới; DATE-01 default window Driver có thể lùi xuống năm0; MONEY-01 formatter làm tròn giá DECIMAL(12,2) về số nguyên; FORMAT-01 README frontend không đạt formatter. WK-01 có proof mới về Strict/None trên Windows; WEB-02 là pageerror khi cart request bị hủy, vẫn cần root cause riêng. OPS-01 là thiếu infrastructure verification.

## 3. Phân loại mức độ

Chưa xác nhận CRITICAL mới. HIGH: WK-01 browser/security gate và OPS-01 thiếu production infrastructure validation. MEDIUM: AUTH-01, DATE-01, MONEY-01 đã sửa; WEB-02 và advisory dev/lint còn mở. LOW: FORMAT-01 đã sửa; lỗi chuẩn bị harness được ghi riêng, không thổi thành lỗi sản phẩm.

## 4. Nguyên nhân từng lỗi

AUTH-01 chỉ kiểm generation sau retry thành công, còn catch401 xóa session vô điều kiện. DATE-01 kiểm year của input nhưng chưa kiểm year của start mặc định sau trừ29ngày. MONEY-01 dùng maximumFractionDigits=0 mặc dù backend chấp nhận hai số lẻ. FORMAT-01 là định dạng README. WK-01 dựa đối chiếu header/browser/observer; không tự khẳng định subcomponent upstream khi chưa chứng minh.

## 5. Cách sửa

Thêm guard generation/cancellation trước xử lý401 của retry; thêm guard start.year>=1 trước query Driver; hiển thị tối đa hai số lẻ từ giá trị server, giữ cách hiển thị số nguyên; định dạng README. Không thay cookie/CSRF/JWT, giá/phí hoặc phép tính backend, lifecycle, schema hoặc dependency.

## 6. File đã sửa

Xem full-audit-files.txt: chỉ delta của lượt này so với snapshot nguồn trước audit, không gộp 96 file Giai đoạn8 vốn đã dirty.

## 7. Test bổ sung

Hai regression session, bốn regression formatter tiền, ba regression biên ngày Driver và ba regression guard môi trường; thêm một E2E giá lẻ trên mỗi engine. Test cũ giữ nguyên; guard test chỉ bổ sung tên database cụ thể, vẫn chặn3306/database chính/datadir khác. Không dùng kết quả 160 ca của build trước sửa tiền để nghiệm thu build cuối.

## 8. Kết quả Backend

178 tổng; PASS 178, FAIL 0, ERROR 0, SKIPPED 0. JDK25.0.4/Maven3.9.16, MySQL3307/validate.

## 9. Kết quả Frontend

315/315 PASS; build/typecheck/lint/formatter cuối PASS. Build index khoảng472,28kB/gzip144,71kB; không đổi npm dependencies/lock.

## 10. Kết quả E2E

Ma trận chính 204/210 PASS, 6 FAIL; strict 14/15 PASS, 1 FAIL. Các lượt gián đoạn giữ riêng; mọi số nghiệm thu từ artifact khớp checksum.

## 11. Kết quả WebKit

Xem full-audit-test-results.md cho từng ca FAIL và observer mới. Nhiều ca có cùng triệu chứng cookie không đồng nghĩa bảy lỗi độc lập. Linux BLOCKED sau từ chối quyền kiểm kê; Safari thật không có target; không giả lập kết quả hoặc bỏ assertion.

## 12. Kết quả bảo mật

Endpoint matrix/auth/session/role/ownership và HTTPS kiểm tra lại. OSV 88 package, affected 0; npm production0, dev/full7moderate. Xem full-audit-security.md cho giới hạn và finding còn mở.

## 13. Kết quả database

16 bảng, 54 checks, pass=True; constraint {"CHECK": 6, "FOREIGN KEY": 21, "PRIMARY KEY": 16, "UNIQUE": 13}. Profile/Account, Order/Delivery/Payment/Cart, tiền, orphan, duplicate và FK kiểm lại trên clone mới.

## 14. Kết quả hiệu năng

24 mức theo harness, hoàn thành 24; pass=True; 2523 request/230 đơn; unexpected HTTP/timeout=0; login={"samples": 24, "p50Ms": 296.152, "p95Ms": 352.656, "p99Ms": 645.625, "sloP95Ms": 2000}. EXPLAIN bốn query; không tự thêm index. Không tối ưu suy đoán hoặc cam kết production capacity.

## 15. Kết quả backup/restore

Restore mới fooddelivery_full_audit_restore, 16 bảng; row/count/hash/schema/FK khớp, backup hỏng bị chặn trước import, app validate bằng SELECT-only. Dữ liệu source không đổi. Backup SHA256 717e0e4f1060b8b3f85de58101e52566e51e7eac57446195aacb53d52812362d.

## 16. Các chức năng đã kiểm chứng

JUnit và E2E mới bao phủ Customer đăng ký/login/profile/menu/cart/checkout/address/cancel/order/rating; Restaurant profile/menu/price/availability/orders/report; Driver activity/accept/status/COD/history/report; Admin accounts/status/profiles/monitoring/analytics/ACL. Chi tiết theo test thật, không suy PASS cho phần phía sau assertion FAIL.

## 17. Các chức năng chưa hoàn thiện

Trong nghiệp vụ đã duyệt: gate WebKit chưa hoàn tất. Driver income/settlement/refund online/stock quantity/GPS không phải chức năng đã được phê duyệt trong các phase trước; không bịa dữ liệu hoặc bổ sung ledger. Linux/Safari và production ops chưa kiểm chứng.

## 18. Rủi ro còn tồn tại

Cookie/runtime finding, console log đi kèm nếu còn; dev advisory; single-process limiter/proxy peer; legacy unpaged lists; menu ABA limitation; thiếu target ops thật. Không gọi staging riêng là production.

## 19. Blocker chưa xử lý

WK-01 HIGH nếu browser gate còn FAIL; Linux/Safari thiếu quyền/môi trường là BLOCKED riêng. OPS-01 cần infrastructure và phê duyệt deployment/migration riêng. Tiếp tục hạng mục độc lập đã thực hiện; không triển khai public.

## 20. Kết luận Production Ready

FAIL. Không tự tuyên bố hoàn thành mọi điều kiện. MySQL80 Running, test ports closed=True; 9 database/141 bảng và 10269 file evidence cũ không đổi. Không commit/push/deploy hoặc ghi database chính.

Bằng chứng mới, riêng tư: `F:/New folder/food-delivery-mysql-test/full-audit-20261111/logs/`. Không đưa credential, key, cookie, raw SQL backup hoặc log nhạy cảm lên Git.
