import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, PageHeader, Pagination, Badge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState, Skeleton, EmptyState } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { money } from '@/features/public/api';
import { pageFrom } from '@/features/public/model';
import {
  orderLabels,
  orderStatusSchema,
  terminalOrder,
  canCancelOrder,
  parseOrderId,
  formatOrderDate,
  type Order,
} from '@/features/orders/model';
import {
  OrderContents,
  OrderTimeline,
  OrderPaymentDelivery,
} from '@/features/orders/OrderComponents';
import { restaurantApi } from './api';
import { nextRestaurantStatus } from './model';
import { ManagementSection, useRestaurant, useVisible, useAction, ActionNotice } from './shared';
import '@/features/orders/orders.css';
import { OrderExport } from '@/features/orders/OrderExport';
export function RestaurantOrdersPage() {
  const { key } = useRestaurant();
  const [params, setParams] = useSearchParams();
  const visible = useVisible();
  const state = orderStatusSchema.safeParse(params.get('status'));
  const filters = {
    page: pageFrom(params),
    size: 12,
    q: (params.get('q') || '').slice(0, 100),
    status: state.success ? state.data : undefined,
    sort: ['oldest', 'total-desc'].includes(params.get('sort') || '')
      ? params.get('sort')!
      : 'newest',
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
  };
  const data = useQuery({
    queryKey: [...key, 'orders', filters],
    queryFn: ({ signal }) => restaurantApi.orders(filters, signal),
    refetchInterval: (query) =>
      visible && query.state.data?.items.some((order) => !terminalOrder(order.orderStatus))
        ? 20000
        : false,
    refetchIntervalInBackground: false,
  });
  const change = (field: string, value: string) =>
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(field, value);
      else next.delete(field);
      if (field !== 'page') next.delete('page');
      return next;
    });
  return (
    <ManagementSection>
      <PageHeader
        title="Đơn hàng nhà hàng"
        description="Chỉ các đơn thuộc nhà hàng của bạn, cập nhật theo trạng thái máy chủ."
        action={
          <div className="management-actions">
            <OrderExport role="RESTAURANT" key={JSON.stringify(filters)} filters={filters} />
            <Button variant="secondary" onClick={() => void data.refetch()}>
              Làm mới đơn hàng
            </Button>{' '}
          </div>
        }
      />
      <form
        className="management-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          setParams((old) => {
            const next = new URLSearchParams(old);
            next.delete('page');
            for (const field of ['q', 'from', 'to']) {
              const value = String(values.get(field) || '');
              if (value) next.set(field, value);
              else next.delete(field);
            }
            return next;
          });
        }}
      >
        <Input
          key={filters.q}
          name="q"
          label="Tìm mã đơn hoặc khách hàng"
          defaultValue={filters.q}
          maxLength={100}
        />
        <Input type="date" name="from" label="Đơn từ ngày" defaultValue={filters.from} />
        <Input type="date" name="to" label="Đơn đến ngày" defaultValue={filters.to} />
        <Button type="submit">Tìm đơn hàng</Button>
      </form>
      <div className="management-toolbar">
        <Select
          label="Lọc trạng thái đơn nhà hàng"
          value={filters.status || ''}
          onChange={(e) => change('status', e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {orderStatusSchema.options.map((status) => (
            <option value={status} key={status}>
              {orderLabels[status]}
            </option>
          ))}
        </Select>
        <Select
          label="Sắp xếp đơn nhà hàng"
          value={filters.sort}
          onChange={(e) => change('sort', e.target.value)}
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="total-desc">Tổng tiền giảm dần</option>
        </Select>
      </div>
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <>
          <p className="muted">{data.data.totalElements} đơn trong kết quả</p>
          {!data.data.items.length ? (
            <EmptyState
              title="Chưa có đơn phù hợp"
              description="Đơn mới của khách hàng sẽ được hiển thị tại đây."
            />
          ) : (
            data.data.items.map((order) => (
              <article className="management-row" key={order.orderId}>
                <div>
                  <h2>Đơn hàng #{order.orderId}</h2>
                  <p>
                    {order.customer.name} · {formatOrderDate(order.createdAt)}
                  </p>
                  <p>
                    {order.orderDetails
                      .map((item) => `${item.quantity} × ${item.foodItemName}`)
                      .join(', ')}
                  </p>
                  <Badge>{orderLabels[order.orderStatus]}</Badge> ·{' '}
                  <strong>{money(order.totalAmount)}</strong>
                </div>
                <Link
                  to={`/restaurant/orders/${order.orderId}`}
                  className="button button-secondary"
                >
                  Xem đơn #{order.orderId}
                </Link>
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
export function RestaurantOrderDetail() {
  const { id } = useParams();
  const number = parseOrderId(id);
  const { key } = useRestaurant();
  const visible = useVisible();
  const [selected, setSelected] = useState<{ order: Order; status: string } | null>(null);
  const data = useQuery({
    queryKey: [...key, 'order', number],
    queryFn: ({ signal }) => restaurantApi.order(number!, signal),
    enabled: !!number,
    refetchInterval: (query) =>
      visible && query.state.data && !terminalOrder(query.state.data.orderStatus) ? 20000 : false,
    refetchIntervalInBackground: false,
  });
  const action = useAction(({ order, status }: { order: Order; status: string }) =>
    status === 'CANCELLED' ? restaurantApi.cancel(order) : restaurantApi.transition(order, status),
  );
  if (!number) return <ErrorState error={new ApiError(404, '404')} />;
  if (data.isPending) return <Skeleton />;
  if (data.isError) return <ErrorState error={data.error} onRetry={() => void data.refetch()} />;
  const order = data.data,
    next = nextRestaurantStatus(order.orderStatus);
  const actionNames: Record<string, string> = {
    CONFIRMED: 'Xác nhận đơn',
    PREPARING: 'Bắt đầu chuẩn bị',
    READY: 'Sẵn sàng giao',
  };
  return (
    <ManagementSection>
      <Link to="/restaurant/orders" className="text-link">
        Về đơn hàng nhà hàng
      </Link>
      <PageHeader
        title={`Đơn hàng #${order.orderId}`}
        description={`${order.customer.name} · ${formatOrderDate(order.createdAt)}`}
        action={
          <Button variant="secondary" onClick={() => void data.refetch()}>
            Làm mới đơn
          </Button>
        }
      />
      <p>
        <Badge>{orderLabels[order.orderStatus]}</Badge>
      </p>
      <ActionNotice action={action} />
      <div className="management-actions">
        {next && (
          <ConfirmDialog
            key={'next' + id}
            trigger={
              <Button disabled={action.busy} onClick={() => setSelected({ order, status: next })}>
                {actionNames[next]}
              </Button>
            }
            title="Xác nhận cập nhật đơn?"
            description={`Trạng thái yêu cầu: ${orderLabels[(selected?.status || next) as keyof typeof orderLabels]}. Máy chủ sẽ kiểm tra trạng thái hiện tại trước khi cập nhật.`}
            confirm="Xác nhận trạng thái"
            busy={action.busy}
            onConfirm={async () => {
              if (selected) await action.run(selected);
            }}
          />
        )}
        {canCancelOrder(order) && (
          <ConfirmDialog
            key={'cancel' + id}
            trigger={
              <Button
                variant="danger"
                disabled={action.busy}
                onClick={() => setSelected({ order, status: 'CANCELLED' })}
              >
                Từ chối / hủy đơn
              </Button>
            }
            title="Hủy đơn của nhà hàng?"
            description="Chỉ hủy khi trạng thái đơn, giao hàng và thanh toán cho phép. Lịch sử vẫn được giữ lại."
            confirm="Xác nhận hủy của nhà hàng"
            busy={action.busy}
            onConfirm={async () => {
              if (selected) await action.run(selected);
            }}
          />
        )}
      </div>
      <div className="order-detail-grid">
        <OrderContents order={order} />
        <OrderTimeline order={order} />
        <OrderPaymentDelivery order={order} />
      </div>
      <p className="management-note">
        Nhà hàng không xác nhận thu COD hoặc đánh dấu đã giao. Những bước đó thuộc luồng tài xế.
      </p>
    </ManagementSection>
  );
}
