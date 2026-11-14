import { useState } from 'react';
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Utensils } from 'lucide-react';
import type { MenuItem } from '@/types/domain';
import { Button, Input, Checkbox, PageHeader, Pagination, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { money } from '@/features/public/api';
import { pageFrom, validId } from '@/features/public/model';
import { restaurantApi } from './api';
import { MenuCreationPanel } from './MenuCreationPanel';
import { MenuExport } from './MenuExport';
import { menuInput, sameMenu, type MenuInput } from './model';
import {
  useRestaurant,
  useAction,
  ActionNotice,
  UnsavedChanges,
  ManagementSection,
} from './shared';

export function MenuForm({
  item,
  onSave,
  busy,
  blocked = false,
}: {
  item?: MenuItem;
  onSave: (input: MenuInput) => Promise<MenuItem | undefined>;
  busy: boolean;
  blocked?: boolean;
}) {
  const [baseline, setBaseline] = useState(item),
    [saved, setSaved] = useState<MenuItem>();
  const form = useForm<MenuInput>({
    resolver: zodResolver(menuInput),
    defaultValues: { price: String(item?.price || ''), isAvailable: item?.isAvailable ?? true },
  });
  const stale = !!item && !!baseline && !sameMenu(item, baseline);
  return (
    <form
      className="management-form"
      aria-label={item ? 'Chỉnh sửa món trong thực đơn' : 'Thêm món vào thực đơn'}
      noValidate
      onSubmit={form.handleSubmit(async (input) => {
        if (stale || blocked) return;
        const value = await onSave(input);
        if (value) {
          setBaseline(value);
          setSaved(value);
          form.reset({ price: String(value.price), isAvailable: !!value.isAvailable });
        }
      })}
    >
      <UnsavedChanges dirty={form.formState.isDirty} />
      {stale && (
        <Alert>
          Dữ liệu máy chủ đã thay đổi. Hãy dùng bản mới trước khi lưu.
          <ConfirmDialog
            trigger={
              <Button type="button" variant="secondary">
                Dùng bản mới
              </Button>
            }
            title="Dùng dữ liệu mới từ máy chủ?"
            description="Các chỉnh sửa chưa lưu sẽ được thay bằng dữ liệu hiện tại."
            confirm="Dùng bản mới"
            onConfirm={async () => {
              setBaseline(item);
              form.reset({ price: String(item.price), isAvailable: !!item.isAvailable });
            }}
          />
        </Alert>
      )}
      {saved && (
        <Alert tone="success">
          Đã lưu món #{saved.restaurantFoodItemId} theo phản hồi máy chủ.{' '}
          <Link to="/restaurant/menu">Về thực đơn</Link>
        </Alert>
      )}
      <fieldset disabled={busy || blocked || stale || (!item && !!saved)}>
        <Input
          label="Giá bán (VND)"
          inputMode="decimal"
          maxLength={13}
          hint="Không dùng dấu phân cách hàng nghìn. Ví dụ: 25000 hoặc 25000.50."
          error={form.formState.errors.price?.message}
          {...form.register('price')}
        />
        <Checkbox type="checkbox" {...form.register('isAvailable')}>
          Đang kinh doanh
        </Checkbox>
        <div className="management-actions">
          <Button type="submit" busy={busy}>
            {item ? 'Lưu thay đổi món' : 'Thêm món vào thực đơn'}
          </Button>
          <Link to="/restaurant/menu" className="button button-secondary">
            Về thực đơn
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
export function RestaurantMenuPage() {
  const location = useLocation();
  const { key } = useRestaurant();
  const [params, setParams] = useSearchParams();
  const page = pageFrom(params);
  const q = (params.get('q') || '').slice(0, 100);
  const status = ['true', 'false'].includes(params.get('available') || '')
    ? params.get('available')!
    : 'all';
  const sort = ['price-asc', 'price-desc'].includes(params.get('sort') || '')
    ? params.get('sort')!
    : 'name';
  const filters = {
    page,
    size: 12,
    q,
    sort,
    available: status === 'all' ? undefined : status === 'true',
  };
  const data = useQuery({
    queryKey: [...key, 'menu', filters],
    queryFn: ({ signal }) => restaurantApi.menu(filters, signal),
  });
  const update = useAction(async ({ item, toggle }: { item: MenuItem; toggle: boolean }) => {
    if (toggle)
      await restaurantApi.update(item, {
        price: String(item.price),
        isAvailable: !item.isAvailable,
      });
    else await restaurantApi.remove(item);
    return true;
  });
  const change = (k: string, v: string) =>
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.set(k, v);
      if (k !== 'page') next.delete('page');
      return next;
    });
  return (
    <ManagementSection>
      <PageHeader
        title="Thực đơn nhà hàng"
        description="Quản lý giá và trạng thái bán của các món thuộc nhà hàng bạn."
        action={
          <div className="management-actions">
            <MenuExport key={JSON.stringify(filters)} filters={filters} />
            <Link className="button button-primary" to="/restaurant/menu/new">
              <Plus size={18} />
              Thêm món
            </Link>
          </div>
        }
      />
      <form
        className="management-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          change('q', String(new FormData(event.currentTarget).get('q') || ''));
        }}
      >
        <Input label="Tìm món của nhà hàng" name="q" key={q} defaultValue={q} maxLength={100} />
        <Select
          label="Trạng thái món"
          value={status}
          onChange={(e) => change('available', e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="true">Đang bán</option>
          <option value="false">Ngừng bán</option>
        </Select>
        <Select
          label="Sắp xếp thực đơn"
          value={sort}
          onChange={(e) => change('sort', e.target.value)}
        >
          <option value="name">Tên món</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </Select>
        <Button type="submit">Tìm món</Button>
      </form>
      {typeof location.state?.notice === 'string' && (
        <Alert tone="success">{location.state.notice}</Alert>
      )}
      <ActionNotice action={update} />
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <>
          <p className="muted">{data.data.totalElements} món · phân trang trên hệ thống</p>
          {!data.data.items.length ? (
            <EmptyState
              title="Chưa có món phù hợp"
              description="Tạo món ăn đầu tiên cho thực đơn của nhà hàng."
            />
          ) : (
            data.data.items.map((item) => (
              <article
                className="management-row restaurant-menu-row"
                key={item.restaurantFoodItemId}
              >
                <div>
                  {item.foodItem.imageUrl && (
                    <img
                      className="dish-thumbnail"
                      src={item.foodItem.imageUrl}
                      alt={item.foodItem.name}
                      loading="lazy"
                    />
                  )}
                  <h2>
                    <Utensils size={19} /> {item.foodItem.name}
                  </h2>
                  <p>
                    {item.foodItem.category} · {item.foodItem.description}
                  </p>
                  <strong>{money(item.price)}</strong> ·{' '}
                  <span>{item.isAvailable ? 'Đang bán' : 'Ngừng bán'}</span>
                </div>
                <div className="management-actions">
                  <Link
                    className="button button-secondary"
                    to={`/restaurant/menu/${item.restaurantFoodItemId}/edit`}
                  >
                    Sửa {item.foodItem.name}
                  </Link>
                  <Button
                    busy={update.busy}
                    variant="secondary"
                    onClick={() => void update.run({ item, toggle: true })}
                  >
                    {item.isAvailable ? 'Ngừng bán' : 'Bật bán'} {item.foodItem.name}
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" disabled={update.busy}>
                        Xóa {item.foodItem.name}
                      </Button>
                    }
                    title="Xóa món khỏi thực đơn?"
                    description="Món còn trong giỏ hoặc lịch sử đơn có thể không được xóa. Bạn có thể chọn ngừng bán để giữ lịch sử."
                    confirm="Xác nhận xóa món"
                    busy={update.busy}
                    onConfirm={async () => {
                      await update.run({ item, toggle: false });
                    }}
                  />
                </div>
              </article>
            ))
          )}
          <Pagination
            page={data.data.page + 1}
            count={data.data.totalPages}
            onChange={(n) => change('page', String(n))}
          />
        </>
      )}
    </ManagementSection>
  );
}
export function RestaurantMenuEditor() {
  const { id } = useParams();
  const { key } = useRestaurant();
  const valid = !id || validId(id);
  const item = useQuery({
    queryKey: [...key, 'menu-item', id],
    queryFn: ({ signal }) => restaurantApi.menuItem(Number(id), signal),
    enabled: !!id && valid,
  });
  if (!valid) return <ErrorState error={new Error('Invalid ID')} />;
  return (
    <ManagementSection>
      <PageHeader
        title={id ? 'Chỉnh sửa món ăn' : 'Thêm món ăn'}
        description="Tự tạo món, nhập giá và tải ảnh cho thực đơn riêng của nhà hàng."
      />
      {id && item.isPending ? (
        <Skeleton />
      ) : id && item.isError ? (
        <ErrorState error={item.error} onRetry={() => void item.refetch()} />
      ) : (
        <MenuCreationPanel
          key={key.join(':') + ':' + (id || 'new')}
          item={id ? item.data : undefined}
        />
      )}
    </ManagementSection>
  );
}
