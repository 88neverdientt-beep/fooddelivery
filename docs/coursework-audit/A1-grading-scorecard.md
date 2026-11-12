# A1 — Bảng điểm dự kiến theo rubric 10 điểm

## Cách hiểu và giới hạn

**Ước lượng kỹ thuật bảo thủ: 4,75/10**, không phải điểm giảng viên đã chấm. Đánh giá mức sẵn sàng của bộ nộp/demo hiện có, không phải số tính năng hay chất lượng production. Audit A1 mới cung cấp bằng chứng/khuyến nghị; không mặc định mười tài liệu kiểm toán đã thay thế báo cáo BTL chính thức, ERD hoặc Data Diagram.

Dựa trên yêu cầu giảng viên do người dùng cung cấp; không có đề gốc khác, chưa rõ có bắt buộc SQL viết tay qua UI hay chấp nhận ORM tương đương. Không tự quyết thay giảng viên. DB LIVE NOT VERIFIED; demo hiện chưa khởi động. VERIFIED có thể là source/bằng chứng lịch sử đã đọc, không là test live mới.

| Tiêu chí | Tối đa | Bằng chứng hiện có | Thiếu | Trạng thái | Rủi ro | Ước lượng | Điều kiện tối đa |
|---|---:|---|---|---|---|---:|---|
| Mô tả yêu cầu dữ liệu | 1,0 | Entity/DTO/service và docs phase4/5/6/7 business rules, account roles | Một đặc tả dữ liệu thống nhất, phạm vi, quy tắc/ngoại lệ và mapping dữ liệu | PARTIAL | Vừa | 0,50 | Mô tả gắn đủ thực thể/thuộc tính/quy tắc và dẫn nguồn |
| ERD + mô hình thực thể liên kết | 2,5 | Có thể suy từ16 Entity/21 FK; chưa có artifact | ERD khái niệm, định danh, thuộc tính, bội số, optionality và thuyết minh | MISSING | Cao | 0,00 | Có ERD nhất quán nghiệp vụ/schema, giải thích các khác biệt logic/vật lý |
| Mô hình quan hệ + mô tả bảng | 2,0 | Snapshot đủ 16 DDL, inventory A1 đủ107 cột/khóa/kiểu | Data Diagram nộp bài, bộ schema-only tái lập, thuyết minh hoàn chỉnh | PARTIAL | Cao | 1,00 | Sơ đồ đúng16 bảng/21 FK, data dictionary, installer độc lập được kiểm thử an toàn |
| Kiểm tra chuẩn hóa 3NF | 1,0 | A1 phân tích16 quan hệ/CK/FD, chỉ rõ tổng dẫn xuất và expiry | Chốt FD đầy đủ, chứng minh từng bước, quyết định ngoại lệ logic/vật lý theo giảng viên | PARTIAL | Cao | 0,25 | Chứng minh rõ, không gọi mọi bảng nghiêm ngặt 3NF khi còn ngoại lệ; phương án được chấp nhận |
| Hai form và validation | 1,0 | F1 tạo Restaurant+Account; F2 thêm menu; frontend/backend/constraint; E2E/SQL cũ | Demo lại trên DB riêng đã duyệt, đối chiếu row/rollback và SQL theo cách hiểu giảng viên | PARTIAL | Vừa | 0,90 | Hai form lưu đúng, lỗi rõ, validation đa lớp và SQL/bằng chứng phù hợp |
| Một màn hình tìm kiếm | 0,5 | S1 tìm đơn có JOIN/WHERE/order/page tại MySQL; integration/E2E cũ | Đưa query/kết quả kiểm chứng vào báo cáo/demo | VERIFIED (source + lịch sử) | Thấp–vừa | 0,50 | Demo đúng filter/không kết quả/invalid và đối chiếu DB cùng phạm vi |
| Hai báo cáo | 2,0 | R1/R2 aggregate JdbcTemplate, definitions, tests; ADMIN SQL oracle độc lập cũ | Bộ SQL nộp, đối chiếu lại cả hai report/kỳ/timezone, runtime demo | PARTIAL | Vừa | 1,60 | Hai route/nội dung khác nhau, số liệu DB có căn cứ, giải thích thời gian/tiền/hủy/refund |
| **Tổng** | **10,0** | | | **PARTIAL về sẵn sàng bài nộp** | | **4,75** | Không đảm bảo đạt10 trước khi giảng viên đánh giá |

## Vì sao không tự cho điểm tối đa

178 JUnit/315 frontend hoặc 54 integrity PASS là bằng chứng kỹ thuật lịch sử; không tạo ERD, mô hình quan hệ hay chứng minh3NF. Giao diện đẹp không thay dữ liệu đã lưu. Hai trang tái dùng cùng dashboard component không tự động thành hai báo cáo độc lập; lựa chọn R1/R2 là hai role/route/aggregate riêng.

Ước lượng này còn phụ thuộc giảng viên có chấm điểm từng phần cho source/schema khi chưa có hình Data Diagram hay không; nếu chỉ chấm artifact nộp chính thức, điểm có thể thấp hơn. A1 không bịa quy tắc trừ điểm chi tiết hoặc bảo đảm4,75 là cận dưới.

## Hai cách hiểu SQL

A: chấp nhận SQL tương đương ORM → tập trung tài liệu/DDL/ERD/FD và demo, không cần đổi JPA. B: phải SQL viết tay thực thi trực tiếp → search/report đã có JdbcTemplate; hai form dùng Hibernate chưa đủ bằng chứng DML trực tiếp. Cần xác nhận script độc lập có được chấp nhận hay phải writer UI; lập đề xuất riêng sau đó. Không mặc định chuẩn B sẽ được chấp nhận hoặc âm thầm viết lại backend.

## Cơ hội nâng điểm tối thiểu

Ưu tiên phần đang mất nhiều điểm: ERD2,5; Data Diagram và gói DDL; đặc tả dữ liệu; chứng minh chuẩn hóa có ngoại lệ. Tính năng năm màn hình đã tồn tại nên chưa có căn cứ thêm frontend mới. Sau khi hoàn tất P0/P1 và rehearsal15 phút mới đề nghị chấm lại; mục tiêu10/10 không đồng nghĩa cam kết điểm.

Nguồn: [inventory](A1-database-inventory.md), [ERD review](A1-erd-relational-review.md), [normalization](A1-normalization-3nf.md), [5 screens](A1-forms-search-reports.md), [SQL](A1-sql-traceability.md). Rubric là nguyên văn các trọng số do người dùng cung cấp, không nguồn web.
