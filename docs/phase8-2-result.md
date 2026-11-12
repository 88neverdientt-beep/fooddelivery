# Giai đoạn 8.2 — Final blocker resolution

## 1. Executive Summary

**FAIL – NOT PRODUCTION READY.** Windows WebKit cookie gate vẫn FAIL; không đổi cookie/CSRF hoặc bỏ assertion để đóng gate. Kết quả Linux ghi riêng, không thay thế Safari thật hay production infrastructure.

## 2. Phạm vi thực hiện

Thực thi source/test audit, tái hiện browser, chuẩn bị runtime portable được duyệt, hồi quy Windows/Linux, MySQL clone, HTTPS, tải và restore. Không commit/push/deploy; không triển khai nghiệp vụ mới.

## 3. Baseline Giai đoạn 8.1

178 JUnit,315 frontend,204/210 Windows chính,14/15 strict,54 SQL,24 mức tải/2523 request/230 đơn và16 bảng restore chỉ là lịch sử. Các số trong bảng kết quả là lượt8.2 mới; không cộng diagnostic hoặc SQL checks vào số JUnit.

## 4. Trạng thái Git ban đầu

Working tree có thay đổi Giai đoạn8/full-audit từ trước. Đã lưu git-status.txt/git-diff-stat.txt/git-diff.patch/git-head.txt và source-baseline.json trước sửa. File người dùng `h github main` được bảo toàn; danh sách delta8.2 riêng trong phase8-2-files.txt.

Quan sát Git cuối: HEAD đổi từ `12444c6` sang `0315de8`, commit “Update Food Delivery Phase 8.2” lúc 2026-11-11T23:23:34+07:00. Agent không chạy commit/push/deploy và không sửa lịch sử hoặc baseline. Tác nhân hiện chưa được xác nhận; checksum source/artifact được kiểm thử vẫn khớp. Xem `git-head-observation.json` ở root tải cuối.

## 5. Môi trường kiểm thử

Windows, JDK25.0.4 IntelliJ/Maven3.9.16/Node24.20.0/MySQL8.0.46; test3307/18080/19090/4173/18443. Linux Ubuntu26.04.1 WSL2, Node24.20.0 portable, Playwright1.65.0; Chromium158.0.8127.18, Firefox159.0, WebKit27.2. Linux dùng bridge byte TLS loopback cho NAT, không rewrite headers/cookies.

## 6. Danh sách blocker

WK-01 HIGH FAIL; OPS-01 HIGH BLOCKED; SAF-01 BLOCKED. WEB-02 là lỗi đồng bộ helper đã sửa/kiểm chứng trong phạm vi trigger được tái hiện. DEP-01 moderate dev/lint còn mở với đánh giá điều kiện khai thác; xem blocker/security docs.

## 7. Phân tích SameSite

Backend thực gửi Strict/Secure/HttpOnly/host-only/Path=/auth; gateway rewrite Path=/api/auth. Observer đối chiếu same-site và cross-site top-levelPOST, Strict sentinel và None positive control, chỉ ghi boolean tên cookie. Không ghi cookie value hoặc token. Xem hai cookie-server-observation-matrix.json cho Windows/Linux.

## 8. Phân tích WebKit Windows

Hai lượt tập trung trước sửa tái hiện pageerror, và observer mới tái hiện Strict bị báo None/gửi cross-site. Header đúng, Chromium/Firefox cùng origin đúng; bằng chứng xác nhận triệu chứng runtime Windows, chưa xác định upstream subcomponent cụ thể. Không khẳng định curl là root cause hoặc suy mọi Safari lỗi.

## 9. Phân tích WebKit Linux

Runtime riêng đã launch thật, ca Customer mục tiêu PASS; ma trận đầy đủ: {'main': {'passed': 210, 'failed': 0, 'skipped': 0, 'flaky': 0, 'globalErrors': 0}, 'strict': {'passed': 15, 'failed': 0, 'skipped': 0, 'flaky': 0, 'globalErrors': 0}}. Launcher ngoài browser quote đường dẫn có dấu cách, giữ private LD_LIBRARY_PATH và dùng đúng ELF revision2388; ELF/protocol không vá. Playwright heuristic ldconfig không thấy private libraries; dùng executablePath và kiểm tra ldd/launch thật, không giả lập ldconfig hoặc bỏ business/security assertions.

## 10. Phân tích Safari

**SAFARI NATIVE VERIFICATION: NOT EXECUTED.** Không có máy macOS/Safari được cấp. Playwright WebKit không thay bằng chứng Safari thật; cần operator cung cấp runner/target và chạy cùng các luồng bảo mật.

## 11. Phân tích pageerror

Stack mới trỏ FoodDetail.onSuccess→invalidateQueries→refetchQueries→cart GET. Timeline cho thấy helper bắt đầu hard navigation ngay sau POST201, trước hoàn tất cart reconciliation. Hai lượt trước sửa có pageerror; sửa helper chờ link Xem giỏ hàng và nút thêm enabled. Lượt customer4 độc lập và suite cuối không còn unexpected console records. Không bỏ console guard, không catch rỗng hoặc blanket whitelist. Hai loại control native (trước/sau response headers) không tái hiện; vì vậy không gộp lỗi thành generic cancellation. Linux còn tái hiện trigger thứ hai: URL của link đã đổi nhưng component lazy chưa mount xong; helper lại reload cùng URL và khởi tạo GET menu/cart trong document đang unload. Sửa chỉ điều hướng khi pathname khác đích, luôn chờ nội dung thật. Chạy lại đủ8Customer trên 6 tổ hợp OS/browser; giữ nguyên các report trước sửa và cookie FAIL Windows.

## 12. Phân tích E2E strict

Windows: PASS 14; FAIL 1; ERROR 0; SKIPPED 0. Linux: {'passed': 15, 'failed': 0, 'skipped': 0, 'flaky': 0, 'globalErrors': 0}. Giữ toàn bộ CAS/ABA, precondition, cookie và precision assertions; không retry/fixme/skip.

## 13. Các lỗi đã sửa

TEST-01: helper addThroughFoodPage chờ UI xác nhận/reconciliation trước hard navigation. ENV-01: portable Linux thiếu runtime/libs, stale apt index404, epoch archive naming; giải quyết bằng archive đã kiểm SHA và apt index riêng có chữ ký. ENV-02: shell WebKit upstream không quote path và overwrite LD path; launcher ngoài binary. Bổ sung đúng tên clone8.2 vào guard, giữ chặn3306/database chính/datadir khác. TEST-02: shared capture gọi decode() trước khi ảnh lazy có request. Control Firefox không app/auth chứng minh complete=false/naturalWidth0/currentSrc rỗng gây EncodingError, sau tải đủ width480 thì decode thành công. Thêm chờ complete&&naturalWidth>0 rồi vẫn decode; ảnh hỏng vẫn FAIL, không tăng timeout. TEST-03: scheduler cộng dồn1.2s có thể lên lịch lần thử thứ26 sát biên30s. Thực thi AST worker với đồng hồ giả tái hiện26attempt/25success rồi deadline; sửa integer-slot/start+slot*1.2 còn25/25, và genuineoverrun vẫn bị chặn. Không nới timeout, SLO hoặc thêm retry; không sửa ứng dụng.

## 14. Các regression test mới

Không thêm/bỏ ca JUnit hoặc Vitest:178 và315 giữ nguyên. Ca Customer hiện hữu được tăng assertion hoàn tất UI và diagnostic timeline/stack; chạy đỏ2lần và xác minh sau sửa, toàn bộ70ca/engine giữ nguyên. Native controls/video/trace là diagnostic riêng, không thổi thành test nghiệp vụ mới. Các ca sau assertion cookie FAIL không được tự tính PASS. Có hai lỗi ảnh trên FirefoxLinux (Customer375 và responsive375), được tái hiện bằng native control, rồi chạy lại nguyên nhóm 8 Customer và4responsive; sau sửa điều hướng mới còn chạy đủ8Customer cho cả 6 tổ hợp. Tổng acceptedcase không đổi; report và lỗi cũ được giữ nguyên, không dùng retry-to-green.

## 15. Dependency advisory

Npm production0; full7moderate đều dev. Một advisory gốc GHSA-g3hv-75wg-m249 lan tới7package; minimatch10.2.6 bị ảnh hưởng >=7<11.0.1, patched11.0.1. typescript-eslint8.72.2 mới nhất vẫn yêu cầu^10.2.2. Bản audit gợi ý8.36.0 còn yêu cầu^9.0.4 nên cũng trong affected range; không downgrade hoặc override giả. Chi tiết exact versions/dependency paths trong security doc và phase82-dependency-analysis.json.

## 16. Kết quả Backend

PASS 178; FAIL 0; ERROR 0; SKIPPED 0; Maven package mới, MySQL clone/validate; JUnit XML chỉ lấy mtime từ invocation mới, mọi run flag integration bật. Giữ các hồi quy transaction/concurrency/auth/ownership/money/date/LAZY/cascade.

## 17. Kết quả Frontend

PASS 315; FAIL 0; ERROR 0; SKIPPED 0; typecheck/lint/formatter/build mới đều exit0. Manifest static build trùng source hiện tại; không thay UI/dependency hoặc logic giá.

## 18. Kết quả E2E

| Suite | PASS | FAIL | ERROR | SKIPPED |
|---|---:|---:|---:|---:|
| JUnit | 178 | 0 | 0 | 0 |
| Frontend | 315 | 0 | 0 | 0 |
| Windows E2E | 204 | 6 | 0 | 0 |
| Windows strict | 14 | 1 | 0 | 0 |
| Linux main | 210 | 0 | 0 | 0 |
| Linux strict | 15 | 0 | 0 | 0 |

## 19. Kết quả kiểm thử đa trình duyệt

Xem phase8-2-browser-matrix.md. Windows và Linux dùng cùng JAR/static manifest; từng batch kiểm hash trước/sau, một worker/zero retries. Linux caseIDs70/engine được kiểm duy nhất. Binaries/version, command, timestamp và reportSHA có trong logs. Ma trận Linux vòng đầu mới có counts={"main": {"passed": 207, "failed": 3, "skipped": 0, "flaky": 0, "globalErrors": 0}, "strict": {"passed": 15, "failed": 0, "skipped": 0, "flaky": 0, "globalErrors": 0}}; counts cuối ghép các ca không đổi đã hợp lệ với nguyên nhóm sau sửa đã chạy lại thật. Đây là tổng hợp có provenance theo ca, không tuyên bố một invocation liên tục. Xem final-customer-acceptance-proof.json và before-final-customer-acceptance/.

## 20. Kết quả Security

JUnit auth/session/role/ownership chạy lại; Windows/Linux các luồng refresh/logout/all/account-switch/CAS dùng token thật. HTTPS7nhóm mới đạt, gồm CA/hostname negative, CSRF/CORS, management, request IDs và expiry thực không ghi cart. Current secret scan theo phạm vi artifact/log/source; không đồng nghĩa không còn mọi rủi ro.

## 21. Kết quả MySQL

Database riêng fooddelivery_phase8_2 clone chính xác16 bảng từ full-audit; runtime validate/OSIVfalse, DMLuser chỉ schema mới. 54/54 integrity checks PASS; 16 bảng, constraint counts {'CHECK': 6, 'FOREIGN KEY': 21, 'PRIMARY KEY': 16, 'UNIQUE': 13}. Proof: `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/database-integrity-final.json`. Không sửa schema/database lịch sử hoặc dữ liệu QA cũ; kết quả từng check và EXPLAIN trong JSON gốc.

## 22. Kết quả Backup/Restore

16 bảng, every-row digest=True, constraints=True, boot validate=True. Restore mới fooddelivery_phase8_2_restore_final bằng tài khoản giới hạn; readerSELECTonly; backup hỏng bị chặn trước import. SHA256 `5bb2f7c72bf05b370b255cdb575ba21c20fed95e82b9059001e2753d723695dc`. Bản restore trước fooddelivery_phase8_2_restore và mọi report trước được giữ nguyên; không ghi đè để làm xanh.

## 23. Kết quả Load Test

Bằng chứng mới `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/performance-results.json`: pass=True, 24/24 mức hoàn tất, 2513 request/230 đơn mới, unexpectedHTTP/timeout=0; login={'samples': 24, 'p50Ms': 337.481, 'p95Ms': 367.129, 'p99Ms': 891.917, 'sloP95Ms': 2000}. SLO local1→3→5,30giây/mức,≤3000request/500đơn; read p95≤750/p99≤1500,checkout ≤1500/3000ms, login p95≤2000ms. Không chạy browser/Maven đồng thời. Lượt chờ Linux chạm timeout trước load được giữ log riêng, không tính request hoặc kết quả tải. Không suy capacity production từ loopback. Đính chính trong resource-threshold-correction.json:5GiB là free disk, không phải RAM. Agent đã đọc nhầm lúc trao đổi, sửa lại trước thực thi; draft chặnRAM chưa từng chạy và được lưu riêng/khóa tái sử dụng. Không thêm điều kiện nghiệm thu mới. Lượt tải đầu423 request/0đơn dừng vì scheduler, giữ nguyên report. Sau sửa còn ngân sách2.577 request; lượt cuối 2.513 request/230 đơn, tổng hai lượt 2936/3000. Xem load-schedule-boundary-regression.json ở rootđầu và execution.json ở roottải. Các số latency/stages phía trên thuộc lượt cuối thật, không cộng3mứcđầu vào24 mức.

Kết quả đo bổ sung: p95/p99 lớn nhất của các mức đọc = 76.241/80.134 ms; checkout = 66.999/73.134 ms. InnoDB: 0 deadlock, 0 lock timeout, 3 lượt chờ khóa, tổng thời gian chờ 55 ms trong cửa sổ quan sát có baseline trước benchmark. Không đổi cấu hình monitor.

## 24. Kiểm chứng Production Infrastructure

Đã đọc template app/env/nginx/CI/runbook và kiểm cổng/health/readiness/metrics/least-privilege/restore tại staging local. PublicDNS/TLSrenewal,DBTLS,secret manager/keyrotation,shared limiter/trustedproxy,supervisor/drain,alert delivery,encrypted off-host backup/RTO/RPO và rollback trên target thật chưa có bằng chứng. BLOCKED; chưa deploy hoặc bật remoteCI.

## 25. Rủi ro còn tồn tại

WebKit Windows cookie gate; native Safari; dev minimatch advisory; limiter theo process/proxy peer, legacy unpaged APIs, giới hạn ABA menu đã duyệt, infrastructure thật. Mọi nhận định chỉ trong phạm vi kiểm chứng; không thay pricing/lifecycle/fee/schema nhằm đóng gate.

## 26. Danh sách BLOCKED

Safari thật và infrastructure production. Linux được cấp thêm quyền và đã thực thi, không giữ trạng thái WSL bị từ chối của lượt cũ làm lý do mới. Nếu từng ca Linux FAIL, giữ FAIL trong ma trận; không chuyển thành BLOCKED môi trường không có chứng cứ.

## 27. File đã tạo/sửa

Xem phase8-2-files.txt, chỉ delta so với source-baseline8.2. Tools/log/credentials/SQL/key/runtime portable đều ngoài repository tại root bằng chứng riêng. Không đưa artifact private lên Git.

## 28. Hướng dẫn tái kiểm thử

Dùng JDK 25 theo phiên và Maven 3.9.16 từ cache; đọc tools/full-regression.py, linux-target-and-matrix.py, finish-phase82.py và JSON execution để xem command/timestamp thực tế. Không chạy mù setup/restore khi target đã tồn tại: script từ chối overwrite. Lượt mới phải tạo root/schema/user mới được guard duyệt, clone read-only và lấy fresh fixture; không ghi lại historical DB để né provisioning.

## 29. Điều kiện còn thiếu để đạt Production Ready

Sửa/kiểm chứng runtime WebKit Windows với Strict semantic đúng và đủ E2E/strict, hoặc quyết định release scope riêng được user phê duyệt; Safari thật nếu mandatory; production infra gates và risk acceptance có bằng chứng. Không tự hạ tiêu chí hoặc coi Linux PASS thay Windows FAIL.

## 30. Kết luận cuối cùng

**FAIL – NOT PRODUCTION READY.** Test ports closed=True, MySQL80=Running; lịch sử 11 database/173 bảng và evidence/doc trước được đối chiếu. Agent không commit/push/deploy, không kết nối thử nghiệm hoặc ghi vào3306; thay đổi HEAD được ghi riêng ở mục4. Giữ mọi dữ liệu/log riêng. Sau lượt cuối còn kiểm tra 12 schema/189 bảng được bảo vệ, gồm bản restore đầu; 9.616 file8.2 trước không đổi. Final shutdown proof lấy từ roottải mới.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/`. Không đưa credential, key, cookie value, SQL backup hoặc private config vào Git. Báo cáo sinh 2026-11-11T16:27:31.878729+00:00; thời gian trong JSON là UTC, đối chiếu Asia/Saigon UTC+7.

Lượt sửa scheduler/tải/restore cuối: `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/`. JUnit/frontend/E2E vẫn lấy từ root 8.2 đầu; không coi summary sao chép phục vụ shutdown ở lượt tải là một lần chạy JUnit mới.
