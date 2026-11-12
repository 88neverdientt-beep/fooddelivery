# Giai đoạn 8.2 — Browser matrix

| OS | Engine/version | Main PASS/FAIL | Strict PASS/FAIL | Kết luận |
|---|---|---:|---:|---|
| Windows | chromium 158.0.8127.18 | 70/0 | 5/0 | PASS |
| Windows | firefox 159.0 | 70/0 | 5/0 | PASS |
| Windows | webkit 27.2 | 64/6 | 4/1 | FAIL |
| Linux | chromium 158.0.8127.18 | 70/0 | 5/0 | PASS |
| Linux | firefox 159.0 | 70/0 | 5/0 | PASS |
| Linux | webkit 27.2 | 70/0 | 5/0 | PASS |
| macOS | Safari native | NOT EXECUTED | NOT EXECUTED | BLOCKED |

**SAFARI NATIVE VERIFICATION: NOT EXECUTED.**

Linux is actual native ELF execution under Ubuntu26.04.1WSL2, not Windows browsers launched from Bash. It uses an external launcher preserving private libraries; original binary/protocol unchanged, frozen hash checked. TLS byte bridge links WSL127.0.0.1:18443 to Windows127.0.0.1:18443 because NAT cannot reach Windows loopback directly; no decryption/header/cookie rewriting. Scoped localhost test CA exception unchanged; Node/Python trust CA+hostname.

Reproduction: tools/focused.py customer1/2red, customer4postfix; actual same-site/cross-site cookie observer uses fresh config, Strictsentinel and Nonecontrol; boolnames only, no business requests. Windows and Linux observer matrices are separate; no assumption WebKit equals Safari. Native body cancellation traces6ZIP, screenshot3/video3 at own18444 are no-auth controls; auth native tracing stayed off because it would persist secrets. Redacted auth stack/timeline/network/status/attributes cover actual flow.

All batch commands/timestamps/counts/reportSHA and immutable artifact proof are retained; linux-node-download.json matches officialSHA, .debSHA matches signed privateapt index. Playwright official pinned browser downloads use HTTPS/ZIP validation; hashes freeze received executables, not an independent publisher signature. No apt install, no OS ldconfig update, no Docker or systempolicy change.

Final acceptance reuses unchanged valid non-Customer cases and full fresh8case Customer batches for all6combinations after two confirmed fixture synchronization fixes, plus a fresh4case Firefox responsive batch. All original failed reports remain under their original paths. It is not a claim of a single uninterrupted full invocation. Metadata uses real process.platform; WindowsWebKit UA containing Safari/macOS does not count as native Safari. Windows locale/timezone observations: windows-*-environment.json; Linux observer includes actual browser locale/timezone.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/`. Không đưa credential, key, cookie value, SQL backup hoặc private config vào Git. Báo cáo sinh 2026-11-11T16:27:31.878729+00:00; thời gian trong JSON là UTC, đối chiếu Asia/Saigon UTC+7.

Lượt sửa scheduler/tải/restore cuối: `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/`. JUnit/frontend/E2E vẫn lấy từ root 8.2 đầu; không coi summary sao chép phục vụ shutdown ở lượt tải là một lần chạy JUnit mới.
