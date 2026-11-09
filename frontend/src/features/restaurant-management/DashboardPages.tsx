import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Button, PageHeader } from '@/components/ui';
import { Alert, ErrorState, Skeleton, EmptyState } from '@/components/feedback';
import { money } from '@/features/public/api';
import { orderLabels, type OrderStatus } from '@/features/orders/model';
import { restaurantApi } from './api';
import { periodValid, type Analytics } from './model';
import { ManagementSection, useRestaurant } from './shared';
export function Metrics({ data }: { data: Analytics }) {
  const values = [
    ['Tổng đơn trong kỳ', String(data.totalOrders)],
    ['Đơn đang chờ', String(data.states.PENDING || 0)],
    ['Đang chuẩn bị', String(data.states.PREPARING || 0)],
    ['Đơn hoàn thành', String(data.states.COMPLETED || 0)],
    ['Món bật bán hiện tại', String(data.activeMenuCount)],
    [
      'Điểm đánh giá · tất cả thời gian',
      data.ratingsCount && data.averageRating !== null
        ? `${data.averageRating.toFixed(2)} / 5 · ${data.ratingsCount} đánh giá`
        : 'Chưa có đánh giá',
    ],
  ];
  return (
    <div className="management-grid">
      {values.map(([label, value]) => (
        <Card key={label}>
          <h2>{label}</h2>
          <strong className="management-metric">{value}</strong>
        </Card>
      ))}
    </div>
  );
}
export function RestaurantAnalyticsPage({ dashboard = false }: { dashboard?: boolean }) {
  const { key } = useRestaurant();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState('');
  const from = params.get('from') || undefined,
    to = params.get('to') || undefined;
  const data = useQuery({
    queryKey: [...key, 'analytics', from, to],
    queryFn: ({ signal }) => restaurantApi.analytics({ from, to }, signal),
  });
  return (
    <ManagementSection>
      <PageHeader
        title={dashboard ? 'Chào mừng nhà hàng' : 'Thống kê nhà hàng'}
        description="Số liệu được tổng hợp trên toàn bộ dữ liệu được phép của chính nhà hàng."
        action={
          <Button variant="secondary" onClick={() => void data.refetch()}>
            Làm mới thống kê
          </Button>
        }
      />
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <>
          <form
            className="management-toolbar"
            key={data.data.from + data.data.to}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget),
                a = String(form.get('from')),
                b = String(form.get('to'));
              if (!periodValid(a, b)) {
                setError('Chọn khoảng ngày hợp lệ, tối đa 93 ngày.');
                return;
              }
              setError('');
              setParams({ from: a, to: b });
            }}
          >
            <Input label="Thống kê từ ngày" name="from" type="date" defaultValue={data.data.from} />
            <Input label="Thống kê đến ngày" name="to" type="date" defaultValue={data.data.to} />
            <Button type="submit">Áp dụng khoảng ngày</Button>
          </form>
          {error && <Alert>{error}</Alert>}
          <Metrics data={data.data} />
          <Card>
            <h2>Giá trị món đã thanh toán</h2>
            <strong className="management-metric">{money(data.data.paidFoodValue)}</strong>
            <p className="management-note">
              {data.data.paidOrderCount} đơn COMPLETED và Payment SUCCESS, theo paidAt từ{' '}
              {data.data.from} đến {data.data.to}. Chưa đối soát, không phải tiền thực nhận hoặc lợi
              nhuận. Phí giao hàng {money(data.data.paidShipping)} được tách riêng và không cộng vào
              giá trị món.
            </p>
          </Card>
          <div className="management-summary">
            <figure className="management-chart">
              <figcaption>Đơn hàng theo trạng thái · ngày tạo đơn</figcaption>
              <ul>
                {Object.entries(data.data.states).map(([status, count]) => (
                  <li key={status}>
                    <span>{orderLabels[status as OrderStatus] || status}</span>
                    <span
                      className="management-bar"
                      style={{
                        width: `${Math.max(1, (Number(count) / Math.max(1, data.data.totalOrders)) * 100)}%`,
                      }}
                    />
                    <strong>{count} đơn</strong>
                  </li>
                ))}
              </ul>
            </figure>
            <figure className="management-chart">
              <figcaption>Đơn theo ngày · createdAt</figcaption>
              {data.data.ordersByDay.length ? (
                <ul>
                  {data.data.ordersByDay.map((day) => (
                    <li key={day.date}>
                      <span>{day.date}</span>
                      <span
                        className="management-bar"
                        style={{
                          width: `${(day.count / Math.max(...data.data.ordersByDay.map((d) => d.count), 1)) * 100}%`,
                        }}
                      />
                      <strong>{day.count} đơn</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="Chưa có đơn trong kỳ"
                  description="Biểu đồ sẽ dựa trên các đơn được tạo thực tế."
                />
              )}
            </figure>
          </div>
          {!dashboard && (
            <>
              <figure className="management-chart">
                <figcaption>Giá trị món đã thu theo ngày thanh toán · paidAt, VND</figcaption>
                {data.data.paidFoodByDay.length ? (
                  <ul>
                    {data.data.paidFoodByDay.map((day) => (
                      <li key={day.date}>
                        <span>{day.date}</span>
                        <span
                          className="management-bar"
                          style={{
                            width: `${(day.amount / Math.max(...data.data.paidFoodByDay.map((d) => d.amount), 1)) * 100}%`,
                          }}
                        />
                        <strong>{money(day.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có đơn hoàn thành đã thanh toán trong kỳ.</p>
                )}
              </figure>
              <h2>Món được đặt nhiều · đơn hoàn thành đã thanh toán</h2>
              {data.data.topItems.map((item) => (
                <article className="management-row" key={item.restaurantFoodItemId}>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} phần · {money(item.amount)}
                  </span>
                </article>
              ))}
            </>
          )}
          {dashboard && (
            <div className="management-actions">
              <Link className="button button-primary" to="/restaurant/orders">
                Xử lý đơn hàng
              </Link>
              <Link className="button button-secondary" to="/restaurant/menu">
                Quản lý thực đơn
              </Link>
              <Link className="button button-secondary" to="/restaurant/analytics">
                Xem thống kê chi tiết
              </Link>
            </div>
          )}
        </>
      )}
    </ManagementSection>
  );
}
export function RestaurantDashboard() {
  return <RestaurantAnalyticsPage dashboard />;
}
