import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { RefreshCw, Search, X, ArrowUpRight } from 'lucide-react';
import { Badge, Button, Card, Input, Select, PageHeader, Pagination } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { money } from '@/features/public/api';
import { orderLabels, paymentLabels, deliveryLabels } from '@/features/orders/model';
import { roleName, roleSchema } from '@/types/domain';
import { adminApi } from './api';
import { useAdminIdentity, AdminReadState, AdminFacts } from './ExistingPages';
import {
  dateValid,
  rangeValid,
  type Page,
  type Filters,
  type AccountRow,
  type CustomerRow,
  type RestaurantRow,
  type DriverRow,
  type OrderRow,
  type DeliveryRow,
  type PaymentRow,
  type ReviewRow,
} from './model';

export const adminTime = (value: string | null | undefined) => {
  if (!value) return 'Chưa ghi nhận';
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6] || '00'}` : 'Chưa ghi nhận';
};
export function AdminStatus({
  value,
  kind = 'account',
}: {
  value: string | null;
  kind?: 'account' | 'order' | 'payment' | 'delivery';
}) {
  const labels: Record<string, string> =
    kind === 'order'
      ? orderLabels
      : kind === 'payment'
        ? paymentLabels
        : kind === 'delivery'
          ? deliveryLabels
          : { ACTIVE: 'Đang hoạt động', DISABLED: 'Đã vô hiệu hóa' };
  return (
    <Badge
      tone={
        value && ['ACTIVE', 'COMPLETED', 'SUCCESS', 'DELIVERED'].includes(value)
          ? 'success'
          : value && ['CANCELLED', 'DISABLED', 'REFUNDED'].includes(value)
            ? 'neutral'
            : 'warning'
      }
    >
      {value ? labels[value] || 'Chưa xác định' : 'Chưa ghi nhận'}
    </Badge>
  );
}
export type Column<T> = { title: string; cell: (row: T) => ReactNode };
export function AdminTable<T>({
  caption,
  rows,
  columns,
  rowKey,
}: {
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => number;
}) {
  if (!rows.length)
    return (
      <EmptyState
        title="Không có kết quả phù hợp"
        description="Thử đổi bộ lọc hoặc làm mới để xem dữ liệu hiện tại."
      />
    );
  return (
    <div className="admin-table-region" role="region" aria-label={caption} tabIndex={0}>
      <table className="admin-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.title}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.title}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
type Filter = {
  key: string;
  label: string;
  options?: readonly string[];
  labels?: Record<string, string>;
  numeric?: boolean;
};
function FilterForm({
  fields,
  dates,
  initial,
  onApply,
}: {
  fields: Filter[];
  dates: boolean;
  initial: URLSearchParams;
  onApply: (value: URLSearchParams) => void;
}) {
  const [error, setError] = useState('');
  return (
    <form
      className="admin-filters"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        for (const [k, v] of form) if (typeof v === 'string' && v.trim()) next.set(k, v.trim());
        const from = next.get('from'),
          to = next.get('to');
        if (
          (from && !dateValid(from)) ||
          (to && !dateValid(to)) ||
          (from && to && !rangeValid(from, to, Infinity))
        ) {
          setError('Khoảng ngày chưa hợp lệ.');
          return;
        }
        if (
          fields.some((f) => f.numeric && next.has(f.key) && !/^[1-9]\d*$/.test(next.get(f.key)!))
        ) {
          setError('Mã lọc phải là số nguyên dương.');
          return;
        }
        setError('');
        onApply(next);
      }}
    >
      <div className="admin-filter-grid">
        <Input
          name="q"
          label="Tìm kiếm"
          maxLength={100}
          defaultValue={initial.get('q') || ''}
          placeholder="Nhập mã hoặc tên…"
        />
        {fields.map((f) =>
          f.options ? (
            <Select
              key={f.key}
              name={f.key}
              label={f.label}
              defaultValue={initial.get(f.key) || ''}
            >
              <option value="">Tất cả</option>
              {f.options.map((v) => (
                <option key={v} value={v}>
                  {f.labels?.[v] || v}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              key={f.key}
              name={f.key}
              label={f.label}
              inputMode={f.numeric ? 'numeric' : undefined}
              defaultValue={initial.get(f.key) || ''}
            />
          ),
        )}
        {dates && (
          <>
            <Input
              name="from"
              type="date"
              label="Từ ngày"
              defaultValue={initial.get('from') || ''}
            />
            <Input name="to" type="date" label="Đến ngày" defaultValue={initial.get('to') || ''} />
          </>
        )}
        <Select name="sort" label="Thứ tự theo mã" defaultValue={initial.get('sort') || 'newest'}>
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
        </Select>
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="admin-links">
        <Button type="submit">
          <Search size={17} /> Áp dụng bộ lọc
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            setError('');
            onApply(new URLSearchParams());
          }}
        >
          Xóa bộ lọc
        </Button>
      </div>
    </form>
  );
}
export function AdminList<T>({
  module,
  title,
  description,
  load,
  columns,
  rowKey,
  fields = [],
  dates = false,
  create,
}: {
  module: string;
  title: string;
  description: string;
  load: (filters: Filters, signal?: AbortSignal) => Promise<Page<T>>;
  columns: Column<T>[];
  rowKey: (value: T) => number;
  fields?: Filter[];
  dates?: boolean;
  create?: { to: string; label: string };
}) {
  const { key } = useAdminIdentity(),
    [params, setParams] = useSearchParams();
  const allowed = [
    'q',
    'sort',
    'page',
    ...fields.map((f) => f.key),
    ...(dates ? ['from', 'to'] : []),
  ];
  const filters = Object.fromEntries([...params].filter(([k]) => allowed.includes(k)));
  const query = useQuery({
    queryKey: [...key, module, filters],
    queryFn: ({ signal }) => load(filters, signal),
  });
  return (
    <section className="admin-management">
      <PageHeader
        eyebrow="QUẢN TRỊ HANOIFOOD"
        title={title}
        description={description}
        action={
          <div className="admin-links">
            {create && (
              <Link className="button button-primary" to={create.to}>
                {create.label}
              </Link>
            )}
            <Button
              variant="secondary"
              busy={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCw size={17} /> Làm mới danh sách
            </Button>
          </div>
        }
      />
      <Card>
        <FilterForm
          key={params.toString()}
          fields={fields}
          dates={dates}
          initial={params}
          onApply={setParams}
        />
      </Card>
      <AdminReadState query={query}>
        {(data) => (
          <Card>
            <div className="admin-table-title">
              <h2>{title}</h2>
              <span>
                {data.totalElements} kết quả · tối đa {data.size}/trang
              </span>
            </div>
            <p className="muted admin-table-hint">
              Bảng có thể cuộn ngang trong khung để xem đủ thông tin.
            </p>
            <AdminTable caption={title} rows={data.items} columns={columns} rowKey={rowKey} />
            <Pagination
              page={data.page + 1}
              count={data.totalPages}
              onChange={(page) => {
                const next = new URLSearchParams(params);
                next.set('page', String(page - 1));
                setParams(next);
              }}
            />
          </Card>
        )}
      </AdminReadState>
    </section>
  );
}
const statusFilter: Filter = {
  key: 'accountStatus',
  label: 'Trạng thái tài khoản',
  options: ['ACTIVE', 'DISABLED'],
  labels: { ACTIVE: 'Đang hoạt động', DISABLED: 'Đã vô hiệu hóa' },
};
const open = (to: string, label = 'Xem chi tiết') => (
  <Link className="text-link" to={to}>
    {label} <ArrowUpRight size={15} />
  </Link>
);
const linked = (id: number | null, status: string | null) =>
  id ? (
    <div>
      <span>#{id}</span>
      <br />
      <AdminStatus value={status} />
    </div>
  ) : (
    'Chưa liên kết'
  );
const accounts: Column<AccountRow>[] = [
  {
    title: 'Tài khoản',
    cell: (r) => (
      <>
        <strong>#{r.accountId}</strong>
        <p>{r.email}</p>
        {r.name && <small>{r.name}</small>}
      </>
    ),
  },
  { title: 'Vai trò', cell: (r) => roleName[r.role] },
  { title: 'Trạng thái', cell: (r) => <AdminStatus value={r.status} /> },
  { title: 'Ngày tạo', cell: (r) => adminTime(r.createdAt) },
  { title: 'Thao tác', cell: (r) => open(`/admin/accounts/${r.accountId}`) },
];
export function AdminAccountsPage() {
  return (
    <AdminList
      module="accounts"
      title="Quản lý tài khoản"
      description="Định danh, vai trò và trạng thái tài khoản toàn hệ thống."
      load={adminApi.accounts}
      rowKey={(r) => r.accountId}
      columns={accounts}
      fields={[
        { key: 'role', label: 'Vai trò', options: roleSchema.options, labels: roleName },
        { ...statusFilter, key: 'status' },
      ]}
    />
  );
}
const customers: Column<CustomerRow>[] = [
  {
    title: 'Khách hàng',
    cell: (r) => (
      <>
        <strong>
          #{r.customerId} · {r.name}
        </strong>
        <p>{r.email}</p>
      </>
    ),
  },
  { title: 'Tài khoản', cell: (r) => linked(r.accountId, r.accountStatus) },
  { title: 'Tổng đơn', cell: (r) => r.orderCount },
  { title: 'Ngày tạo', cell: (r) => adminTime(r.createdAt) },
  { title: 'Chi tiết', cell: (r) => open(`/admin/customers/${r.customerId}`) },
];
export function AdminCustomersPage() {
  return (
    <AdminList
      module="customers"
      title="Khách hàng"
      description="Hồ sơ và số đơn mọi thời gian; không thao tác giỏ hàng của khách."
      load={adminApi.customers}
      rowKey={(r) => r.customerId}
      columns={customers}
      fields={[statusFilter]}
    />
  );
}
const restaurants: Column<RestaurantRow>[] = [
  {
    title: 'Nhà hàng',
    cell: (r) => (
      <>
        <strong>
          #{r.restaurantId} · {r.name}
        </strong>
        <p>{r.address}</p>
      </>
    ),
  },
  {
    title: 'Hoạt động',
    cell: (r) =>
      r.restaurantStatus === null
        ? 'Chưa ghi nhận'
        : r.restaurantStatus
          ? 'Đang mở cửa'
          : 'Đang đóng cửa',
  },
  { title: 'Tài khoản', cell: (r) => linked(r.accountId, r.accountStatus) },
  {
    title: 'Mọi thời gian',
    cell: (r) => (
      <>
        {r.orderCount} đơn · {r.menuCount} món
      </>
    ),
  },
  { title: 'Chi tiết', cell: (r) => open(`/admin/restaurants/${r.restaurantId}`) },
];
export function AdminRestaurantsPage() {
  return (
    <AdminList
      module="restaurants"
      title="Quản lý nhà hàng"
      create={{ to: '/admin/restaurants/new', label: 'Tạo nhà hàng' }}
      description="Theo dõi hoạt động và mở hồ sơ nhà hàng."
      load={adminApi.restaurants}
      rowKey={(r) => r.restaurantId}
      columns={restaurants}
      fields={[
        statusFilter,
        {
          key: 'activity',
          label: 'Hoạt động',
          options: ['open', 'closed'],
          labels: { open: 'Đang mở cửa', closed: 'Đang đóng cửa' },
        },
      ]}
    />
  );
}
const drivers: Column<DriverRow>[] = [
  {
    title: 'Tài xế',
    cell: (r) => (
      <>
        <strong>
          #{r.driverId} · {r.name}
        </strong>
        <p>{r.licensePlate || 'Chưa có biển số'}</p>
      </>
    ),
  },
  {
    title: 'Nhận chuyến',
    cell: (r) =>
      r.driveStatus === null
        ? 'Chưa ghi nhận'
        : r.driveStatus
          ? 'Đang nhận mới'
          : 'Đã ngừng nhận mới',
  },
  { title: 'Tài khoản', cell: (r) => linked(r.accountId, r.accountStatus) },
  {
    title: 'Công việc',
    cell: (r) => (
      <>
        {r.deliveryCount} chuyến mọi thời gian
        <br />
        {r.activeDeliveryCount} đang xử lý
      </>
    ),
  },
  { title: 'Chi tiết', cell: (r) => open(`/admin/drivers/${r.driverId}`) },
];
export function AdminDriversPage() {
  return (
    <AdminList
      module="drivers"
      title="Quản lý tài xế"
      create={{ to: '/admin/drivers/new', label: 'Tạo tài xế' }}
      description="Trạng thái nhận chuyến khác với trạng thái tài khoản đăng nhập."
      load={adminApi.drivers}
      rowKey={(r) => r.driverId}
      columns={drivers}
      fields={[
        statusFilter,
        {
          key: 'activity',
          label: 'Nhận chuyến',
          options: ['receiving', 'paused'],
          labels: { receiving: 'Đang nhận mới', paused: 'Ngừng nhận mới' },
        },
      ]}
    />
  );
}
const orders: Column<OrderRow>[] = [
  {
    title: 'Đơn hàng',
    cell: (r) => (
      <>
        <strong>#{r.orderId}</strong>
        <p>{adminTime(r.createdAt)}</p>
      </>
    ),
  },
  {
    title: 'Khách / nhà hàng',
    cell: (r) => (
      <>
        {r.customer?.name || 'Chưa ghi nhận'}
        <br />
        {r.restaurant?.name || 'Chưa ghi nhận'}
      </>
    ),
  },
  {
    title: 'Giá trị đơn',
    cell: (r) => (r.totalAmount === null ? 'Chưa ghi nhận' : money(r.totalAmount)),
  },
  {
    title: 'Đơn / thanh toán',
    cell: (r) => (
      <>
        <AdminStatus value={r.orderStatus} kind="order" />
        <br />
        <AdminStatus value={r.paymentStatus} kind="payment" />
      </>
    ),
  },
  { title: 'Giao hàng', cell: (r) => <AdminStatus value={r.deliveryStatus} kind="delivery" /> },
  { title: 'Chi tiết', cell: (r) => open(`/admin/orders/${r.orderId}`) },
];
export function AdminOrdersPage() {
  return (
    <AdminList
      module="orders"
      title="Giám sát đơn hàng"
      description="Bộ lọc thời gian theo ngày tạo đơn; ADMIN theo dõi trạng thái do nghiệp vụ cập nhật."
      load={adminApi.orders}
      rowKey={(r) => r.orderId}
      columns={orders}
      dates
      fields={[
        {
          key: 'status',
          label: 'Trạng thái đơn',
          options: Object.keys(orderLabels),
          labels: orderLabels,
        },
        {
          key: 'paymentStatus',
          label: 'Thanh toán',
          options: Object.keys(paymentLabels),
          labels: paymentLabels,
        },
        { key: 'restaurantId', label: 'Mã nhà hàng', numeric: true },
        { key: 'customerId', label: 'Mã khách hàng', numeric: true },
      ]}
    />
  );
}
const deliveries: Column<DeliveryRow>[] = [
  {
    title: 'Chuyến / đơn',
    cell: (r) => (
      <>
        <strong>#{r.deliveryId}</strong>
        <p>Đơn #{r.orderId}</p>
      </>
    ),
  },
  {
    title: 'Tài xế',
    cell: (r) =>
      r.driver ? (
        <>
          {r.driver.name} · #{r.driver.id}
        </>
      ) : (
        'Chưa có tài xế'
      ),
  },
  { title: 'Nhà hàng', cell: (r) => r.restaurant?.name || 'Chưa ghi nhận' },
  { title: 'Trạng thái', cell: (r) => <AdminStatus value={r.deliveryStatus} kind="delivery" /> },
  {
    title: 'Mốc giao hàng',
    cell: (r) => (
      <>
        Lấy: {adminTime(r.pickupTime)}
        <br />
        Giao: {adminTime(r.deliveredTime)}
      </>
    ),
  },
  { title: 'Chi tiết', cell: (r) => open(`/admin/deliveries/${r.deliveryId}`) },
];
export function AdminDeliveriesPage() {
  return (
    <AdminList
      module="deliveries"
      title="Giám sát giao hàng"
      description="Kỳ lọc theo ngày tạo đơn, không phải thời gian phân công. Tài xế tự nhận theo nghiệp vụ hiện tại."
      load={adminApi.deliveries}
      rowKey={(r) => r.deliveryId}
      columns={deliveries}
      dates
      fields={[
        {
          key: 'status',
          label: 'Trạng thái chuyến',
          options: Object.keys(deliveryLabels),
          labels: deliveryLabels,
        },
        { key: 'driverId', label: 'Mã tài xế', numeric: true },
        { key: 'restaurantId', label: 'Mã nhà hàng', numeric: true },
      ]}
    />
  );
}
const payments: Column<PaymentRow>[] = [
  {
    title: 'Thanh toán / đơn',
    cell: (r) => (
      <>
        <strong>#{r.paymentId}</strong>
        <p>Đơn #{r.orderId}</p>
      </>
    ),
  },
  { title: 'Phương thức', cell: (r) => r.methodCode || 'Chưa ghi nhận' },
  { title: 'Số tiền', cell: (r) => money(r.amount) },
  { title: 'Trạng thái', cell: (r) => <AdminStatus value={r.paymentStatus} kind="payment" /> },
  {
    title: 'Thời gian',
    cell: (r) => (
      <>
        Tạo: {adminTime(r.createdAt)}
        <br />
        Ghi nhận thu: {adminTime(r.paidAt)}
      </>
    ),
  },
  { title: 'Chi tiết', cell: (r) => open(`/admin/payments/orders/${r.orderId}`) },
];
export function AdminPaymentsPage() {
  return (
    <AdminList
      module="payments"
      title="Giám sát thanh toán"
      description="Kỳ lọc theo ngày tạo Payment. COD là phương thức; SUCCESS mới là trạng thái thanh toán đã ghi nhận."
      load={adminApi.payments}
      rowKey={(r) => r.paymentId}
      columns={payments}
      dates
      fields={[
        {
          key: 'status',
          label: 'Trạng thái thanh toán',
          options: Object.keys(paymentLabels),
          labels: paymentLabels,
        },
        { key: 'method', label: 'Mã phương thức' },
      ]}
    />
  );
}
export function ReviewDetail({ row }: { row: ReviewRow }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Xem đánh giá #{row.ratingId}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content admin-review-dialog">
          <Dialog.Title>Đánh giá #{row.ratingId}</Dialog.Title>
          <Dialog.Description>
            Nội dung do khách hàng gửi, hiển thị theo dữ liệu máy chủ.
          </Dialog.Description>
          <AdminFacts
            entries={[
              { label: 'Số sao', value: `${row.score}/5` },
              { label: 'Nhà hàng', value: row.restaurant?.name },
              { label: 'Khách hàng', value: row.customer?.name },
              { label: 'Ngày gửi', value: adminTime(row.createdAt) },
            ]}
          />
          <p className="admin-review-comment">{row.comment || 'Không có nội dung chữ.'}</p>
          <Dialog.Close className="dialog-close icon-button" aria-label="Đóng chi tiết đánh giá">
            <X size={19} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
const reviews: Column<ReviewRow>[] = [
  {
    title: 'Đánh giá',
    cell: (r) => (
      <>
        <strong>
          #{r.ratingId} · {r.score}/5 sao
        </strong>
        <p className="admin-review-preview">{r.comment || 'Không có nội dung chữ.'}</p>
      </>
    ),
  },
  { title: 'Nhà hàng', cell: (r) => r.restaurant?.name || 'Chưa ghi nhận' },
  { title: 'Khách hàng', cell: (r) => r.customer?.name || 'Chưa ghi nhận' },
  { title: 'Ngày gửi', cell: (r) => adminTime(r.createdAt) },
  { title: 'Chi tiết', cell: (r) => <ReviewDetail row={r} /> },
];
export function AdminReviewsPage() {
  return (
    <AdminList
      module="reviews"
      title="Đánh giá khách hàng"
      description="Đọc và lọc đánh giá; nội dung gốc được giữ nguyên."
      load={adminApi.reviews}
      rowKey={(r) => r.ratingId}
      columns={reviews}
      dates
      fields={[
        { key: 'restaurantId', label: 'Mã nhà hàng', numeric: true },
        { key: 'score', label: 'Số sao', options: ['1', '2', '3', '4', '5'] },
      ]}
    />
  );
}
