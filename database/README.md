# Food Delivery — SQL theo mục đích

Đây là vị trí SQL chuẩn sau sắp xếp ngày12/11/2026. Chỉ đổi đường dẫn; byte của7 SQL và schema-reference.json giữ nguyên. Không có script nào tự chạy lúc backend khởi động.

**Main đã áp dụng baseline001 và setup app/COD theo các phê duyệt riêng:** schema16 bảng, chỉ payment_methods có1COD active;15 bảng khác rỗng. fooddelivery_app chỉ có4DML trên fooddelivery.*; JPA/repository PASS, chưa ADMIN/website. Không chạy lại baseline hoặc setup. Xem [baseline](../docs/coursework/main-baseline-apply-result.md) và [app/COD](../docs/coursework/main-app-cod-setup-result.md).

```text
database/
├── baseline/001_fooddelivery_baseline.sql
├── setup/002_fooddelivery_app.sql
├── setup/003_cod.sql
├── migrations/00_preflight_readonly.sql
├── migrations/01_expand_auth.sql
├── migrations/02_backfill_accounts.sql
├── migrations/03_stage8_versions.sql
├── schema-reference.json
└── README.md
```

## Baseline Main mới

[baseline/001_fooddelivery_baseline.sql](baseline/001_fooddelivery_baseline.sql) tạo16 bảng theo manifest [schema-reference.json](schema-reference.json), mốc16PK/21FK/13UNIQUE/6CHECK. Chỉ dùng operator `tools/deployment/mysql_baseline.py` sau phê duyệt DDL riêng; không SOURCE/paste SQL thô bỏ guard. Không chạy create/update qua Hibernate; runtime vẫn ddl-auto=validate.

Operator và các công cụ kiểm tra đọc vị trí mới từ project root. Operator Main nay nhận Login Path fooddelivery_main dưới HIEU, giữ đầy đủ guard/backup/restore proof và attempt journal; không dùng tệp xác thực cũ. Chỉ dùng action verify để đọc lại schema sau baseline, không empty-schema preflight/apply. Lượt sắp xếp trước không chạy DDL; baseline được thực hiện trong bước đã phê duyệt sau đó.

## Setup chỉ sau phê duyệt riêng

Main đã hoàn tất setup bằng tools/deployment/setup_main.py sau phê duyệt riêng, dùng hai file SQL nguyên bản và Login Path của operator. Credential ngoài Git được giữ riêng; không chạy lại hai script hoặc reset user hiện có. Comment CLI trong SQL là hướng dẫn operator gốc; với Main đọc runbook/setup report mới nhất.

[setup/002_fooddelivery_app.sql](setup/002_fooddelivery_app.sql) tạo tài khoản DML; operator bắt mật khẩu RANDOM PASSWORD vào file bảo vệ ngoài Git, không chạy trực tiếp vì result set chứa credential. [setup/003_cod.sql](setup/003_cod.sql) là dữ liệu cấu hình COD. Không tự chạy hai file này hoặc ADMIN bootstrap sau baseline.

## Migration lịch sử

Bốn file trong migrations/ giữ nguyên guard database/port/datadir3307 đã được duyệt trước. Chúng không phải baseline cho fooddelivery rỗng trên3306 và không được bỏ guard để chạy trên Main. Không đổi tên/nội dung SQL, không backfill dữ liệu test vào Main.

Maven chỉ copy migrations/*.sql vào test classpath database/migrations; không đóng gói các migration thủ công thành main application resources. AuthMigrationMySqlTest dùng classpath mới và giữ nguyên opt-in/target guard/assertion. Không kích hoạt integration writer chỉ để kiểm tra di chuyển file.

## Bằng chứng và kiểm thử

Checksum trước/sau: [sql-reorganization-checksums.json](../docs/coursework/sql-reorganization-checksums.json). Chạy ngoại tuyến từ project root:

```text
python -B -m unittest discover -s tools/deployment -p "test_*.py"
```

Runbook hiện tại: [main-baseline-runbook.md](../docs/coursework/main-baseline-runbook.md). Backup Main tại F:/New folder/fooddelivery-main-backups/20261112-LoginPath-01 là immutable evidence của thời điểm trước di chuyển, không cập nhật đường dẫn hoặc sửa metadata/hash trong đó. Các snapshot Git/hash và artifact diễn tập cũ cũng giữ nguyên; dùng mapping checksum để đối chiếu đường dẫn hiện tại.

## Hướng dẫn Stage2 gốc — chỉ để đối chiếu lịch sử

Phần dưới là nội dung hướng dẫn trước đây. Các phát biểu về default auth/security ở Stage2 là trạng thái lịch sử; source hiện tại đã bật auth persistence và JWT. Đường dẫn file SQL tương ứng hiện nằm trong migrations/. Không lấy hướng dẫn lịch sử làm phê duyệt triển khai Main.

# Stage 2, step 1: manual auth migration

No script runs on application startup. No Flyway/Liquibase dependency is introduced.

1. Stop profile writers; retain a verified backup. Use only the approved isolated MySQL
   instance on port 3307, schema fooddelivery_stage2_rehearsal and its separate datadir.
2. Run `00_preflight_readonly.sql` or `AuthMigrationPreflight`. All email/hash/ID findings
   must be resolved with approval BEFORE installing helper routines or running DDL.
   Counts/references may be reported; never print credentials or hashes.
3. Run `01_expand_auth.sql` using a migration operator scoped to this TEST schema,
   then `02_backfill_accounts.sql`, without mysql --force. Routine creation requires
   CREATE ROUTINE/ALTER ROUTINE; the application account must not have these rights.
4. Inspect the new schema, record counts and verify each Account matches exactly one
   role/profile. Hashes are copied verbatim; never hash a hash or auto-convert invalid data.
5. Enable `fooddelivery.auth.persistence-enabled=true` ONLY after successful migration,
   with Hibernate ddl-auto=validate. Default false preserves Stage 1's 13-entity schema.
   Existing SecurityConfiguration and business endpoints are unchanged in this step.
6. Run opt-in tests with RUN_STAGE2_AUTH_SCHEMA_TESTS=true, STAGE2_MYSQL_PASSWORD
   (stage2_app, DML only) and STAGE2_MIGRATION_PASSWORD (stage2_migrator, scoped DDL).
   Stage 1 regression writes use this SAME rehearsal database, RUN_STAGE1_MYSQL_TESTS=true,
   and auth persistence disabled. STAGE1_MYSQL_PASSWORD is used ONLY by the read-only
   incident preflight against the retained fooddelivery_stage1_test. Never run regression
   writes on that retained database. All contexts use ddl-auto=validate.
7. Save table checksums/DDL/row counts before and immediately after migration, before
   regressions create additional fixtures. Compare original business IDs/FKs and data.
   Negative migration tests install the exact guarded routines in the rehearsal schema,
   use rollback-only invalid fixtures, and remove the test helper routines afterwards.

Email policy is conservative ASCII syntax, trimmed/lowercased, globally unique. Any
unsupported legacy email needs manual resolution, not lossy conversion. BCrypt checks
validate format/cost, not ownership or knowledge of the original password.

The read-only Java preflight allows both approved test schemas; write migration scripts
permit ONLY fooddelivery_stage2_rehearsal on 3307 and the approved separate datadir.

The scripts fail on existing/partial auth tables. DDL has implicit commits: if interrupted,
stop and inspect; do not drop tables, reset data, or rerun blindly. A failed CALL can leave
its helper routine; inspect it before approved removal. No rollback script drops data.
Backfill is transactional, requires empty auth tables and never modifies legacy rows.
The exact test-target guard must not be removed for production without separate approval.

This step does NOT alter/delete old password columns, create ADMIN, issue JWTs, or enable
mandatory authentication. Schema migration on the current development database is NOT authorized.


## Version04 — thực đơn độc lập và ảnh (chưa áp dụng Main)

`migrations/04_independent_menu.sql` là migration nghiệp vụ mới, không phải migration lịch sử đã được bao gồm trong baseline001. Source mới cần baseline001 +04; Main đang chạy artifact cũ vẫn dùng schema baseline. Không tự chạy04 khi ứng dụng khởi động; không Flyway/Liquibase, không update/create.

Version04 thêm image_key, menu version/creation_key và hai UNIQUE; clone FoodItem dùng chung nhưng giữ menuID/giá/cart/order FK. `schema-reference-independent-menu.json` mô tả schema sau04; không ghi đè schema-reference.json baseline đã nghiệm thu. Chỉ thực hiện trong cửa sổ bảo trì sau backupMySQL+ảnh/restore test/approvalMain riêng. SQL có guard hostport/database/version, không dùng --force. DDL MySQL không rollback toàn bộ; nếu thất bại giữa chừng dừng và kiểm trạng thái, không tự chạy lại hoặc DROP.

Đọc [mô hình dữ liệu](../docs/independent-menu-data-model.md) và [kế hoạch Main](../docs/independent-menu-main-plan.md) trước khi thao tác.
