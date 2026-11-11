# Giai đoạn 8 — Test results

- Backend JUnit: 172 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED; JDK25.0.4/Maven3.9.16/MySQL8.0.46 độc lập, Hibernate validate.
- Frontend: 309/309 unit/component PASS; typecheck, ESLint, formatter và production build PASS. Thay đổi cuối ở helper/diagnostics E2E cũng qua typecheck/lint/formatter.
- Playwright chính: 204 PASS, 6 FAIL, 0 SKIPPED, 0 flaky, 0 global ERROR, tổng 210.
- Playwright strict riêng: 11 PASS, 1 FAIL, 0 SKIPPED, tổng 12.
- Database: 45 checks, allChecksPassed=True.
- Performance: pass=True; 24/24 stages.
- Backup/restore: application validate=True, every-row equality=True.
- Current secret scan: 3143 entries, 0 hits.

Không cộng unit, integration, browser, HTTP assertions và SQL checks thành một con số test giả. Các vòng đỏ, lỗi cấu hình fixture ban đầu, lượt bị gián đoạn và lượt bị rate-limit trong chẩn đoán được giữ riêng, không coi là nghiệm thu PASS. Chi tiết FAILED test và error context giữ trong report JSON/Playwright output, không che lỗi bằng retry hoặc skip.

Danh sách ca còn FAIL trong báo cáo cuối:

- webkit: admin session refresh logout cache cleanup account switching and frontend role guards remain correct — SameSite Strict/None
- webkit: full customer restaurant driver customer browser flow completes COD and rating consistently — SameSite Strict/None
- webkit: driver ownership across refresh logout and account switching with frontend role guards — SameSite Strict/None
- webkit: customer login, real Secure cookies, reload restore, logout and token revocation — SameSite Strict/None
- webkit: customer real COD ordering, address changes, cancellation, completion, ratings and profile remain consistent — SameSite Strict/None; đồng thời có log console trong report, cần retest riêng
- webkit: restaurant profile validation, real save and account cache isolation — SameSite Strict/None
- webkit strict: phase8 browser preserves a stale customer draft after actual ABA and never retries PUT — SameSite Strict/None

Hồi quy giữ năm writer CartService/Order/Delivery/Payment/menu và dependency JavaScript theo baseline. CartItemService được sửa riêng phần materialize/read cart và isolation cục bộ của add; nội dung các business body add/update/remove không đổi, có proof hash và ba regression mới. Checksum bằng chứng lịch sử, các database cũ và HEAD được đối chiếu trong `preservation-proof.json`.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-20261110/logs/`. Không đưa credential, private key hoặc SQL backup vào Git.
