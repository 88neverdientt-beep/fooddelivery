# Giai đoạn 8.2 — Kết quả kiểm thử mới

| Suite | PASS | FAIL | ERROR | SKIPPED |
|---|---:|---:|---:|---:|
| JUnit | 178 | 0 | 0 | 0 |
| Frontend | 315 | 0 | 0 | 0 |
| Windows E2E | 204 | 6 | 0 | 0 |
| Windows strict | 14 | 1 | 0 | 0 |
| Linux main | 210 | 0 | 0 | 0 |
| Linux strict | 15 | 0 | 0 | 0 |

Không dùng số lịch sử làm kết quả mới. Không cộng diagnostic, HTTP assertions, SQL checks và browser cases thành một tổng giả. Không có retry/fixme/skip để làm xanh. Test count không đổi vì sửa/tăng assertion trên ca Customer có sẵn, không loại ca.

Commands/time/env/provenance: `phase82-execution.json`, `linux-execution.json`, `linux-matrix-progress.json`, `phase82-final-execution.json`; JUnit command trong run-backend-tests.py và backend-all-tests.log, invocation mới kết thúc2026-11-11T18:08:31+07. Vitest JSON mới là frontend-unit.json. Native trace/video là control không auth, không thay auth flow evidence.

Lượt đỏ/chuẩn bị giữ riêng: customer1/2pageerror; customer3 không dùng làm proof độc lập duy nhất do gateway maintenance cùng cửa sổ; customer4 độc lập zero pageerror nhưng vẫn FAIL cookie. WSL stale-index404 và smoke thiếulibs/pathsplit/FirefoxJSONdownload là environment/harness; load gate timeout xảy ra trước tải. Không che các lượt này.

Artifact JAR SHA256 `4cb824929e64bc61426a34a27e476d1bd9e6664c0074787c688da3a98b5319ed`; từng static file trong frozen-artifacts.json. HTTP7/7 trong https-security-proof.json; SQL `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/database-integrity-final.json`, load `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/performance-results.json`, restore backup-restore-proof.json.

SQL: 54/54 PASS; 16 bảng, {'CHECK': 6, 'FOREIGN KEY': 21, 'PRIMARY KEY': 16, 'UNIQUE': 13}. Load: pass=True, 24/24 mức; 2.513 request/230 đơn; unexpectedHTTP/timeout=0. Restore: 16 bảng everyrow/schema exact và validate boot. Các nhóm này là checks/stages/table comparisons riêng, không phải JUnit cases.

Các lỗi phát hiện trong vòng Linux đầu gồm hai decode trước lazy-load và một hard-reload trước lazy-route mount. Không bỏ ca: nguyên nhóm 8 Customer được chạy lại trên 6 tổ hợp, nguyên 4 ca responsive Firefox chạy lại, sau hai sửa helper có bằng chứng. Summary accepted ghi rõ provenance/replaced caseIDs; report gốc không sửa. Bảng này tổng hợp các ca hợp lệ cùng artifact, không phải số của một invocation liên tục. Xem customer-final-summary.json, firefox-responsive-fix-verification.json, final-customer-acceptance-proof.json và frontend-gates-after-route-fix.json.

Lượt tải đầu dừng 3/24 mức,423 request/0đơn, không HTTPerror/timeout; không tính PASS. Đã có regression scheduler đỏ/xanh và test genuineoverrun vẫnFAIL, rồi chạy lại 24 mức trong ngân sách còn2.577 request. Số đo load/SQL/restore cuối ở roottải riêng; không tái sử dụng kết quả JUnit/frontend hay cộng stage của các lượt. Originalrestore giữ nguyên, restorefinal là schema mới.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/`. Không đưa credential, key, cookie value, SQL backup hoặc private config vào Git. Báo cáo sinh 2026-11-11T16:27:31.878729+00:00; thời gian trong JSON là UTC, đối chiếu Asia/Saigon UTC+7.

Lượt sửa scheduler/tải/restore cuối: `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/`. JUnit/frontend/E2E vẫn lấy từ root 8.2 đầu; không coi summary sao chép phục vụ shutdown ở lượt tải là một lần chạy JUnit mới.


### Latency và throughput theo mức tải cuối

| Nhóm | VU | Samples | p50 ms | p95 ms | p99 ms | Vòng/giây | PASS |
|---|---:|---:|---:|---:|---:|---:|---|
| restaurant_listing | 1 | 25 | 31.994 | 39.253 | 45.038 | 0.867 | True |
| restaurant_listing | 3 | 75 | 31.799 | 43.209 | 45.911 | 2.6 | True |
| restaurant_listing | 5 | 125 | 36.08 | 48.637 | 52.077 | 4.333 | True |
| menu | 1 | 25 | 22.99 | 38.301 | 39.677 | 0.867 | True |
| menu | 3 | 75 | 28.123 | 35.136 | 39.472 | 2.601 | True |
| menu | 5 | 125 | 33.534 | 42.855 | 44.815 | 4.335 | True |
| cart | 1 | 25 | 23.368 | 35.619 | 39.622 | 0.867 | True |
| cart | 3 | 75 | 22.953 | 34.367 | 37.528 | 2.6 | True |
| cart | 5 | 125 | 42.251 | 51.32 | 56.039 | 4.331 | True |
| checkout | 1 | 25 | 51.152 | 66.999 | 67.274 | 0.866 | True |
| checkout | 3 | 75 | 45.087 | 63.579 | 73.134 | 2.594 | True |
| checkout | 5 | 125 | 47.339 | 60.163 | 64.973 | 4.323 | True |
| customer_orders | 1 | 25 | 31.341 | 41.352 | 42.161 | 0.867 | True |
| customer_orders | 3 | 75 | 23.759 | 38.19 | 41.156 | 2.602 | True |
| customer_orders | 5 | 125 | 33.195 | 46.622 | 79.873 | 4.319 | True |
| restaurant_dashboard | 1 | 25 | 25.498 | 42.892 | 45.554 | 0.867 | True |
| restaurant_dashboard | 3 | 75 | 31.639 | 39.745 | 43.907 | 2.6 | True |
| restaurant_dashboard | 5 | 125 | 37.131 | 46.708 | 50.162 | 4.334 | True |
| driver_deliveries | 1 | 25 | 16.605 | 28.03 | 30.245 | 0.867 | True |
| driver_deliveries | 3 | 75 | 18.326 | 30.118 | 32.812 | 2.602 | True |
| driver_deliveries | 5 | 125 | 25.583 | 35.333 | 40.112 | 4.333 | True |
| admin_analytics | 1 | 25 | 52.165 | 66.813 | 74.344 | 0.867 | True |
| admin_analytics | 3 | 75 | 43.416 | 72.277 | 75.806 | 2.597 | True |
| admin_analytics | 5 | 125 | 64.058 | 76.241 | 80.134 | 4.328 | True |

Mỗi mức có deadline tối đa30s và pace1,2s:25slot tại0…28,8s, không có slot ở30s. Thời gian thực tế từng mức nằm trong JSON; không coi throughput loopback này là capacity production.

Kết quả đo bổ sung: p95/p99 lớn nhất của các mức đọc = 76.241/80.134 ms; checkout = 66.999/73.134 ms. InnoDB: 0 deadlock, 0 lock timeout, 3 lượt chờ khóa, tổng thời gian chờ 55 ms trong cửa sổ quan sát có baseline trước benchmark. Không đổi cấu hình monitor.
