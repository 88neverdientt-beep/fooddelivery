# Giai đoạn 8 — SEC-02: dependency security patches

OSV query theo88JAR trong artifact baseline:87tọa độ xác định,1jarMode tools cần phân loại. Jackson core/databind3.1.5 có7advisory, Tomcat11.0.24 có4advisory trong snapshot OSV. Severity danh mục có HIGH/CRITICAL; exploitability phụ thuộc cấu hình (FORM/DIGEST auth bị tắt, HTTP2/TLS/SNI không bật trên connector staging nội bộ, DTO không bật polymorphic default typing). Không gọi version-match là bằng chứng bị khai thác.

Bản sửa tối thiểu: override jackson-bom.version3.1.7 và tomcat.version11.0.27 bằng property BOM Spring Boot hỗ trợ. Giữ Spring Boot4.1.1, Java25, toàn bộ dependency khai báo và major/minor API. Dùng cache đã có; không thêm framework hoặc chạy npm audit fix/downgrade theo gợi ý mù quáng. Cần chạy lại đầy đủ unit/security/MySQL/HTTP/E2E/build và quét artifact cuối. Rollback artifact/config sang bản baseline giữ nguyên4cột version (expand-only), không DROP hoặc reset dữ liệu.

Nguồn chính: [Apache Tomcat security](https://tomcat.apache.org/security-11.html), [Jackson advisory](https://github.com/advisories/GHSA-cxp5-3px4-pw24), [OSV API](https://google.github.io/osv.dev/api/). Log chi tiết outside Git tại logs/backend-advisory-details.json, backend-osv-audit-initial.json.

npm audit hiện7moderate trong dependency lint/dev từ minimatch, không HIGH/CRITICAL. Không đưa devtool vào dist/runtime và không chạy lint trên input untrusted ở privileged runner; cần ghi nhận ở readiness, không tuyên bố tất cả dependency sạch. Sẽ quét omit-dev riêng. Gợi ý npm đổi typescript-eslint theo major có dấu hiệu downgrade không tự áp.
