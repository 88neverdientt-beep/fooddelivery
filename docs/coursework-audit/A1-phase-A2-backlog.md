# A1 — Backlog A2 đề xuất, CHƯA triển khai

A1 dừng ở kiểm toán. Các đường dẫn đích mới dưới đây là dự kiến cho A2, chưa tạo. Chỉ bắt đầu A2 sau phê duyệt; mọi thay đổi schema/writer hoặc tạo/chạy môi trường ghi cần xác định phạm vi riêng. Không đưa production/Safari/WebKit vào P0 BTL.

## P0 — Bắt buộc để đáp ứng bài nộp

| ID / rubric | Vấn đề và bằng chứng | Ưu tiên | File/module dự kiến | Sửa tối thiểu | Rủi ro | Kiểm chứng / điều kiện hoàn thành |
|---|---|---|---|---|---|---|
| A2-01 / SQL, forms | Chưa rõ giảng viên chấp nhận ORM tương đương hay bắt buộc DML trực tiếp; xem A1 SQL | P0 | Báo cáo BTL, xác nhận yêu cầu | Chốt A hoặc B, script hay writer UI; không hỏi lại quyền đọc | Hiểu sai yêu cầu dẫn rewrite không cần | Có kết luận được giảng viên/người phụ trách xác nhận; mapping5 màn hình theo cách hiểu đó |
| A2-02 / 1,0đ yêu cầu dữ liệu | Quy tắc nằm rải rác docs phase4–7/service, chưa một đặc tả | P0 | docs/coursework (dự kiến), business definitions | Viết phạm vi, bốn actor, danh mục dữ liệu/quy tắc bắt buộc/ngoại lệ và trace | Bịa rule như plate UNIQUE/rating/order FK | Mỗi yêu cầu gắn entity/constraint/service; không mâu thuẫn snapshot |
| A2-03 / 2,5đ ERD | ERD MISSING,16 Entity/21 FK là nguồn | P0 | Artifact ERD khái niệm + thuyết minh dự kiến | Vẽ từ mô hình thật, định danh/thuộc tính/bội số, tách auth hỗ trợ nếu cần | Nhầm nullable SQL với bắt buộc nghiệp vụ | Đối chiếu16 thực thể, quan hệ trung gian và21 FK; mô tả logical vs physical |
| A2-04 / 2,0đ mô hình quan hệ | Data Diagram MISSING; inventory107 cột | P0 | Data Diagram/data dictionary dự kiến | Vẽ16 bảng đúng cột/PK/UK/FK/kiểu/CHECK; dùng inventory làm nguồn | Bỏ bảng auth/version hoặc tạo bảng category không tồn tại | Checklist16/107/21/13/6, không có quan hệ giả |
| A2-05 / cài CSDL, mô hình | Repo chỉ manual auth/version, thiếu base DDL/CREATE DATABASE | P0 | database/coursework schema-only + README dự kiến | Biên soạn installer schema đầy đủ không data/secrets; không dùng update/create ORM với DB cũ | DDL implicit commit, guard schema cũ, rò hash trong full dump | Review và chạy chỉ DB demo mới được duyệt, sau tạo dùng validate, FK/UK/CHECK/index đúng, không tác động schema cũ |
| A2-06 / 1,0đ3NF | NF-01/02 tổng tiền dẫn xuất; NF-03 expiry chính sách chưa chốt | P0 | Phần CK/FD/1NF→3NF báo cáo | Chứng minh mô hình logic, công khai denormalization vật lý; xác nhận giảng viên chấp nhận hay đòi migration | Xóa snapshot/đổi giá hoặc tự tuyên bố3NF | Đủ16 quan hệ, mọi CK/FD có rule; quyết định ngoại lệ rõ. Nếu cần đổi vật lý: đề xuất riêng và chờ duyệt |
| A2-07 / SQL5 màn hình | Trace có ở A1 nhưng chưa gói SQL nộp/thực thi | P0 | Bộ SQL giải thích/demonstration dự kiến | Tách DML ORM tương đương và SQL JdbcTemplate thực; bind/WHERE/JOIN/group/order/time | Gọi minh họa là SQLruntime, plaintext trong SQL | Có5chuỗi trace, query tương ứng, và evidence theo lựa chọnA/B; nếuB cần writer: chỉ đề xuất phạm vi trước |
| A2-08 / forms/search/report/demo | Năm màn hình có implementation, DB test đang dừng, live NOT VERIFIED | P0 | Runtime demo độc lập + runbook dự kiến; không sửa configdev/prod | Trình bày target/datadir/user/ports/secret ngoại repo, chỉ khởi động/tạo khi được duyệt; dùng dữ liệu synthetic phù hợp | Ghi nhầm3306/schema cũ, demo báo cáo rỗng | Xác minh isolation, validate; hai form lưu/validate, search IDs/count và hai aggregate so raw rows Decimal; không dùng full backup chứa credential làm seed công khai |
| A2-09 / demo15 phút và báo cáo | Chưa có ERD/diagram và chưa rehearsal đồng hồ | P0 | Báo cáo BTL cuối + demo runbook dự kiến | Ghép yêu cầu→ERD→quan hệ→3NF→5 screens→SQL, tập15 phút trên targetđãduyệt | Quá giờ/đổi role/cửa sổ SQL lộ secret | Hoàn thành checklist trong15 phút; backup/khôi phục chỉ môi trường demo, log tối thiểu đã lọc secrets |

## P1 — Chất lượng và bằng chứng

| ID / rubric | Vấn đề và bằng chứng | Ưu tiên | File/module dự kiến | Phương án tối thiểu | Rủi ro | Kiểm chứng / hoàn thành |
|---|---|---|---|---|---|---|
| A2-10 / forms/report | R1 source chỉ COMPLETED/SUCCESS; R2 thêm amount equality; nullability mạnh/yếu khác rule | P1 | Reporting definitions và appendix | Giải thích khác biệt; kiểm dữ liệu demo hợp lệ, không tự đổi KPI | Gọi giá trị món là lợi nhuận/thực nhận | Người trình bày nêu đúng paidAt/createdAt, shipping/refund và phạm vi counts |
| A2-11 / 3NF/constraints | FoodItem name không UNIQUE; cart/menu thiếu UNIQUE; quantity/score/price thiếu CHECK | P1 | Domain specification, test/migration proposal nếu cần | Chốt quy tắc rồi mới đề xuất enforce tối thiểu và preflight | Thêm constraint sai hoặc thất bại trên dữ liệu cũ | Có rule và preflight; không tự migration. Chỉ nâng P0 nếu giảng viên yêu cầu hoặc demo thực tế thất bại |
| A2-12 / tài liệu | README manual còn bối cảnh Stage2 defaultfalse;7report8.2 untracked ở baseline | P1 | Hướng dẫn nộp và danh sách đóng gói | Giải thích config hiện tại và bảo đảm artifact nộp được bao gồm; không commit tự động | Nộp thiếufile/chép secrets | Checklist gói nộp đầy đủ, source/hash đúng, lịch sử cũ giữ nguyên |
| A2-13 / demo | Form mới tạo nhà hàng chưa có đơn, không thể ngay có revenue | P1 | Demo data plan/runbook dự kiến | Dùng account Restaurant đã có tập đơn cho R1, F1 tạo profile riêng; chọn món catalog chưa thêm | Tạo số liệu giả/trộn kỳ | Chọn sẵn kỳ có dữ liệu thực của fixture đã duyệt, không bịa số trên UI |
| A2-14 / bằng chứng | Artifact cũ có thể khác snapshot ở thời điểm trước load | P1 | Evidence index/report appendix | Ghi rõ root/timestamp/hash, không ghép counts khác thời điểm | Nhầm2187 và2417order; coi copyJUnit là runmới | Số liệu mỗi bảng gắn đúng nguồn; SHAmanifest, đọc lại sau demo |

## P2 — Sau bài nộp hoặc Hướng B

| ID | Vấn đề/bằng chứng | Phạm vi dự kiến | Phương án / rủi ro | Điều kiện hoàn thành |
|---|---|---|---|---|
| B-01 | NativeSafari chưa chạy; WindowsWebKit SameSite cònFAIL | Browser runtime/E2E, Hướng B | Có runtime/thử nghiệm riêng; không hạ cookie/CSRF | Safari thật và gateWindows đúng; không phải điều kiện P0 BTL |
| B-02 | Production infra chưa xác minh | Deploy/CI/monitoring/backup/secret manager | Dự án triển khai riêng có quyền/target; không đụng vận hành trongA2tài liệu | Đạt proofproduction riêng, không dùng localPASS thay thế |
| B-03 | 7moderate dev advisory8.2 | Toolchain, Hướng B | Nâng tương thích có regression riêng, không force/bulk | Audit lại và đủtest; không yêu cầu đổi dependency trongA1 |
| B-04 | Thương mại, payout/GPS/tải lớn | NgoàiBtl | Chỉ làm khi yêu cầu mới | Không đưa vào mục tiêu10điểm hiện tại |

## Thứ tự phụ thuộc và cửa phê duyệt

A2-01→02→03/04/06→05/07→08→09;10–14 hỗ trợ. Chưa có lý do viết frontend mới: năm màn hình đã tồn tại. A2 ưu tiên tài liệu và bộ SQL; thay writer/schema chỉ khi có yêu cầu rõ và được duyệt. Đạt checklist chứng minh kỹ thuật không bảo đảm điểm thực tế do giảng viên quyết định.
