# Food Delivery Main — preflight và backup trước DDL

Ngày12/11/2026, Asia/Saigon. Phạm vi được duyệt: xác thực, kiểm tra chỉ đọc và backup logic Main; **chưa được áp dụng DDL**.

**Kết luận: BLOCKED — chưa hoàn thành preflight hoặc backup Main.** Tệp xác thực hiện có bị MySQL80 từ chối, ERROR1045. Không đủ căn cứ kết luận schema vẫn rỗng hoặc đủ điều kiện áp dụng baseline. Đã dừng truy cập Main, không thử mật khẩu khác hoặc đặt lại tài khoản.

**Cập nhật sau lượt BLOCKED,12/11/2026:** người dùng cung cấp Login Path fooddelivery_main; preflight và backup mới đã PASS, không dùng lại tệp .cnf cũ. Xem [main-preflight-backup-login-path-result.md](main-preflight-backup-login-path-result.md). Phần dưới giữ nguyên bằng chứng lịch sử của lần xác thực thất bại; chưa áp dụng DDL.

## 1. Tài liệu và kết nối

Đã đọc main-baseline-runbook, main-baseline-preparation-result và main-restore-verification-result. Gate schema/rehearsal/restore trước đó giữ nguyên kết quả; không thay thế được preflight và snapshot của Main thật.

Tệp client hiện có ngoài Git:

`F:/New folder/hanoifood-local-secrets/mysql80-readonly.cnf`

Đã kiểm tra cấu hình endpoint và ép TCP127.0.0.1:3306, database fooddelivery khi gọi client. Chỉ một lần thử xác thực, trả mã1045. Không in/lưu nội dung credential hoặc stderr xác thực nguyên văn; không có SELECT/SHOW thành công. Dịch vụ MySQL80 được kiểm tra là Running.

Mã1045 thể hiện lỗi xác thực/account-host; không đủ để kết luận riêng mật khẩu sai hoặc tài khoản không tồn tại. Quyền quản trị đã khôi phục trong Workbench không tự cập nhật thông tin trong option file này. Chưa xác minh được danh tính/quyền quản trị qua CLI.

## 2. Phần chưa thể kiểm chứng

- Hostname/UUID/datadir/version thực tế của kết nối đã xác thực.
- fooddelivery có tồn tại và vẫn không có table/view/routine/event/trigger; không có dữ liệu bất ngờ.
- Charset/collation database/server, SQL mode/strictness, InnoDB, timezone, FK/CHECK settings, TLS và các điều kiện baseline khác.
- Quyền đọc metadata/backup của operator và cách ly đúng instance Main.
- Backup nhất quán, dung lượng/checksum dump Main và khả năng xác minh snapshot Main.

Thông tin MySQL8.0.46/schema rỗng vẫn là xác nhận của người dùng; chưa được xác minh trực tiếp trong lượt này. **Không tạo file dump rỗng giả hoặc coi checksum dump rehearsal là backup Main.**

## 3. Kiểm tra DDL ngoại tuyến

Không thực thi SQL baseline. Kết quả source hiện tại:

- Đúng16 CREATE TABLE,16PK,21FK,13UNIQUE,6CHECK.
- SHA-256 của văn bản UTF-8 chuẩn hóa LF khớp manifest đã dùng trong diễn tập: `78173e7f31856cd4b8a7f8a42cc4127fc971ad8e00c176c56346e52d3fefb893`.
- SHA-256 byte thực tế của file001 hiện tại: `8a64e0e4d3cfe1d05ddac6b8e9f69fef8eb5ecda8ad3e5defa54837ae72d6b9d` (11.952byte).
- Hai hash khác nhau do biểu diễn newline; operator baseline hiện dùng hash văn bản chuẩn hóa. Không tự sửa newline hoặc DDL. Hash byte hiện tại được ghi nhận để pin artifact trước triển khai; manifest lịch sử không cung cấp một hash byte riêng để tuyên bố đối chiếu bit-for-bit.
- Không có USE, database DDL, qualified table names, INSERT/UPDATE/DELETE, CREATE USER hoặc GRANT trong file001.
- Baseline chỉ tác động database hiện tại; an toàn đích phụ thuộc operator ép đúng fooddelivery/3306, UUID và empty-schema gate. Chạy file SQL thô sẽ bỏ qua guard; chưa cho phép thực hiện.
- 15 guard unit test PASS,0FAIL; không kết nối DB. Đây là kiểm tra công cụ, không phải PASS cho Main.

Đã ghi checksum hiện tại của001/002/003 vào bằng chứng. SQL002 tạo app account và003 nạp COD không được chạy; không coi chúng là phần được duyệt trong lượt này. Chỉ hash baseline001 có mốc manifest diễn tập để đối chiếu canonical text.

## 4. Backup và bảo toàn

**Chưa tạo backup Main:** xác thực không thành công nên không chạy mysqldump hoặc operator backup.

Sau khi có xác thực hợp lệ, tiếp tục trong phạm vi đã duyệt: xác minh metadata/empty state, kiểm tra điều kiện backup, rồi mysqldump đúng fooddelivery bằng protected option file, single-transaction và các lựa chọn đã ghi trong runbook. Với database rỗng, lưu thêm SHOW CREATE DATABASE, object counts, server identity/settings và hash artifact; kiểm tra exit code, dung lượng, SHA-256 và nội dung/phạm vi dump mà không in secrets. Nếu phát hiện object hoặc dữ liệu bất ngờ phải dừng, không tự điều chỉnh scope hoặc áp dụng baseline.

Không sao chép thư mục Data đang chạy, không stop/restart MySQL80, không lock toàn server hoặc thay cấu hình. Không đọc/sửa hanoi_food. Không kết nối hoặc thay đổi3307/A2.4/rehearsal/restore. Không DDL, tạo account/grant, COD, ADMIN hoặc dữ liệu nghiệp vụ. Không sửa Java/frontend, commit/push/deploy.

## 5. Bằng chứng và bước tiếp theo

Bằng chứng không chứa secrets:

`F:/New folder/fooddelivery-main-preflight-20261112-213451/preflight-result.json`

Người dùng cần kiểm tra/cập nhật tệp .cnf cục bộ bằng thông tin của tài khoản quản trị hiện có đã xác nhận đăng nhập được qua TCP127.0.0.1:3306, hoặc cung cấp đường dẫn option file quản trị đúng khác ngoài Git. Không gửi mật khẩu vào chat, không cần tạo account hoặc reset root để thử tiếp.

Khi người dùng báo đã cập nhật, có thể tiếp tục preflight/backup theo phê duyệt hiện tại; không cần xin lại quyền cho cùng phạm vi. **Áp dụng baseline Main vẫn cần phê duyệt riêng sau kết quả preflight/backup PASS.**
