# Food Delivery — tổ chức lại SQL trước triển khai Main

Ngày12/11/2026, Asia/Saigon.

**Kết luận: PASS.** Đã chuyển SQL và schema reference sang database/, cập nhật đường dẫn sử dụng hiện tại, kiểm tra nguyên vẹn byte và build/test thành công. Chưa áp dụng baseline Main hoặc chạy bất kỳ SQL ghi nào.

Cập nhật bước sau: baseline đã được phê duyệt và áp dụng một lần qua Login Path, JPA validate PASS; xem [main-baseline-apply-result.md](main-baseline-apply-result.md). Các mô tả chưa apply/chưa có Login Path bên dưới là trạng thái lịch sử lúc kết thúc lượt sắp xếp SQL.

## 1. Cấu trúc hiện tại

```text
database/
├── baseline/
│   └── 001_fooddelivery_baseline.sql
├── setup/
│   ├── 002_fooddelivery_app.sql
│   └── 003_cod.sql
├── migrations/
│   ├── 00_preflight_readonly.sql
│   ├── 01_expand_auth.sql
│   ├── 02_backfill_accounts.sql
│   └── 03_stage8_versions.sql
├── schema-reference.json
└── README.md
```

Tổng7 SQL,1schema reference,1README; không giữ bản SQL trùng tại vị trí source cũ. Không di chuyển/sửa bản SQL nằm trong artifact, backup hoặc snapshot diễn tập lịch sử ngoài repository.

## 2. Nội dung SQL và checksum

**7/7 SQL và schema-reference.json giữ nguyên SHA-256 byte trước/sau**, gồm newline/encoding; không sửa comment, guard target, câu lệnh, constraint, default hoặc dữ liệu. README được chuyển sang hướng dẫn chung, giữ nội dung Stage2 cũ trong phần lịch sử và lưu bản README gốc tại thư mục evidence.

Baseline mới: `database/baseline/001_fooddelivery_baseline.sql`.

- Byte SHA-256 vẫn `8a64e0e4d3cfe1d05ddac6b8e9f69fef8eb5ecda8ad3e5defa54837ae72d6b9d`,11.952byte.
- Canonical UTF-8/LF SHA-256 vẫn `78173e7f31856cd4b8a7f8a42cc4127fc971ad8e00c176c56346e52d3fefb893`, khớp manifest đã diễn tập.
- Vẫn16 bảng,16PK/21FK/13UNIQUE/6CHECK; không thêm ràng buộc hoặc thay guards.

Đầy đủ mapping đường dẫn gốc/hiện tại và hash trước/sau ở [sql-reorganization-checksums.json](sql-reorganization-checksums.json). Bản before.json độc lập ngoài repository được giữ để đối chiếu; không chỉ cập nhật expected hash rồi coi đó là bảo toàn.

## 3. Đường dẫn công cụ/build

- `tools/deployment/mysql_baseline.py` đọc baseline/schema reference/setup từ database/. API và các guard không đổi.
- Các checker/importer hiện có dùng chung BASELINE/MANIFEST nên đọc vị trí mới;40 Python test xác nhận chúng vẫn hoạt động.
- `AuthMigrationMySqlTest` chuyển ClassPathResource sang database/migrations/. Giữ nguyên opt-in, target guards và assertions; không chạy test migration ghi DB trong lượt này.
- `pom.xml` khai báo testResources database/migrations/*.sql vào test classpath database/migrations, filtering không bật; giữ testResources mặc định. Không đổi dependency, phiên bản Java/Spring hoặc code ứng dụng.
- Thêm `DatabaseMigrationResourceTest`: JUnit thuần đọc bốn resource và so SHA byte đã ghi trước di chuyển, không Spring context/DB/SQL execution.
- SQL thủ công không còn trong main resources; build mới không đóng gói chúng vào application JAR. Cả bốn SQL vẫn có nguyên byte trong target/test-classes của bản build thử riêng.

## 4. Tài liệu và snapshot lịch sử

Đã cập nhật đường dẫn hiện hành trong runbook, báo cáo baseline/readiness, danh mục A1, index bằng chứng, file lists Phase2/8; hướng dẫn chung ở [database/README.md](../../database/README.md). Danh sách tài liệu được sửa có trong sql-reorganization-file-updates.json.

Các JSON snapshot Git/checksum nhúng trong A1-evidence-index giữ nguyên đường dẫn/hash tại thời điểm ghi nhận, kèm chú thích và link mapping mới; chỉ các liên kết sử dụng hiện tại được chuyển. Bản text Git-show có sẵn ở root cũng giữ nguyên làm archive. Không viết lại snapshot hoặc trạng thái PASS cũ để giả lập source mới.

Rà soát tools/src/pom/deploy và tài liệu ngoài các trường metadata lịch sử: không còn đường dẫn SQL cũ đang được dùng. Các originalPath trong checksum mapping là provenance, không phải đường dẫn runtime.

## 5. Kết quả kiểm thử

- **Python offline:40 PASS,0FAIL**, gồm15 baseline guards,9 restore guards,9 Main preflight/backup guards và7 kiểm tra relocation/path/hash/POM. Không kết nối database.
- **Maven clean package offline:PASS**, JDK25.0.4/Maven3.9.16; build trong bản sao riêng có src/pom/database, không ghi đè target/frontend-dist hoặc artifact cũ ở repo.
- **JUnit:219 phát hiện;96 PASS,0FAILURE,0ERROR,123SKIPPED.** Tăng1 PASS là resource-only regression mới. MySQL integration writer opt-ins không bật; không sửa whitelist hoặc làm yếu test để chạy vào DB khác.
- **Packaging:4/4 migration test resource khớp byte;0 SQL thủ công trong main application JAR.**
- **Main SELECT/SHOW-only preflight:PREFLIGHT_PASS** lúc22:23:18 UTC+7, Login Path fooddelivery_main/Windows HIEU, cùng UUID/port/version đã pin. Database fooddelivery vẫn0 table/view/routine/event/trigger. Script đã đọc baseline/manifest tại vị trí mới. Không dùng --create-backup hoặc nhánh DDL/DML/account/COD/ADMIN.

Không khởi động backend/frontend, không tạo hoặc ghi dữ liệu trên3307; không chạy lại rehearsal/restore writers chỉ để kiểm tra filesystem.

## 6. Bảo toàn backup và bằng chứng

Main backup tại `F:/New folder/fooddelivery-main-backups/20261112-LoginPath-01` giữ nguyên cả5 file theo SHA-256 trước/sau; không sửa metadata, sidecar, artifact review hoặc dump.

Dump Main SHA vẫn `9bb19e741215f1e29b43f681c71cc39cfcc3f7f44a1af9ef6c7df30cdcbde510`.

7 file bằng chứng setup/constraint/HTTP/final-proof/rehearsal và restore được đối chiếu hash đều không đổi. Không sửa database hanoi_food hoặc A2.4, không truy cập3307, không stop/restart MySQL80.

Evidence mới ngoài repo:

`F:/New folder/fooddelivery-sql-layout-20261112/`

Gồm before.json, original-migration-readme.md, maven.log, build-result.json, relocation-result.json, bản build riêng và main-readonly/preflight-backup.json. Không thay evidence PASS cũ bằng các file này.

## 7. File thay đổi chính

- Di chuyển8 file immutable vào database/; README chuyển và bổ sung hướng dẫn.
- Sửa tools/deployment/mysql_baseline.py, pom.xml và đường dẫn resource trong AuthMigrationMySqlTest.java.
- Thêm tools/deployment/test_database_layout.py và DatabaseMigrationResourceTest.java.
- Cập nhật8 tài liệu/file lists; thêm checksum manifest, file-update inventory và báo cáo này.
- Cập nhật runbook/README liên kết vị trí SQL và kết quả kiểm tra mới.

Không sửa Java ứng dụng/frontend hoặc logic tính tiền, checkout, giao hàng, auth/security. Không commit/push/deploy.

## 8. Sẵn sàng bước tiếp theo

**Đường dẫn mới đã sẵn sàng dùng cho baseline001**; việc đổi vị trí không làm mất giá trị của kết quả schema/rehearsal/restore/preflight đã PASS. Trước apply phải kiểm lại schema rỗng/UUID/hash trong guard và nhận phê duyệt DDL riêng.

Giao diện apply hiện tại vẫn yêu cầu --defaults-file; đường Login Path cho nhánh writer còn là phần cần chuẩn bị/kiểm chứng ở bước triển khai như báo cáo preflight trước đã nêu. Không dùng lại credential file cũ hoặc SOURCE file SQL để bỏ guard. Lượt sắp xếp này không bổ sung writer/auth route mới và không tự triển khai Main.
