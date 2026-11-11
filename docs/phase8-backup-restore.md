# Giai đoạn 8 — Backup và restore

Diễn tập thật trên MySQL3307: source `fooddelivery_stage8_e2e`, target mới `fooddelivery_stage8_restore_final`. 16 bảng, count/hash từng dòng và constraint trùng khớp; source không đổi. Backup `stage8-final-after-load-backup.sql`, 3804412 byte, SHA256 `508ef0ae523b7f8cf2991c7b3fd0024796e6a0927cb97ed2fab50ad43f9f8232`.

Backup chỉ giữ trong thư mục thử nghiệm, chứa dữ liệu nhạy cảm của fixture, không đưa vào artifact phát hành hoặc Git. Bản cố ý làm hỏng bị chặn bằng checksum trước import. Target/user phải chưa tồn tại; không ghi đè database có sẵn.

Bản restore đầu `fooddelivery_stage8_restore` được giữ nguyên. Sau bài tải cuối, backup mới được diễn tập vào `fooddelivery_stage8_restore_final` với user riêng, không ghi đè bản đầu hoặc các schema Giai đoạn 1–7.

Ứng dụng hiện tại khởi động thật trên bản restore bằng tài khoản SELECT-only và Hibernate validate; health UP, không chạy ddl-auto=update. Tiến trình validate đã dừng. FK chỉ tham chiếu trong đúng database restore; bốn cột version được xác minh.

Rollback ứng dụng/cấu hình: `runtime-rollback-recovery-proof.json` kiểm tra bản cũ đọc được expanded schema, sau đó phục hồi artifact/config mới và session vẫn hợp lệ, business row digest không đổi. Bản cũ có dependency đã biết lỗi nên chỉ dùng local read-compatibility, KHÔNG phải rollback candidate được duyệt cho public.

Thử incomplete mutation bị dừng trước khi writer nhận đủ body không làm đổi dữ liệu; đây không phải bằng chứng hủy an toàn một writer đã chạy hoặc production graceful draining. Cấu hình key sai phải startup thất bại, không fallback key. Migration mở rộng giữ lại cột khi rollback app; không tự DROP cột có dữ liệu.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-20261110/logs/`. Không đưa credential, private key hoặc SQL backup vào Git.
