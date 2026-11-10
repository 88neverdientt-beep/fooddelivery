import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ShieldCheck, Search, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button, Card, Input, Select, Badge, PageHeader } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { money } from '@/features/public/api';
import {
  parseOrderId,
  formatOrderDate,
  paymentLabels,
  orderLabels,
  type Order,
} from '@/features/orders/model';
import {
  OrderContents,
  OrderPaymentDelivery,
  OrderTimeline,
} from '@/features/orders/OrderComponents';
import { adminExistingApi, adminKey } from './existing-api';
import './admin.css';

export function useAdminIdentity() {
  const account = useAuth().account;
  if (account?.role !== 'ADMIN') throw new ApiError(403, 'IDENTITY');
  return { account, key: adminKey(account.accountId) };
}
export function AdminReadState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (value: T) => ReactNode;
}) {
  if (query.isPending) return <Skeleton count={2} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}
export function AdminFacts({ entries }: { entries: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="admin-facts">
      {entries.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? 'Chưa ghi nhận'}</dd>
        </div>
      ))}
    </dl>
  );
}
function Lookup() {
  const navigate = useNavigate();
  const [kind, setKind] = useState('orders'),
    [number, setNumber] = useState(''),
    [error, setError] = useState('');
  return (
    <Card>
      <h2>
        <Search size={21} /> Tra cứu theo mã
      </h2>
      <p className="muted">Mở hồ sơ hoặc đơn hàng bằng mã trong hệ thống.</p>
      <form
        className="admin-filter-row"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const id = parseOrderId(number);
          if (!id) {
            setError('Nhập mã nguyên dương hợp lệ.');
            return;
          }
          setError('');
          navigate(`/admin/${kind}/${id}`);
        }}
      >
        <Select label="Loại thông tin" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="orders">Đơn hàng</option>
          <option value="customers">Khách hàng</option>
          <option value="drivers">Tài xế</option>
          <option value="payments/orders">Thanh toán theo đơn</option>
        </Select>
        <Input
          label="Mã cần tra cứu"
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          error={error}
        />
        <Button type="submit">Mở thông tin</Button>
      </form>
    </Card>
  );
}
export function AdminProfilePage() {
  const { key } = useAdminIdentity();
  const me = useQuery({
    queryKey: [...key, 'me'],
    queryFn: ({ signal }) => adminExistingApi.me(signal),
  });
  return (
    <section className="admin-management">
      <PageHeader
        eyebrow="QUẢN TRỊ HANOIFOOD"
        title="Hồ sơ quản trị viên"
        description="Thông tin định danh và bảo mật của phiên đang đăng nhập."
      />
      <AdminReadState query={me}>
        {(value) => (
          <div className="admin-profile-grid">
            <Card>
              <ShieldCheck className="admin-profile-symbol" size={32} />
              <h2>{value.email}</h2>
              <AdminFacts
                entries={[
                  { label: 'Mã tài khoản', value: value.accountId },
                  { label: 'Vai trò', value: 'Quản trị viên' },
                  {
                    label: 'Trạng thái tài khoản',
                    value: <Badge tone="success">Đang hoạt động</Badge>,
                  },
                ]}
              />
              <p className="muted">Định danh đăng nhập được quản lý bởi hệ thống tài khoản.</p>
              <div className="admin-links">
                <Link className="button button-secondary" to="/account/change-password">
                  Đổi mật khẩu
                </Link>
                <Link className="button button-secondary" to="/account">
                  Quản lý phiên đăng nhập
                </Link>
              </div>
            </Card>
            <Lookup />
          </div>
        )}
      </AdminReadState>
    </section>
  );
}
function DetailHeading({
  title,
  retry,
  busy,
}: {
  title: string;
  retry: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Link className="text-link" to="/admin/dashboard">
        <ArrowLeft size={17} /> Tổng quan quản trị
      </Link>
      <PageHeader
        title={title}
        action={
          <Button variant="secondary" busy={busy} onClick={retry}>
            <RefreshCw size={17} /> Làm mới thông tin
          </Button>
        }
      />
    </>
  );
}
export function AdminCustomerDetail() {
  const id = parseOrderId(useParams().id),
    { key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'customer', id],
    queryFn: ({ signal }) => adminExistingApi.customer(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <DetailHeading
        title={`Khách hàng #${id}`}
        retry={() => void query.refetch()}
        busy={query.isFetching}
      />
      <AdminReadState query={query}>
        {(profile) => (
          <Card>
            <h2>{profile.name}</h2>
            <AdminFacts
              entries={[
                { label: 'Email', value: profile.email },
                { label: 'Liên hệ', value: profile.phoneNumber },
                { label: 'Địa chỉ', value: profile.address },
                { label: 'Ngày tạo hồ sơ', value: formatOrderDate(profile.createdAt) },
              ]}
            />
          </Card>
        )}
      </AdminReadState>
    </section>
  );
}
export function AdminDriverDetail() {
  const id = parseOrderId(useParams().id),
    { key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'driver', id],
    queryFn: ({ signal }) => adminExistingApi.driver(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <DetailHeading
        title={`Tài xế #${id}`}
        retry={() => void query.refetch()}
        busy={query.isFetching}
      />
      <AdminReadState query={query}>
        {(profile) => (
          <Card>
            <h2>{profile.name}</h2>
            <AdminFacts
              entries={[
                { label: 'Email', value: profile.email },
                { label: 'Liên hệ', value: profile.phoneNumber },
                { label: 'Địa chỉ', value: profile.address },
                { label: 'Biển số xe', value: profile.licensePlate },
                {
                  label: 'Trạng thái nhận chuyến',
                  value:
                    profile.driveStatus === null
                      ? 'Chưa ghi nhận'
                      : profile.driveStatus
                        ? 'Đang nhận chuyến mới'
                        : 'Ngừng nhận chuyến mới',
                },
                { label: 'Ngày tạo hồ sơ', value: formatOrderDate(profile.createdAt) },
              ]}
            />
          </Card>
        )}
      </AdminReadState>
    </section>
  );
}
export function AdminOrderView({ order }: { order: Order }) {
  return (
    <>
      <Card>
        <h2>Thông tin đơn #{order.orderId}</h2>
        <AdminFacts
          entries={[
            { label: 'Trạng thái đơn', value: orderLabels[order.orderStatus] },
            {
              label: 'Khách hàng',
              value: (
                <Link to={`/admin/customers/${order.customer.customerId}`}>
                  {order.customer.name} · #{order.customer.customerId}
                </Link>
              ),
            },
            { label: 'Nhà hàng', value: order.restaurant.name },
            { label: 'Thời gian tạo đơn', value: formatOrderDate(order.createdAt) },
          ]}
        />
      </Card>
      <OrderTimeline order={order} />
      <OrderContents order={order} />
      <OrderPaymentDelivery order={order} />
    </>
  );
}
export function AdminOrderDetail() {
  const id = parseOrderId(useParams().id),
    { key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'order', id],
    queryFn: ({ signal }) => adminExistingApi.order(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <DetailHeading
        title={`Giám sát đơn #${id}`}
        retry={() => void query.refetch()}
        busy={query.isFetching}
      />
      <AdminReadState query={query}>{(order) => <AdminOrderView order={order} />}</AdminReadState>
    </section>
  );
}
export function AdminPaymentDetail() {
  const id = parseOrderId(useParams().orderId),
    { key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'payment-by-order', id],
    queryFn: ({ signal }) => adminExistingApi.payment(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <DetailHeading
        title={`Thanh toán của đơn #${id}`}
        retry={() => void query.refetch()}
        busy={query.isFetching}
      />
      <AdminReadState query={query}>
        {(payment) => (
          <Card>
            <h2>Thanh toán #{payment.paymentId}</h2>
            <AdminFacts
              entries={[
                { label: 'Phương thức', value: payment.paymentMethod },
                { label: 'Trạng thái thanh toán', value: paymentLabels[payment.paymentStatus] },
                { label: 'Số tiền', value: money(payment.amount) },
                { label: 'Ghi nhận thanh toán lúc', value: formatOrderDate(payment.paidAt) },
                { label: 'Ghi nhận hoàn tiền lúc', value: formatOrderDate(payment.refundedAt) },
              ]}
            />
            <Link className="button button-secondary" to={`/admin/orders/${id}`}>
              Xem đơn liên quan
            </Link>
          </Card>
        )}
      </AdminReadState>
    </section>
  );
}
