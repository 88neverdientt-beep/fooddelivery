# Giai đoạn 8 — Browser và responsive

Ma trận chính: 204/210 PASS, 6 FAIL, 0 SKIPPED; gate FAIL. Cả ba engine qua HTTPS cục bộ, một worker, không retry. Giữ đủ báo cáo của các lượt thất bại trước đó; không gộp test của artifact khác để báo xanh.

- chromium/admin: PASS 20, FAIL 0, SKIPPED 0, flaky 0, global errors 0
- chromium/driver: PASS 16, FAIL 0, SKIPPED 0, flaky 0, global errors 0
- chromium/regression: PASS 34, FAIL 0, SKIPPED 0, flaky 0, global errors 0
- firefox/admin: PASS 20, FAIL 0, SKIPPED 0, flaky 0, global errors 0
- firefox/driver: PASS 16, FAIL 0, SKIPPED 0, flaky 0, global errors 0
- firefox/regression: PASS 34, FAIL 0, SKIPPED 0, flaky 0, global errors 0
- webkit/admin: PASS 19, FAIL 1, SKIPPED 0, flaky 0, global errors 0
- webkit/driver: PASS 14, FAIL 2, SKIPPED 0, flaky 0, global errors 0
- webkit/regression: PASS 31, FAIL 3, SKIPPED 0, flaky 0, global errors 0

Ma trận riêng strict CAS/HTTP/cart: 11/12 PASS, 1 FAIL, 0 SKIPPED. Không trộn backend strict với bộ test compatibility.

Kích thước được kiểm tra: 375, 768, 1024 và 1440 px, gồm trang công khai, form, workspace bốn role, menu mobile, dialog/focus và horizontal overflow. Đây là kiểm tra tự động theo assertion và ảnh chụp, không thay thế kiểm thử thủ công bằng screen reader hoặc thiết bị thật.

Lỗi thật đã sửa: Zod JIT chạm `new Function` dưới CSP; menu catalog không co trên Firefox mobile; snapshot auth được publish đồng nhất ở Provider; WebKit pointer không focus nút menu trước Escape. Các unit test tái hiện đỏ rồi xanh được giữ trong evidence.

Lượt tiếp theo phát hiện trang chủ bị kẹt loading: auth restore xóa cả query công khai đang chờ. Ba regression mới FAIL trước sửa và PASS sau sửa; frontend hiện 309 tests. Policy mới chỉ giữ tám nhóm query công khai đã rà soát; query riêng tư/không nhận diện vẫn bị hủy và loại bỏ, mutation cache vẫn được xóa. Dữ liệu riêng tư đến muộn không được đưa lại vào cache. Toàn bộ ma trận được chạy lại trên build đã sửa, không cộng kết quả build cũ.

Chẩn đoán bổ sung Firefox: lỗi `error loading dynamically imported module` đi cùng `NS_BINDING_ABORTED` của AuthPages và module phụ do test chuyển trang cứng sau logout trước khi lazy route render xong. Helper nay chờ heading đăng nhập; không bỏ console assertion hoặc thêm sleep tùy ý. Lượt cũ và chẩn đoán request đều được giữ.

Hai điểm đồng bộ khác được tăng assertion: chỉ reload chi tiết đơn sau khi heading đơn đã render; ở ca trang công khai/mất mạng, chờ refresh guest trả 401 trước lần hard navigation tiếp theo. Log trước sửa ghi CSRF `Load request cancelled`/module preload bị hủy. Các nhóm hồi quy bị ảnh hưởng được chạy lại đầy đủ trên ba engine, giữ nguyên các nhóm Admin/Driver không thay đổi và cùng artifact ứng dụng. Không tự quy lỗi cookie thành lỗi ứng dụng hoặc ngược lại.

Finding WebKit 27.2 trên Windows: server gửi refresh cookie Strict/Secure/HttpOnly đúng cấu hình, nhưng runtime quan sát SameSite=None và phép thử observer phía server thấy Strict sentinel/refresh được gửi khi chuyển site 127.0.0.1→localhost. Positive control None cũng được kiểm tra. `webkit-cookie-server-observation.json` là bằng chứng chính; phép thử introspection ban đầu không đủ kết luận đã được đánh dấu superseded. Không hạ cookie thành None hoặc làm yếu assertion. Chưa suy rộng lỗi sang mọi Safari.

Các assertion phía sau điểm thất bại của một test chưa được thực thi; không suy PASS cho phần luồng WebKit bị chặn sớm. Nếu test đồng thời có log console, giữ cả log để retest, không tự xóa vì có finding cookie.

Một lượt cũ có ca nhà hàng 1440px nhận 429; lượt đó được giữ trong archive. Ca đối chiếu riêng đạt 1/1 PASS (`webkit-restaurant-1440-fixture-isolation.json`), nhưng không được dùng để thay thế kết quả ma trận. Ma trận cuối chạy lại đầy đủ với cách phân nhóm fixture được mô tả dưới đây. LoginLimiter vẫn giữ 10 lần/email, 100 lần/IP trong 900 giây; không nới chính sách ứng dụng để báo xanh.

Runner cuối phân 34 ca WebKit hồi quy thành sáu nhóm tuần tự với backend mới giữa các nhóm, giữ nguyên dữ liệu đã commit. Profile-cookie được tách riêng để worker khởi tạo lại sau FAIL không dùng hết ngân sách login của chín ca nhà hàng còn lại. Proof xác minh đủ 34 case ID duy nhất, không lặp/bỏ ca, không đổi limiter hoặc sửa dữ liệu để làm xanh. Không còn FAIL 429 trong báo cáo cuối; finding fixture cũ giữ trong archive.

Cần chạy lại trên WebKit macOS/Linux hoặc Safari thật trong môi trường được phép trước khi đóng gate SameSite. Các ca còn FAIL khác phải được xử lý theo báo cáo gốc, không coi tất cả đều do cookie.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-20261110/logs/`. Không đưa credential, private key hoặc SQL backup vào Git.
