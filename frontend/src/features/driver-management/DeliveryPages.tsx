import { useSession } from '@/features/auth/AuthProvider';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, MapPin } from 'lucide-react';
import { Button, Input, Select, PageHeader, Pagination, Card } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Skeleton, ErrorState, EmptyState } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { pageFrom, validId } from '@/features/public/model';
import { OrderContents, OrderPaymentDelivery } from '@/features/orders/OrderComponents';
import '@/features/orders/orders.css';
import { driverApi } from './api';
import { deliveryStatusSchema, deliveryLabels, terminal } from './model';
import {
  DeliveryCard,
  DeliveryStatusBadge,
  DeliveryTimeline,
  DeliveryActionButtons,
} from './Components';
import { useDriver, useVisible, useDriverAction, DriverSection, ActionNotice } from './shared';
function Filters({ history = false }: { history?: boolean }) {
  const [params, setParams] = useSearchParams();
  const update = (name: string, value: string) =>
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.set(name, value);
      next.delete('page');
      return next;
    });
  return (
    <form
      className="driver-toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        update('q', String(new FormData(event.currentTarget).get('q') || ''));
      }}
    >
      <Input
        name="q"
        label="Tìm mã chuyến, đơn hoặc nhà hàng"
        maxLength={100}
        key={params.get('q')}
        defaultValue={params.get('q') || ''}
      />
      <Select
        label="Lọc trạng thái chuyến"
        value={params.get('status') || ''}
        onChange={(e) => update('status', e.target.value)}
      >
        <option value="">Tất cả trạng thái</option>
        {(history
          ? (['DELIVERED', 'CANCELLED'] as const)
          : (['PENDING', 'PICKED_UP', 'DELIVERING'] as const)
        ).map((status) => (
          <option key={status} value={status}>
            {deliveryLabels[status]}
          </option>
        ))}
      </Select>
      <Select
        label="Sắp xếp chuyến giao"
        value={params.get('sort') === 'oldest' ? 'oldest' : 'newest'}
        onChange={(e) => update('sort', e.target.value)}
      >
        <option value="newest">Mã chuyến mới nhất</option>
        <option value="oldest">Mã chuyến cũ nhất</option>
      </Select>
      <Button type="submit">Tìm chuyến</Button>
    </form>
  );
}
export function DriverDeliveriesPage({ history = false }: { history?: boolean }) {
  const { key } = useDriver(),
    visible = useVisible();
  const [params, setParams] = useSearchParams();
  const parsed = deliveryStatusSchema.safeParse(params.get('status'));
  const filters = {
    page: pageFrom(params),
    size: 12,
    scope: history ? 'history' : 'active',
    q: (params.get('q') || '').slice(0, 100),
    status: parsed.success ? parsed.data : undefined,
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
  };
  const data = useQuery({
    queryKey: [...key, 'deliveries', filters],
    queryFn: ({ signal }) => driverApi.deliveries(filters, signal),
    refetchInterval: !history && visible ? 20000 : false,
    refetchIntervalInBackground: false,
  });
  return (
    <DriverSection>
      <PageHeader
        title={history ? 'Lịch sử giao hàng' : 'Chuyến giao của bạn'}
        description={
          history
            ? 'Các chuyến đã kết thúc, giới hạn trong tài xế đã xác thực.'
            : 'Các chuyến bạn đã nhận và đang xử lý.'
        }
        action={
          <Button variant="secondary" onClick={() => void data.refetch()}>
            Làm mới chuyến giao
          </Button>
        }
      />
      {!history && (
        <Link className="button button-primary" to="/driver/available">
          Tìm chuyến có thể nhận
        </Link>
      )}
      <Filters history={history} />
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <>
          <p className="driver-note">
            {data.data.totalElements} chuyến trong kết quả · phân trang trên máy chủ
          </p>
          {data.data.items.length ? (
            data.data.items.map((delivery) => (
              <DeliveryCard key={delivery.deliveryId} delivery={delivery} />
            ))
          ) : (
            <EmptyState
              title="Chưa có chuyến phù hợp"
              description="Đổi bộ lọc hoặc làm mới để kiểm tra chuyến giao của bạn."
            />
          )}
          <Pagination
            page={data.data.page + 1}
            count={data.data.totalPages}
            onChange={(n) =>
              setParams((old) => {
                const next = new URLSearchParams(old);
                next.set('page', String(n));
                return next;
              })
            }
          />
        </>
      )}
    </DriverSection>
  );
}
export function DriverHistoryPage() {
  return <DriverDeliveriesPage history />;
}
export function DriverAvailablePage() {
  const session = useSession();
  const { account, key } = useDriver(),
    visible = useVisible(),
    navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  type Pending = { id: number; accountId: number; generation: number };
  const current = (task: Pending) => {
    const value = session.getSnapshot();
    return value.account?.accountId === task.accountId && value.generation === task.generation;
  };
  const [unknown, setUnknown] = useState<Pending>(),
    [checking, setChecking] = useState(false),
    [result, setResult] = useState('');
  const profile = useQuery({
    queryKey: [...key, 'profile'],
    queryFn: ({ signal }) => driverApi.profile(signal),
  });
  const filters = {
    page: pageFrom(params),
    size: 12,
    q: (params.get('q') || '').slice(0, 100),
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
  };
  const data = useQuery({
    queryKey: [...key, 'available', filters],
    queryFn: ({ signal }) => driverApi.available(filters, signal),
    enabled: profile.data?.driveStatus === true,
    refetchInterval: visible ? 20000 : false,
    refetchIntervalInBackground: false,
  });
  const action = useDriverAction((id: number) => driverApi.accept(id));
  const reconcile = async (task: Pending) => {
    if (!current(task)) return;
    const id = task.id;
    setChecking(true);
    setResult('');
    try {
      await driverApi.detail(id);
      if (!current(task)) return;
      navigate(`/driver/deliveries/${id}`);
      return;
    } catch (error) {
      if (!current(task)) return;
      if (!(error instanceof ApiError) || error.status !== 404) {
        setResult(
          'Chưa đọc được kết quả nhận chuyến. Giữ nguyên thao tác cho đến khi kiểm tra lại.',
        );
        return;
      }
      try {
        const pool = await driverApi.available({ q: String(id), size: 50 });
        if (!current(task)) return;
        setResult(
          pool.items.some((item) => item.deliveryId === id)
            ? 'Máy chủ xác nhận chuyến hiện chưa được nhận. Bạn có thể chủ động chọn nhận sau khi kiểm tra.'
            : 'Chuyến không còn khả dụng hoặc không thuộc tài xế của bạn.',
        );
        setUnknown(undefined);
        await data.refetch();
      } catch {
        setResult('Chưa xác minh được trạng thái. Không gửi lại yêu cầu nhận chuyến.');
      }
    } finally {
      setChecking(false);
    }
  };
  return (
    <DriverSection>
      <PageHeader
        title="Chuyến có thể nhận"
        description="Nhận chuyến theo cơ chế hiện có. Địa chỉ khách chỉ được mở sau khi bạn nhận thành công."
        action={
          <Button
            variant="secondary"
            disabled={profile.data?.driveStatus !== true}
            onClick={() => void data.refetch()}
          >
            Làm mới chuyến có thể nhận
          </Button>
        }
      />
      <ActionNotice action={action} />
      {result && <Alert>{result}</Alert>}
      {unknown && current(unknown) && (
        <Alert>
          Đang đối chiếu chuyến #{unknown.id}. Không gửi lại yêu cầu nhận.
          <Button busy={checking} onClick={() => void reconcile(unknown)}>
            Kiểm tra kết quả nhận chuyến
          </Button>
        </Alert>
      )}
      {profile.isPending ? (
        <Skeleton />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : profile.data.driveStatus !== true ? (
        <EmptyState
          title="Bạn đang tạm ngừng nhận chuyến"
          description="Bật trạng thái trong hồ sơ khi sẵn sàng. Các chuyến đã nhận vẫn có thể tiếp tục."
          action={
            <Link to="/driver/profile" className="button button-primary">
              Mở hồ sơ tài xế
            </Link>
          }
        />
      ) : (
        <>
          <form
            className="driver-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              setParams({ q: String(new FormData(event.currentTarget).get('q') || '') });
            }}
          >
            <Input
              label="Tìm chuyến có thể nhận"
              name="q"
              defaultValue={filters.q}
              maxLength={100}
            />
            <Button type="submit">Tìm chuyến mới</Button>
          </form>
          {data.isPending ? (
            <Skeleton />
          ) : data.isError ? (
            <ErrorState error={data.error} onRetry={() => void data.refetch()} />
          ) : (
            <>
              <p className="driver-note">
                {data.data.totalElements} chuyến đang khả dụng. Nhà hàng có thể còn chuẩn bị món;
                chỉ lấy khi đơn sẵn sàng.
              </p>
              {data.data.items.length ? (
                data.data.items.map((item) => (
                  <Card key={item.deliveryId} className="driver-trip-card">
                    <h2>
                      Chuyến #{item.deliveryId} · Đơn #{item.orderId}
                    </h2>
                    <h3>{item.restaurantName}</h3>
                    <p>{item.restaurantAddress}</p>
                    <ConfirmDialog
                      trigger={
                        <Button disabled={action.busy || checking || !!unknown}>
                          Nhận chuyến #{item.deliveryId}
                        </Button>
                      }
                      title="Nhận chuyến giao này?"
                      description="Chuyến chỉ thuộc bạn khi máy chủ xác nhận. Nếu tài xế khác đã nhận, hệ thống sẽ báo xung đột."
                      confirm="Xác nhận nhận chuyến"
                      busy={action.busy || checking}
                      onConfirm={async () => {
                        const task = {
                          id: item.deliveryId,
                          accountId: account.accountId,
                          generation: session.getSnapshot().generation,
                        };
                        const accepted = await action.run(item.deliveryId);
                        if (!current(task)) return;
                        if (accepted) navigate(`/driver/deliveries/${item.deliveryId}`);
                        else {
                          setUnknown(task);
                          await reconcile(task);
                        }
                      }}
                    />
                  </Card>
                ))
              ) : (
                <EmptyState
                  title="Chưa có chuyến khả dụng"
                  description="Không có chuyến phù hợp; bạn có thể làm mới sau."
                />
              )}
              <Pagination
                page={data.data.page + 1}
                count={data.data.totalPages}
                onChange={(n) => setParams({ q: filters.q, page: String(n) })}
              />
            </>
          )}
        </>
      )}
    </DriverSection>
  );
}
export function DriverDeliveryDetailPage() {
  const { id } = useParams(),
    { key } = useDriver(),
    visible = useVisible();
  const valid = validId(id || '');
  const data = useQuery({
    queryKey: [...key, 'delivery', id],
    queryFn: ({ signal }) => driverApi.detail(Number(id), signal),
    enabled: !!valid,
    refetchInterval: (query) =>
      visible && query.state.data && !terminal(query.state.data.deliveryStatus) ? 15000 : false,
    refetchIntervalInBackground: false,
  });
  const action = useDriverAction(
    ({ id, status }: { id: number; status: 'PICKED_UP' | 'DELIVERING' | 'DELIVERED' }) =>
      driverApi.transition(id, status),
  );
  if (!valid) return <ErrorState error={new ApiError(404, '404')} />;
  if (data.isPending) return <Skeleton />;
  if (data.isError) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;
  const detail = data.data;
  return (
    <DriverSection>
      <Link className="text-link" to="/driver/deliveries">
        Về chuyến giao của bạn
      </Link>
      <PageHeader
        title={`Chuyến giao #${detail.deliveryId}`}
        description={`Đơn hàng #${detail.order.orderId}`}
        action={
          <Button variant="secondary" onClick={() => void data.refetch()}>
            Làm mới chuyến
          </Button>
        }
      />
      <DeliveryStatusBadge status={detail.deliveryStatus} />
      <ActionNotice action={action} />
      <div className="driver-detail-grid">
        <Card>
          <h2>
            <Store size={20} /> Điểm lấy hàng
          </h2>
          <h3>{detail.pickup.name}</h3>
          <p>{detail.pickup.address}</p>
        </Card>
        <Card>
          <h2>
            <MapPin size={20} /> Điểm giao hàng
          </h2>
          <h3>{detail.order.customer.name}</h3>
          <p>{detail.order.deliveryAddress}</p>
          <p className="driver-note">Chỉ dùng thông tin này để thực hiện chuyến giao.</p>
        </Card>
      </div>
      <div className="driver-action-bar">
        <DeliveryActionButtons
          detail={detail}
          busy={action.busy}
          onAction={async (status) => {
            await action.run({ id: detail.deliveryId, status });
          }}
        />
      </div>
      <div className="driver-detail-grid">
        <DeliveryTimeline detail={detail} />
        <OrderContents order={detail.order} />
        <OrderPaymentDelivery order={detail.order} />
      </div>
    </DriverSection>
  );
}
