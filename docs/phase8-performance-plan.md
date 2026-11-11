# Giai đoạn 8 — Đề xuất tải và SLO đã được người dùng phê duyệt

Môi trường: một máy Windows đang dùng, JVM25/MySQL8 riêng3307 Stage8, loopback, không đại diện năng lực production. Không load3306 hoặc dịch vụ ngoài. Đo exploratory trước khi phê duyệt nhưng KHÔNG kết luận performance PASS khi chưa duyệt SLO.

Đề xuất acceptance smoke có giới hạn: warm-up10s, lần lượt1/3/5virtual users, tối đa30s/mức/nhóm và tối đa3000request toàn bộ; tối đa500Order mới, dừng nếu free disk<5GiB, CPU>85% kéo dài10s, processworking-set>2GiB, HTTP5xx/timeouts>5% cửa sổ20request, pool pending tăng hoặc backend không healthy. Không stress vô hạn. JVM heap512MiB–1GiB, Hikari max10 trong phiên test riêng; không đổi máy/production.

Kịch bản: listing/menu/cart/checkout/orders/restaurant dashboard/driver deliveries/admin analytics; login tách riêng≤8attempt/email và≤80/IP/15phút, giữ limiter cũ. Chỉ dùng fixture random và API hợp lệ, không mock/sửa DB vượt rule. Mỗi worker own Customer/cart; không dùng chung giỏ để vô tình đo409 như thành công.

SLO đề nghị cho smoke loopback5VU: API đọc p95≤750ms,p99≤1500ms; checkout p95≤1500ms,p99≤3000ms; login BCrypt12 tuần tự p95≤2000ms; unexpected5xx/timeout0%, business invariants0violation; HTTP429/409 cố ý tách khỏi latency/error thành công. Báo p50/p95/p99/throughput/sample count/errors/CPU/memory/DBpool và context; throughput chỉ quan sát, không tự suy TPS production. Nếu máy không đủ tài nguyên thì báo inconclusive, không hạ ngưỡng để PASS.

Tải production dự kiến, cấu hình hosting, mạng và dataset chưa có. SLO này chỉ là gate thực nghiệm cho staging cục bộ; chưa thay thế capacity planning và SLO production.

Người dùng đã phê duyệt phương án trong phiên10/11/2026. Không có phê duyệt migration production hoặc deployment.
