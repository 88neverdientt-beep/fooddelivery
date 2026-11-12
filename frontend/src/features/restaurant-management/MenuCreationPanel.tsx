import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/AuthProvider';
import { Alert } from '@/components/feedback';
import { Button } from '@/components/ui';
import { normalizeError, ApiError } from '@/lib/api/http';
import type { MenuItem } from '@/types/domain';
import { restaurantApi } from './api';
import type { CatalogItem, MenuInput } from './model';
import { MenuForm } from './MenuPages';
import { useRestaurant } from './shared';

/** Unknown POST results stay locked; reconciliation never automatically replays the mutation. */
export function MenuCreationPanel({
  food,
  onUncertain,
}: {
  food: CatalogItem;
  onUncertain: () => void;
}) {
  const { account, key } = useRestaurant(),
    session = useSession(),
    cache = useQueryClient();
  const lock = useRef(false),
    task = useRef<{ accountId: number; generation: number } | null>(null);
  const [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [notice, setNotice] = useState('');
  const [found, setFound] = useState<MenuItem>();
  const current = () =>
    task.current?.accountId === session.getSnapshot().account?.accountId &&
    task.current?.generation === session.getSnapshot().generation;
  async function reconcile() {
    try {
      const item = await restaurantApi.ownByFood(food.itemId);
      if (!current()) return;
      setFound(item);
      setNotice(
        'Đã tìm thấy món trong thực đơn. Mở bản ghi để đối chiếu giá và trạng thái thực tế; không gửi lại yêu cầu thêm.',
      );
      await cache.invalidateQueries({ queryKey: key });
    } catch (cause) {
      if (current())
        setNotice(
          normalizeError(cause).status === 404
            ? 'Chưa xác định được món đã lưu. Yêu cầu thêm vẫn bị khóa; hãy kiểm tra lại, không gửi lại tự động.'
            : 'Chưa đọc được kết quả từ máy chủ. Yêu cầu thêm vẫn bị khóa.',
        );
    }
  }
  async function save(input: MenuInput) {
    if (lock.current || blocked) return;
    task.current = { accountId: account.accountId, generation: session.getSnapshot().generation };
    if (!current()) return;
    lock.current = true;
    setBusy(true);
    setNotice('');
    try {
      const created = await restaurantApi.add(food.itemId, input);
      if (!current()) return;
      const stored = await restaurantApi.menuItem(created.restaurantFoodItemId);
      if (!current()) return;
      if (stored.foodItem.itemId !== food.itemId) throw new ApiError(502, 'CONTRACT');
      await cache.invalidateQueries({ queryKey: key });
      await cache.invalidateQueries({ queryKey: ['public'] });
      if (current()) return stored;
    } catch (cause) {
      if (!current()) return;
      const error = normalizeError(cause);
      if (error.status === 0 || error.status >= 500 || error.status === 409) {
        setBlocked(true);
        onUncertain();
        await reconcile();
      } else
        setNotice(
          error.status === 400
            ? 'Thông tin món chưa hợp lệ. Kiểm tra món được chọn và giá bán.'
            : error.message,
        );
    } finally {
      lock.current = false;
      if (current()) setBusy(false);
    }
  }
  async function recheck() {
    if (lock.current || !current()) return;
    lock.current = true;
    setBusy(true);
    try {
      await reconcile();
    } finally {
      lock.current = false;
      if (current()) setBusy(false);
    }
  }
  return (
    <>
      <section aria-label="Món catalog đã chọn">
        <h2>Đã chọn: {food.name}</h2>
        <p>Danh mục: {food.category || 'Chưa phân loại'}</p>
        <p>Mô tả: {food.description || 'Chưa có mô tả'}</p>
      </section>
      {notice && <Alert>{notice}</Alert>}
      {blocked && (
        <div className="management-actions">
          <Button variant="secondary" busy={busy} onClick={() => void recheck()}>
            Kiểm tra kết quả thêm món
          </Button>
          {found && (
            <Link
              className="button button-secondary"
              to={`/restaurant/menu/${found.restaurantFoodItemId}/edit`}
            >
              Mở món đã xác minh
            </Link>
          )}
        </div>
      )}
      <MenuForm busy={busy} blocked={blocked} onSave={save} />
    </>
  );
}
