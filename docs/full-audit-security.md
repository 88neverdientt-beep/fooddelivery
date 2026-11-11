# Tổng kiểm toán — bảo mật

Verdict toàn hệ thống: **FAIL**. Không tuyên bố đã loại bỏ mọi lỗ hổng.

Authentication/authorization dùng Account trung tâm, role và profile từ DB/principal, session còn hiệu lực, RS256, issuer/audience/typ/expiry, refresh hash/rotation/replay và CSRF. Bộ JUnit chạy lại đầy đủ, gồm endpoint inventory 81 route và các denial theo vai trò, ownership, disabled account, forged fields, rollback và concurrency. Không mở API mới hoặc thay business writer để né test. Actuator được kiểm HTTP riêng.

Sửa AUTH-01: response401 của GET retry thuộc generation cũ hoặc request đã abort không được xóa phiên/cache mới. Request bị loại bằng AbortError; phiên hiện tại vẫn được xác minh bình thường. 401 của request hiện tại vẫn làm mất phiên đúng như trước. Không tự retry mutation.

Cookie backend/gateway giữ Secure/HttpOnly/SameSite=Strict, host-only và Path=/api/auth sau proxy. CORS exact allowlist, CSRF, JWT, revocation và browser storage assertions giữ nguyên. Observer mới: {"engine": "webkit", "version": "27.2", "platform": "win32", "serverCookieStrictHeaderVerified": true, "reportedSameSite": "None", "sameSite": {"refreshCookieSent": true, "noneControlSent": true, "strictControlSent": true}, "crossSite": {"refreshCookieSent": true, "noneControlSent": true, "strictControlSent": true}, "semanticStrictVerified": false, "observationSource": "Actual gateway received Cookie header, boolean names only; not Playwright request introspection", "businessRequestsByProbe": 0, "rawCookiesOrTokensLogged": false}

Các FAIL WebKit phải phân nhóm: nhiều assertion có chung triệu chứng Strict/None; nếu có console error thì giữ thành finding cần phân tích riêng. Không suy rằng mọi ca Safari đều lỗi, không đổi Strict thành None, không vá browser protocol hoặc làm yếu assertion. Linux: BLOCKED — lệnh kiểm kê WSL bị từ chối quyền và không được chạy lại. Safari thật: BLOCKED — không có target phù hợp, không giả lập kết quả.

Đối chiếu mới cùng gateway, header và control: [{"engine": "chromium", "reportedSameSite": "Strict", "semanticStrictVerified": true}, {"engine": "firefox", "reportedSameSite": "Strict", "semanticStrictVerified": true}, {"engine": "webkit", "reportedSameSite": "None", "semanticStrictVerified": false}]. Observer chỉ trả boolean tên cookie, không ghi giá trị/token và không xử lý business request; source gateway được phục hồi nguyên hash.

**WEB-02, MEDIUM, OPEN:** ca Customer còn pageerror khi request cart cùng origin bị `Load request cancelled`. Ba control native fetch không tải JS ứng dụng (abort controller, AbortSignal.any, navigation) ghi 0 pageerror; các control có thể đọc state ghi caught=1/unhandled=0. Vì vậy chưa chứng minh generic cancellation là nguyên nhân của lỗi E2E. Không bỏ assertion, không gộp finding này vào SameSite hoặc tuyên bố đã sửa. Xem `webkit-native-cancellation-proof.json` và diagnostic Customer gốc.

Kiểm chứng HTTPS thật gồm CA/hostname, negative CA/hostname, host/path/body boundaries, CSRF/CORS, cookie flags, management port, correlation IDs và JWT hết hạn thật: xem `https-security-proof.json`. Request ID được giới hạn; error response không lộ SQL/stack. `observability-privacy-proof.json` chỉ xác nhận các log vận hành đã thực sự thu được, không phải bảo đảm cho mọi tình huống chưa chạy.

Dependency audit mới 2026-11-11T06:00:48.521563+00:00: 88 thư viện runtime, 0 tọa độ chưa xác định, 0 package có advisory OSV khớp; npm production={"info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0}; dev/full={"info": 0, "low": 0, "moderate": 7, "high": 0, "critical": 0, "total": 7}. Không tự nâng/hạ dependency. Advisory là snapshot theo thời điểm, không phải bảo đảm vĩnh viễn.

Finding mật khẩu Git cũ vẫn đóng theo xác nhận thu hồi/đổi của operator ở Giai đoạn8; không dùng credential production để xác nhận. Quét hiện tại không có hit theo các mẫu và credential đã biết; chi tiết số lượng/phạm vi trong `current-secret-scan.json`. Không sửa Git history.

Rủi ro production: limiter hiện tại theo process và thấy peer proxy; cần thiết kế trusted proxy/shared limiting trước scale. Cần key/secret manager, public TLS, DB TLS, firewall và giám sát/cảnh báo thật. Không bật forwarded trust tùy ý hoặc triển khai hạ tầng trong lượt này.

Tham khảo chính thức: [Playwright browsers](https://playwright.dev/docs/browsers), [Playwright WebKit adapter](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/webkit/wkBrowser.ts). Kết luận browser cụ thể dựa vào proof chạy thật, không suy từ tài liệu chung.

Bằng chứng mới, riêng tư: `F:/New folder/food-delivery-mysql-test/full-audit-20261111/logs/`. Không đưa credential, key, cookie, raw SQL backup hoặc log nhạy cảm lên Git.
