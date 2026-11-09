# Bảo mật và đồng thời Driver Management

Bốn GET đã được người dùng phê duyệt riêng; CurrentActor scope, DRIVER-only, page tối đa50. Inventory69endpoint/59business/10auth; ma trận6actor414tổ hợp. Giữ assertion denied requests không sửa dữ liệu. Không bật ADMIN impersonation, không nhận owner từ URL/query để đổi phạm vi. Có test giả driverId query và strict DTO forged body; DriverA không đọc/sửa DriverB hoặc unassigned detail, Customer/Restaurant/Admin bị403 với management.

Các nguồn dữ liệu public khác không bị thay quyền. Pool available chỉ năm trường an toàn; không expose customer/dropoff/payment trước nhận. Detail owner predicate và projection, không token/hash/session/email/contact ngoài hợp đồng. Những GET đọc owner không đòi driveStatus=true để Driver đang ngừng nhận vẫn hoàn tất việc; pool/accept giữ active check.

Frontend role guard, private cache key theo account+driver, generation bound mutation/recovery/navigation, no storage tokens. Login/reload refresh/logout/switchDriverB và truy cập URL DriverA được kiểm thử thực. Auth/CSRF/refresh/replay/revoke/password/role/limiter suite cũ chạy lại; không tạo refresh flow riêng.

Concurrency: hai accept cùng ID một200/một409; hai pickup update một200/một409; hai tab giữ trạng thái thật sau stale409; accept/cancel kết quả cancelled nhất quán. Not-ready pickup và invalid skip409, unknown enum400, unassigned/otherDriver404. Chưa có API unassign/reassign, vì thế không giả thao tác phân công lại; negative fixture/unassigned kiểm tra cùng ownership predicate, không SQL bypass E2E.

SQL hậu kiểm phát hiện race confirm/cancel mà assertion E2E cũ chỉ kiểm Order/Payment đã bỏ sót. Người dùng phê duyệt bổ sung current locking read Delivery trong cancelOrder, giữ Order→Delivery. Test MySQL chủ động tạo snapshot REPEATABLE_READ trước confirm chứng minh FAIL trước sửa; test khác giữ driver đã accept sau snapshot. Unit test kiểm thứ tự khóa, E2E Restaurant bổ sung assertion Delivery CANCELLED. Ba dòng QA lỗi trước sửa, gồm Order9840, được giữ nguyên theo yêu cầu; audit toàn database phải không xuất hiện dòng lỗi mới. Không sửa dữ liệu để đạt PASS.

Fault injection trong test: chuyển request thật đến backend, đọc200 rồi cắt response tại browser. DELIVERED vẫn đúng COD/Order/Delivery, chỉ một PUT; accept chỉ một POST, GET cũng lỗi thì khóa nhận đến khi xác minh own detail. Không lấy mock response làm bằng chứng nghiệp vụ. Console guard chỉ loại auth401/ownership404/network fault ở endpoint và scenario tương ứng; không tắt lỗi JS chung.

Các screenshot/evidence chỉ dữ liệu QA giả, không chụp form có password/token, trace/video tắt. Secret scan không in giá trị secret và kiểm source/dist/docs/log; ngoài Git lưu credentials/config test riêng. Không pentest độc lập hoặc chứng nhận bảo mật production. Xem phase6-test-results.md cho kết quả nghiệm thu cuối.
