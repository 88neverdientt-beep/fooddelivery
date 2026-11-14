import { useEffect, useRef, useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/AuthProvider';
import { Alert } from '@/components/feedback';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { normalizeError } from '@/lib/api/http';
import { Button, Input, Checkbox, Select } from '@/components/ui';
import type { MenuItem } from '@/types/domain';
import { publicApi } from '@/features/public/api';
import { restaurantApi } from './api';
import { dishInput } from './model';
import { useRestaurant, UnsavedChanges } from './shared';

export function MenuCreationPanel({ item }: { item?: MenuItem }) {
  const { account, key } = useRestaurant(),
    session = useSession(),
    cache = useQueryClient(),
    navigate = useNavigate();
  const [formOwner] = useState(account.accountId);
  const [baseline, setBaseline] = useState(item),
    [name, setName] = useState(item?.foodItem.name || ''),
    [description, setDescription] = useState(item?.foodItem.description || ''),
    [category, setCategory] = useState(item?.foodItem.category || ''),
    [price, setPrice] = useState(item ? String(item.price) : ''),
    [available, setAvailable] = useState(item?.isAvailable ?? true);
  const [file, setFile] = useState<File>(),
    [preview, setPreview] = useState<string>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [dirty, setDirty] = useState(false);
  const [blocked, setBlocked] = useState(false),
    [recovery, setRecovery] = useState<MenuItem>();
  const [creationKey] = useState(() => crypto.randomUUID());
  const lock = useRef(false);
  const descriptionId = useId();
  const categories = useQuery({
    queryKey: ['public', 'dish-categories'],
    queryFn: ({ signal }) => publicApi.categories(signal),
  });
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  if (formOwner !== account.accountId)
    return <Alert>Tài khoản đã thay đổi. Hãy mở lại form cho tài khoản hiện tại.</Alert>;
  return (
    <form
      className="management-form"
      aria-label={item ? 'Chỉnh sửa món ăn' : 'Tạo món ăn'}
      noValidate
      onChange={() => setDirty(true)}
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current || blocked) return;
        const input = dishInput.safeParse({
          name,
          description,
          category,
          price,
          isAvailable: available,
        });
        if (!input.success) {
          setNotice(input.error.issues[0].message);
          return;
        }
        if (
          file &&
          (file.size === 0 ||
            file.size > 5 * 1024 * 1024 ||
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
        ) {
          setNotice('Chỉ nhận JPG, PNG hoặc WebP, tối đa 5 MB.');
          return;
        }
        const generation = session.getSnapshot().generation,
          owner = account.accountId;
        const current = () =>
          session.getSnapshot().generation === generation &&
          session.getSnapshot().account?.accountId === owner &&
          formOwner === owner;
        if (!current()) return;
        lock.current = true;
        setBusy(true);
        setNotice('');
        let saved: MenuItem | undefined;
        try {
          saved = baseline
            ? await restaurantApi.updateDish(baseline, input.data)
            : await restaurantApi.createDish(input.data, creationKey);
          if (!current()) return;
          setBaseline(saved);
          if (file) {
            saved = await restaurantApi.uploadImage(saved, file);
            if (!current()) return;
            setBaseline(saved);
          }
          const persisted = await restaurantApi.menuItem(saved.restaurantFoodItemId);
          if (!current()) return;
          setBaseline(persisted);
          setDirty(false);
          setNotice('Đã lưu và truy vấn lại món ăn từ máy chủ.');
          await cache.invalidateQueries({ queryKey: key });
          await cache.invalidateQueries({ queryKey: ['public'] });
          if (current())
            navigate('/restaurant/menu', { state: { notice: 'Đã lưu món ăn thành công.' } });
        } catch (error) {
          if (current()) {
            const failure = normalizeError(error),
              target = saved || baseline;
            if (
              target &&
              (failure.status === 409 || failure.status === 0 || failure.status >= 500)
            ) {
              setBlocked(true);
              setNotice(
                'Dữ liệu máy chủ đã thay đổi hoặc chưa xác định kết quả lưu. Bản nháp được giữ nguyên; dùng bản mới trước khi lưu tiếp.',
              );
              try {
                const latest = await restaurantApi.menuItem(target.restaurantFoodItemId);
                if (current()) setRecovery(latest);
              } catch {
                /* Keep the draft blocked until the operator can reconcile it. */
              }
            } else if (failure.status === 413)
              setNotice('Ảnh vượt quá dung lượng 5 MB; món đã lưu được giữ nguyên.');
            else if (failure.status === 400)
              setNotice(
                target
                  ? 'Món đã lưu, nhưng ảnh hoặc thông tin gửi lên chưa hợp lệ. Kiểm tra JPG/PNG/WebP, dung lượng và kích thước ảnh.'
                  : 'Thông tin chưa hợp lệ; hãy kiểm tra lại tên, giá và ảnh.',
              );
            else
              setNotice(
                'Chưa hoàn tất lưu món hoặc ảnh. Kiểm tra thực đơn trước khi thử lại; yêu cầu tạo lại trong form này giữ cùng mã chống trùng.',
              );
          }
        } finally {
          lock.current = false;
          if (current()) setBusy(false);
        }
      }}
    >
      <UnsavedChanges dirty={dirty && !busy} />
      {notice && <Alert>{notice}</Alert>}
      {blocked && (
        <div className="management-actions">
          {recovery ? (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="secondary">
                  Dùng bản mới
                </Button>
              }
              title="Dùng dữ liệu mới từ máy chủ?"
              description="Bản nháp và ảnh chưa lưu sẽ được thay bằng dữ liệu hiện tại trên máy chủ."
              confirm="Dùng bản mới"
              onConfirm={async () => {
                setBaseline(recovery);
                setName(recovery.foodItem.name);
                setCategory(recovery.foodItem.category || '');
                setDescription(recovery.foodItem.description || '');
                setPrice(String(recovery.price));
                setAvailable(!!recovery.isAvailable);
                setFile(undefined);
                setPreview(undefined);
                setBlocked(false);
                setRecovery(undefined);
                setDirty(false);
                setNotice('Đã tải lại bản ghi hiện tại; chưa gửi yêu cầu cập nhật mới.');
              }}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (!baseline) return;
                const generation = session.getSnapshot().generation;
                try {
                  const latest = await restaurantApi.menuItem(baseline.restaurantFoodItemId);
                  if (
                    session.getSnapshot().generation === generation &&
                    session.getSnapshot().account?.accountId === formOwner
                  )
                    setRecovery(latest);
                } catch {
                  setNotice('Chưa đọc được bản ghi; bản nháp vẫn được giữ nguyên.');
                }
              }}
            >
              Kiểm tra kết quả lưu
            </Button>
          )}
        </div>
      )}
      <fieldset disabled={busy || blocked}>
        <Input
          label="Tên món"
          required
          maxLength={150}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="field">
          <label htmlFor={descriptionId}>Mô tả</label>
          <textarea
            id={descriptionId}
            value={description}
            maxLength={255}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Select label="Danh mục" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Chưa phân loại</option>
          {[...new Set([...(categories.data || []), ...(category ? [category] : [])])].map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ),
          )}
        </Select>
        {categories.isError && <p>Chưa tải được danh mục; có thể lưu món chưa phân loại.</p>}
        <Input
          label="Giá bán (VND)"
          required
          inputMode="decimal"
          maxLength={13}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          hint="Giá lớn hơn 0; không dùng dấu phân cách hàng nghìn."
        />
        <Input
          label="Ảnh món ăn"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hint="JPG, PNG, WebP; tối đa 5 MB, 4096 × 4096 px. Không bắt buộc."
          onChange={(e) => {
            const value = e.target.files?.[0];
            if (
              value &&
              (value.size === 0 ||
                value.size > 5 * 1024 * 1024 ||
                !['image/jpeg', 'image/png', 'image/webp'].includes(value.type))
            ) {
              setNotice('Chỉ nhận JPG, PNG hoặc WebP, tối đa 5 MB.');
              e.target.value = '';
              setFile(undefined);
              setPreview(undefined);
            } else {
              setNotice('');
              setFile(value);
              setPreview(value ? URL.createObjectURL(value) : undefined);
            }
          }}
        />
        {(preview || baseline?.foodItem.imageUrl) && (
          <img
            className="dish-preview"
            src={preview || baseline?.foodItem.imageUrl || ''}
            alt="Xem trước ảnh món ăn"
          />
        )}
        <Checkbox
          type="checkbox"
          checked={available}
          onChange={(e) => setAvailable(e.target.checked)}
        >
          Đang bán
        </Checkbox>
        <div className="management-actions">
          <Button type="submit" busy={busy}>
            Lưu món ăn
          </Button>
          <Link to="/restaurant/menu" className="button button-secondary">
            Hủy
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
