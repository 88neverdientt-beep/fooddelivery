# A1 — Sẵn sàng demo15 phút

**PARTIAL. Chưa sẵn sàng diễn tập live trong A1.** Có đủ năm implementation và bằng chứng lịch sử; ERD/Data Diagram đang MISSING, phần3NF chưa hoàn chỉnh, DB test dừng, không khởi động ứng dụng. Không có thao tác ghi dữ liệu nào trong A1.

## Kịch bản đề xuất đúng15 phút (chỉ thực hiện ở A2 khi được duyệt)

| Thời gian | Nội dung | Thao tác/điểm nhấn | Trạng thái hiện tại |
|---|---|---|---|
| 00:00–01:00 | Nghiệp vụ và dữ liệu | Bốn role; catalog/menu, đặt/giao/COD, auth hỗ trợ | Source/definitions có; cần đặc tả thống nhất |
| 01:00–03:00 | ERD | Định danh, bội số, N–N qua menu/detail; optional Delivery | MISSING artifact, không tự vẽ A1 |
| 03:00–04:30 | Mô hình quan hệ | PK/FK/UK/CHECK,16 bảng và ví dụ DECIMAL/NULL | Inventory có; Data Diagram MISSING |
| 04:30–06:00 | Chuẩn hóa | CK/FD, menu khóa ghép, giá snapshot và ngoại lệ tổng dẫn xuất | PARTIAL, cần chốt cách trình bày với giảng viên |
| 06:00–07:30 | F1 tạo nhà hàng | ADMIN /admin/restaurants/new; một invalid ngắn, sửa đúng, POST201; SELECT Account/profile không secret | Có UI/API/E2E cũ, live NOT VERIFIED |
| 07:30–09:00 | F2 thêm menu | Chuyển session RESTAURANT có sẵn; /restaurant/menu/new; chọn catalog chưa thêm, giá sai rồi đúng; SELECT menu | Có implementation/test cũ; không tạo catalog mới từ form này |
| 09:00–10:30 | S1 tìm đơn | /restaurant/orders; mã/tên khách, status/kỳ, query COUNT/ID và phân trang; thửkhôngkếtquả | Có JdbcTemplate/JPQL thật |
| 10:30–12:00 | R1 nhà hàng | /restaurant/analytics; kỳ có dữ liệu, total/state và giá trị món/shipriêng; SQL GROUP BY | Có aggregate/tests; chưa live A1 |
| 12:00–13:30 | R2 ADMIN | Session ADMIN /admin/analytics; tiềnSUCCESS/COMPLETED, ngày paidAt và ratio null | Có oracleSQLlịch sử, live NOT VERIFIED |
| 13:30–15:00 | SQL và kết luận | Giải thích INSERT ORM vs SQLtay, JOIN/GROUP BY, một query đối chiếu và các giới hạn | Trace có, góiSQLnộp chưa có |

## Chuẩn bị tối thiểu trước buổi demo

- Hoàn tất P0 A2: đặc tả, ERD, Data Diagram, normalization và bộSQL được giảng viên chấp nhận. Không lấy testPASS thay thuyết minh.
- Duyệt môi trường demo độc lập, xác minh target trước mọi ghi. Không dùng3306/fooddelivery cũ hoặc khởi động với ddl-auto=update. Sau bootstrap được duyệt dùng validate. Credential/key ngoài Git và ngoài màn hình trình chiếu.
- Có ADMIN hợp lệ và RESTAURANT có dữ liệu; không mật khẩu mặc định. Có thể dùng hai browser profile/session riêng sau khi được phép, tránh đổi role nhiều. Không xuất fixture credential vào báo cáo.
- F1 tạo nhà hàng mới tách khỏi nhà hàng dùng R1: hồ sơ mới chưa có đơn. F2 cần catalog chưa gắn; không bịa chức năng tạo catalogReact chưa có. Nếu hếtcatalog thì chọn form Driver hiện có làm dự phòng sau xác nhận tính tương đương.
- Chọn kỳ dữ liệu thật trong DBdemo; không cố định ngày hiện tại khi dữ liệu mẫu cũ. Dùng giờ nghiệp vụ backend và boundary nửa mở. Không gọi gross value là lợi nhuận.
- Mỗi màn hình có query đối chiếu không secret/IDresponse. SQL minh họa chưa chạy phải ghi rõ, không dựng output giả. Đối chiếu raw rows Decimal cho report.

## Kiểm chứng và phương án lỗi

Không đo được rehearsal15 phút trong A1. Đề nghị A2 chạy đồng hồ một lượt trên Chromium, lưu HTTPstatus/IDvừađủ và log đã lọc. Một lỗi network không tự gửi lại POST; UI có cơ chế đối chiếu trạng thái. Nếu backend chưa chạy, dùng evidence lịch sử như phụ lục và nói rõ chưa live, không phát video/ảnh như thao tác hiện tại.

Windows WebKit/Safari/productioninfra là Hướng B, không cản chấm BTL nếu môi trường trình bày được chọn phù hợp. Tuy nhiên không vì vậy tuyên bố các blockerproduction đã đóng.

Nguồn: [năm màn hình](A1-forms-search-reports.md), [SQL trace](A1-sql-traceability.md), [backlog](A1-phase-A2-backlog.md), frontend/e2e/admin.spec.ts:186 và frontend/e2e/restaurant.spec.ts:169. Kịch bản chỉ dùng route/feature thực tế; không có live ghiA1.
