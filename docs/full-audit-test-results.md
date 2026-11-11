# Tổng kiểm toán — kết quả kiểm thử mới

Sinh báo cáo: 2026-11-11T10:15:01.340226+00:00. Verdict: **FAIL**. Tất cả số dưới đây thuộc lượt full-audit, không tái sử dụng số PASS Giai đoạn 8.

JAR SHA256: `da9e2af23da5c71fb43b91c4d52a991ab49cb1a9ea9e2ef9b8ab69ded1cf40dd`; manifest từng file frontend trong `frozen-artifacts.json`. Hai ma trận cuối phải khớp chính các artifact này.

- JUnit: 178 PASS / 178 tổng; 0 FAIL, 0 ERROR, 0 SKIPPED. Bao gồm unit, integration MySQL thật, auth/ownership/role matrix, concurrency, transaction, schema, LAZY và cascade.
- Frontend: 315/315 PASS, 0 FAIL, 0 pending. Production build gồm typecheck, ESLint và formatter cuối đều đạt; formatter lần đầu FAIL ở README được giữ riêng.
- E2E chính: 204/210 PASS, 6 FAIL, 0 SKIPPED, 0 flaky, 0 global ERROR.
- Strict: 14/15 PASS, 1 FAIL, 0 SKIPPED. Không bỏ assertion hoặc retry để làm xanh.
- HTTP biên ngày Driver: 7/7 assertions PASS, 9 request thật gồm CSRF/login, có kiểm chứng CA và hostname.
- Integrity: 54/54 checks, allChecksPassed=True.
- Tải: 24/24 mức, pass=True; 2523/3000 request, 230/500 đơn, unexpected HTTP/timeout=0.
- Backup/restore: 16 bảng; every-row equality=True; boot Hibernate validate=True.

Latency lớn nhất qua các mức tải (ms): {"readMaxP95Ms": 47.226, "readMaxP99Ms": 50.249, "checkoutMaxP95Ms": 50.645, "checkoutMaxP99Ms": 52.456}. Login workflow tuần tự: {"samples": 24, "p50Ms": 296.152, "p95Ms": 352.656, "p99Ms": 645.625, "sloP95Ms": 2000}. Có warmup/pacing; không coi đây là throughput bão hòa hoặc capacity production.

HTTP Driver gồm năm request phải trả400 và hai khoảng ngày hợp lệ phải trả200; JSON gốc ghi từng input/status. Frontend navigation observations (LCP/CLS chỉ trong cửa sổ lấy mẫu, không phải CWV production):

- {"route": "/restaurants", "label": "cold browser context", "ttfbMs": 4.200000002980232, "domContentLoadedMs": 153.29999999701977, "loadMs": 153.29999999701977, "lcpObservedMs": 432, "clsObserved": 0.2282928562569324, "resourceCount": 22, "resourceTransferBytes": 437391, "decodedResourceBytes": 828517, "jsResourceCount": 9}
- {"route": "/restaurants", "label": "warm browser cache", "ttfbMs": 1.2000000029802322, "domContentLoadedMs": 40.1000000089407, "loadMs": 40.20000000298023, "lcpObservedMs": 196, "clsObserved": 0.2283108994170766, "resourceCount": 22, "resourceTransferBytes": 437391, "decodedResourceBytes": 828517, "jsResourceCount": 9}
- {"route": "/restaurants", "label": "warm browser cache", "ttfbMs": 1, "domContentLoadedMs": 57.900000005960464, "loadMs": 57.900000005960464, "lcpObservedMs": 208, "clsObserved": 0.24539660499855323, "resourceCount": 22, "resourceTransferBytes": 437391, "decodedResourceBytes": 828517, "jsResourceCount": 9}
- {"route": "/customer", "label": "CUSTOMER authenticated reload", "ttfbMs": 1, "domContentLoadedMs": 52.20000000298023, "loadMs": 52.20000000298023, "lcpObservedMs": 576, "clsObserved": 0.2345015488688151, "resourceCount": 36, "resourceTransferBytes": 418463, "decodedResourceBytes": 871429, "jsResourceCount": 23}
- {"route": "/restaurant/dashboard", "label": "RESTAURANT authenticated reload", "ttfbMs": 0.8999999910593033, "domContentLoadedMs": 35.099999994039536, "loadMs": 35.20000000298023, "lcpObservedMs": 508, "clsObserved": 0.1795574782307943, "resourceCount": 43, "resourceTransferBytes": 362497, "decodedResourceBytes": 822386, "jsResourceCount": 28}
- {"route": "/driver/dashboard", "label": "DRIVER authenticated reload", "ttfbMs": 1.0999999940395355, "domContentLoadedMs": 58.29999999701977, "loadMs": 58.29999999701977, "lcpObservedMs": 524, "clsObserved": 0.18225978671603735, "resourceCount": 46, "resourceTransferBytes": 365984, "decodedResourceBytes": 828296, "jsResourceCount": 30}
- {"route": "/admin/dashboard", "label": "ADMIN authenticated reload", "ttfbMs": 0.7999999970197678, "domContentLoadedMs": 31.899999991059303, "loadMs": 32.599999994039536, "lcpObservedMs": 468, "clsObserved": 0.1747530433108483, "resourceCount": 50, "resourceTransferBytes": 376474, "decodedResourceBytes": 855635, "jsResourceCount": 35}

Theo browser/batch:

- chromium/admin: PASS 20, FAIL 0, SKIPPED 0
- chromium/driver: PASS 16, FAIL 0, SKIPPED 0
- chromium/regression: PASS 34, FAIL 0, SKIPPED 0
- firefox/admin: PASS 20, FAIL 0, SKIPPED 0
- firefox/driver: PASS 16, FAIL 0, SKIPPED 0
- firefox/regression: PASS 34, FAIL 0, SKIPPED 0
- webkit/admin: PASS 19, FAIL 1, SKIPPED 0
- webkit/driver: PASS 14, FAIL 2, SKIPPED 0
- webkit/regression: PASS 31, FAIL 3, SKIPPED 0

Ca còn FAIL:

- webkit: admin session refresh logout cache cleanup account switching and frontend role guards remain correct — SameSite Strict/None
- webkit: full customer restaurant driver customer browser flow completes COD and rating consistently — SameSite Strict/None
- webkit: driver ownership across refresh logout and account switching with frontend role guards — SameSite Strict/None
- webkit: customer login, real Secure cookies, reload restore, logout and token revocation — SameSite Strict/None
- webkit: customer real COD ordering, address changes, cancellation, completion, ratings and profile remain consistent — SameSite Strict/None; có log console cần kiểm chứng riêng
- webkit: restaurant profile validation, real save and account cache isolation — SameSite Strict/None
- webkit strict: phase8 browser preserves a stale customer draft after actual ABA and never retries PUT — SameSite Strict/None

Regression mới: hai ca frontend tái hiện stale/aborted retried GET đều FAIL trước sửa và PASS sau sửa; ba ca biên ngày Driver có một FAIL trước sửa, ba PASS sau sửa; ba ca guard từ chối port3306, database chính và datadir khác. Bốn ca formatter giá lẻ FAIL trước sửa, PASS sau sửa; thêm một checkout giá lẻ trên mỗi engine vào bộ strict, giữ nguyên 12 ca strict cũ. SQL mới đối chiếu 4 đơn thật với Decimal, everyDecimalSnapshotMatches=True. Bộ cũ giữ nguyên.

Lượt đầy đủ đầu có 175 tests, 174 PASS/1 ERROR vì preflight chưa cho phép tên database mới; thêm tên cụ thể và guard test rồi chạy lại đủ bộ. Đây là lỗi chuẩn bị target, không phải kết quả nghiệm thu cuối. Lượt bị ngắt ở Chromium Driver được lưu trong `interrupted-20261111-driver`; không cộng 14 ca dở vào tổng cuối. Nhóm Admin đã hoàn tất chỉ được giữ khi artifact proof khớp JAR/build hiện tại.

Bằng chứng mới, riêng tư: `F:/New folder/food-delivery-mysql-test/full-audit-20261111/logs/`. Không đưa credential, key, cookie, raw SQL backup hoặc log nhạy cảm lên Git.
