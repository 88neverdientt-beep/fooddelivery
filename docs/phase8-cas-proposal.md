# Giai đoạn 8 — Đề xuất revision chống stale write và ABA (đã phê duyệt)

Hiện Account.status chỉ so expectedStatus; Restaurant/Driver profile chỉ preflight frontend, không compare trong transaction. Account, Customer, Restaurant, Driver chưa có @Version. So trạng thái hoặc hash nội dung hiện tại không phân biệt A→B→A. Không tái sử dụng passwordChangedAt/session làm revision nghiệp vụ.

## Phạm vi đề nghị

Thêm cột `version BIGINT NOT NULL DEFAULT 0` vào bốn bảng accounts/customers/restaurants/drivers, ánh xạ JPA @Version. Profile response bổ sung version; Account management projection bổ sung version. PUT profile và PUT status nhận optional expectedVersion >=0; kiểm tra dưới transaction/row lock rồi JPA version bảo vệ commit. Mọi cập nhật entity qua JPA đều tăng version, kể cả trường hợp giá trị quay về ban đầu, không đổi role/ID/FK/giá/phí/lifecycle. No-op không đổi dữ liệu không cần tăng revision.

Các UI Customer/Restaurant/Driver/Admin gửi version từ form đã tải, không fetch version mới để lặng lẽ ghi đè draft cũ. HTTP409 khi stale; giữ draft/reload tường minh. Client cũ chưa gửi giữ hợp đồng mặc định, có tùy chọn require-preconditions dành staging/production sau nâng toàn bộ consumer; khi bật, request thiếu precondition trả428. Không tự bật trên môi trường đang dùng. Menu expectedPrice/isAvailable vẫn có hạn chế ABA riêng; nếu muốn bảo vệ menu bằng version phải duyệt riêng, không gộp ngoài phạm vi bốn bảng.

## DDL đã diễn tập trên Stage8 — production chưa được phê duyệt

Chỉ sau phê duyệt: preflight xác minh port3307 + database đúng fooddelivery_stage8_e2e + datadir độc lập, kiểu ID/FK không đổi, bảng tồn tại và chưa có version. Chạy từng ALTER có ghi nhận trạng thái vì MySQL DDL implicit commit:

```sql
ALTER TABLE accounts ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE drivers ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
```

Không script auto-start, không ddl-auto update. Giữ dữ liệu trước/sau và snapshot. Migration production là công việc khác, KHÔNG được phê duyệt bởi diễn tập này. App validate chỉ chạy sau expand; old binary bỏ qua cột mới vẫn chạy được. Test INSERT SQL cũ được default0. App mới không chạy trên schema cũ.

## Compatibility, rollback và retest

Response thêm field, request optional để client cũ không hỏng; consumer mới dùng precondition. Khi bật required mode phải dùng UI mới, xử lý428 rõ ràng. Lỗi optimistic-lock trả409 chung không lộ SQL. Rollback app trước và để nguyên cột version (expand-only), tắt required flag nếu cần; không tự DROP cột. Dừng writer khi restore/rollback, ghi checksum toàn bộ business IDs/FKs/tiền trước/sau. Không coi rollback DDL là transaction atomic.

Bổ sung test trước sửa: stale two forms, concurrent commits một thành công/một409, ABA A→B→A từ chối revision cũ, profile/account mapping/transaction rollback, direct stale JPA entity, missing precondition ở strict mode, legacy mode, browser hai tab giữ draft, lost-response chỉ một PUT; chạy toàn bộ hồi quy. Tất cả trong Stage8, không chạm schema/data Stage1–7 hoặc production.

Người dùng đã phê duyệt phương án trong phiên10/11/2026. Không có phê duyệt migration production hoặc deployment.

Diễn tập Stage8 đã thành công; hash các cột/ID nghiệp vụ cũ không đổi. Lần chạy thứ hai bị từ chối trước ALTER và giữ nguyên dữ liệu (logs/version-migration-rerun-rejection.json).
