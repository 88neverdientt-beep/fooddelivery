# Giai đoạn 8.2 — Blocker tracker and root-cause evidence

## WK-01 — HIGH — FAIL

Environment: WindowsWebKit27.2. Evidence: Observer boolean cross-sitePOST+6main/1strictFAIL.

Confirmed cause / limit: Header/cookie correct, platform behavior differs from Chromium/Firefox and Linux; exact upstream component unknown. Suspected but unconfirmed details remain explicitly unconfirmed.

Action/fix: Provide fixed verified runtime and rerun full Windows gate; retainStrict/Secure/HttpOnly.

Owner/support and closure condition: Browser maintainer/Windowsrelease owner; close only Strict semantic + main/strict zeroFAIL.

## WEB-02/TEST-01 — MEDIUM — FIXED scoped

Environment: CustomerE2E/WebKitWindows. Evidence: customer1/2stack+timeline; customer4 and final suites zero unexpected.

Confirmed cause / limit: Hardnavigation after POST201 races onSuccess cartrefetch in unloadingdocument. Suspected but unconfirmed details remain explicitly unconfirmed.

Action/fix: Wait actual UI reconciliation; console guard unchanged.

Owner/support and closure condition: Regression included same existing lifecycle case on allengines; no general native-cancellation waiver.

## TEST-02 — MEDIUM — FIXED

Environment: FirefoxLinux mobile capture. Evidence: Original Customer375/responsive375 EncodingError; linux-native-lazy-image-proof.json; whole batches reexecuted.

Confirmed cause / limit: decode invoked before a lazy image has a current request; no app/credentials needed to reproduce. Suspected but unconfirmed details remain explicitly unconfirmed.

Action/fix: Wait complete&&naturalWidth>0 and still decode; no catch, timeout increase or image assertion removed.

Owner/support and closure condition: Actual fresh8Customer across6combinations and4FirefoxResponsive; original failed reports retained.

## ENV-01/02 — MEDIUM — RESOLVED for verification

Environment: WSLportable. Evidence: SHA aptarchives,smoke failures/success,runtime manifest.

Confirmed cause / limit: MissingLinuxNode/libs; staleindex404; epochfilename; JSONdownload; upstreamwrapperunquotedspaces/LDoverwrite. Suspected but unconfirmed details remain explicitly unconfirmed.

Action/fix: Workspaceportable downloads, private signedaptindex, externalquotedlauncher and fixedbytebridge.

Owner/support and closure condition: No aptinstall/ldconfigOSchanges; originalbinaryhash frozen.

## DEP-01 — MODERATE — OPEN assessed

Environment: Developmentlinttoolchain. Evidence: Freshnpm/registry/dependencytree.

Confirmed cause / limit: Rootminimatchamplification; latest parentcannotconsume11patchedleaf. Suspected but unconfirmed details remain explicitly unconfirmed.

Action/fix: Wait compatibleparent or separatelyreviewmajor migration; nofakeoverride.

Owner/support and closure condition: Dependencymaintainer/projectowner; close fresh audit+fullaffectedregression.

## SAF-01 — HIGH gate — BLOCKED

Environment: NativeSafari/macOS. Evidence: No authorizedmacOStarget.

Confirmed cause / limit: Environment absent. Suspected but unconfirmed details remain explicitly unconfirmed.

Action/fix: Provide real Safari runner and execute same gates.

Owner/support and closure condition: Targetowner; no claim Playwright substitutesnativeSafari.

## OPS-01 — HIGH gate — BLOCKED

Environment: Productioninfrastructure. Evidence: Templates/localproofonly, no prodtarget.

Confirmed cause / limit: No infra access/execution evidence. Suspected but unconfirmed details remain explicitly unconfirmed.

Action/fix: Supply explicit production operations proofs listed in readinessdoc.

Owner/support and closure condition: Operator/SRE; close allrequiredactualtarget gates.

No application bug was fabricated from environment failures. Six Windows main FAIL and one strict FAIL are retained, not counted as seven unrelated vulnerabilities. No skip/retry/expectation weakening. Nativecontrols could not reproduce generic cancellation; no arbitrarypageerrorwhitelist. The late navigation trigger was isolated and helper repaired with stronger semantic UI assertions.

Preparation failure chronology/logs: copied HashInput.java initially missing (no Adminfixture inserted before helper available); staleapt404 and encodedepoch filename resolved; Linuxsmoke JSONdownload not browserlaunch failure; wrapperpathsplit not appCORS; load pendinggate timedout before measurement, later load is a new invocation. These are not product test PASS/FAIL counts.

Second navigation trigger was confirmed on LinuxWebKit: helper hard-reloaded the same food URL while lazy component was mounting after a link URL update; menu/cart subscriptions attempted fetch during unload. Conditional navigation removes the redundant unload and keeps heading/data waits. All6complete Customer batches rerun after fix; old errors retained as superseded evidence. Agent resource interpretation error was also corrected before load:5GiB applies to free disk, not RAM. No unapproved RAM gate was executed; source plan and correction are hashed in resource-threshold-correction.json.

TEST-03 (FIXED): upper-bound request admission caused by cumulative floating point pacing. Actual first load423 requests/0orders/3completedstages had noHTTPerrors;26thscheduledattempt was rejected at30s. Execute-worker-AST regression proves originalerror, patched25slots, genuineoverrunstillrejected. Integer slot scheduling retains1.2s pace/30s deadline, all SLOs and≤3000combinedrequests. Final load and restore have fresh evidence in second root; first results were not rewritten.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/`. Không đưa credential, key, cookie value, SQL backup hoặc private config vào Git. Báo cáo sinh 2026-11-11T16:27:31.878729+00:00; thời gian trong JSON là UTC, đối chiếu Asia/Saigon UTC+7.

Lượt sửa scheduler/tải/restore cuối: `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/`. JUnit/frontend/E2E vẫn lấy từ root 8.2 đầu; không coi summary sao chép phục vụ shutdown ở lượt tải là một lần chạy JUnit mới.


### Git provenance — chưa xác nhận tác nhân

Quan sát Git cuối: HEAD đổi từ `12444c6` sang `0315de8`, commit “Update Food Delivery Phase 8.2” lúc 2026-11-11T23:23:34+07:00. Agent không chạy commit/push/deploy và không sửa lịch sử hoặc baseline. Tác nhân hiện chưa được xác nhận; checksum source/artifact được kiểm thử vẫn khớp. Xem `git-head-observation.json` ở root tải cuối.


Lỗi nhãn log before/after: runner bảo vệ không ghi đè log nên dừng trước bước after. Đã lưu runner cũ, bổ sung mode vào nhãn log và tiếp tục riêng phần SQL/restore/shutdown chưa chạy. Không chạy lại benchmark vì lỗi ghi log.
