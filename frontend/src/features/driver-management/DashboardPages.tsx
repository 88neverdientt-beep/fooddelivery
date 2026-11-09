import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, PageHeader, Button, Input, Badge } from '@/components/ui';
import { Alert, Skeleton, ErrorState, EmptyState } from '@/components/feedback';
import { driverApi } from './api';
import { periodValid, deliveryLabels, type Analytics } from './model';
import { DeliveryCard } from './Components';
import { useDriver, useVisible, DriverSection } from './shared';
export function DriverMetrics({ data }: { data: Analytics }) {
  const stats = [
    ['Chuyến đã nhận · mọi thời gian', data.totalAssignedAllTime],
    ['Chuyến đang xử lý · hiện tại', data.activeNow],
    ['Đã giao · trong kỳ', data.completedInPeriod],
    ['Đã lấy hàng · trong kỳ', data.pickedUpInPeriod],
  ] as const;
  return (
    <div className="driver-metrics">
      {stats.map(([label, value]) => (
        <Card key={label}>
          <h2>{label}</h2>
          <strong>{value}</strong>
        </Card>
      ))}
    </div>
  );
}
export function DriverAnalyticsPage({ dashboard = false }: { dashboard?: boolean }) {
  const { key } = useDriver(),
    visible = useVisible();
  const [params, setParams] = useSearchParams(),
    [error, setError] = useState('');
  const from = params.get('from') || undefined,
    to = params.get('to') || undefined;
  const data = useQuery({
    queryKey: [...key, 'analytics', from, to],
    queryFn: ({ signal }) => driverApi.analytics({ from, to }, signal),
    refetchInterval: dashboard && visible ? 20000 : false,
    refetchIntervalInBackground: false,
  });
  const profile = useQuery({
    queryKey: [...key, 'profile'],
    queryFn: ({ signal }) => driverApi.profile(signal),
  });
  const next = useQuery({
    queryKey: [...key, 'next-delivery'],
    queryFn: ({ signal }) =>
      driverApi.deliveries({ page: 0, size: 1, scope: 'active', sort: 'oldest' }, signal),
    enabled: dashboard,
    refetchInterval: visible ? 20000 : false,
    refetchIntervalInBackground: false,
  });
  return (
    <DriverSection>
      <PageHeader
        title={dashboard ? 'Chào mừng tài xế' : 'Thống kê chuyến giao'}
        description="Theo dõi công việc của chính bạn bằng dữ liệu giao hàng thực tế."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void data.refetch();
              if (dashboard) void next.refetch();
            }}
          >
            Làm mới hoạt động
          </Button>
        }
      />
      {profile.data && (
        <p className="driver-welcome">
          <strong>{profile.data.name}</strong>
          <Badge tone={profile.data.driveStatus ? 'success' : 'neutral'}>
            {profile.data.driveStatus ? 'Đang nhận chuyến mới' : 'Tạm ngừng nhận chuyến mới'}
          </Badge>
        </p>
      )}
      {dashboard && (
        <div className="driver-shortcuts">
          <Link className="button button-primary" to="/driver/available">
            Nhận chuyến mới
          </Link>
          <Link className="button button-secondary" to="/driver/deliveries">
            Chuyến đang xử lý
          </Link>
          <Link className="button button-secondary" to="/driver/history">
            Lịch sử giao hàng
          </Link>
        </div>
      )}
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <>
          <form
            key={data.data.from + data.data.to}
            className="driver-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget),
                a = String(values.get('from')),
                b = String(values.get('to'));
              if (!periodValid(a, b)) {
                setError('Chọn khoảng ngày hợp lệ, tối đa 93 ngày.');
                return;
              }
              setError('');
              setParams({ from: a, to: b });
            }}
          >
            <Input
              name="from"
              type="date"
              label="Hoạt động từ ngày"
              defaultValue={data.data.from}
            />
            <Input name="to" type="date" label="Hoạt động đến ngày" defaultValue={data.data.to} />
            <Button type="submit">Áp dụng kỳ hoạt động</Button>
          </form>
          {error && <Alert>{error}</Alert>}
          <DriverMetrics data={data.data} />
          <p className="driver-note">
            Số chuyến trong kỳ theo pickupTime hoặc deliveredTime từ {data.data.from} đến{' '}
            {data.data.to}. Tổng chuyến đã nhận và trạng thái hiện tại tính toàn bộ thời gian. Tiền
            COD và phí giao hàng không phải thu nhập của tài xế.
          </p>
          {dashboard && (
            <section aria-label="Chuyến cần xử lý">
              <h2>Chuyến cần xử lý</h2>
              {next.isPending ? (
                <Skeleton />
              ) : next.isError ? (
                <ErrorState error={next.error} onRetry={() => void next.refetch()} />
              ) : next.data?.items[0] ? (
                <DeliveryCard delivery={next.data.items[0]} />
              ) : (
                <EmptyState
                  title="Chưa có chuyến đang xử lý"
                  description="Chuyến bạn nhận sẽ được hiển thị tại đây."
                />
              )}
            </section>
          )}
          <div className="driver-detail-grid">
            <Card>
              <h2>Trạng thái · tất cả thời gian</h2>
              <dl className="driver-status-totals">
                {Object.entries(data.data.statesAllTime).map(([state, count]) => (
                  <div key={state}>
                    <dt>{deliveryLabels[state as keyof typeof deliveryLabels]}</dt>
                    <dd>{count}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card>
              <h2>Thời gian từ lấy đến giao thành công</h2>
              <strong className="driver-average">
                {data.data.averagePickupToDeliveredMinutes === null
                  ? 'Chưa có dữ liệu'
                  : `${data.data.averagePickupToDeliveredMinutes.toFixed(1)} phút`}
              </strong>
              <p className="driver-note">
                Trung bình các chuyến DELIVERED trong kỳ có đủ hai mốc thời gian hợp lệ; không phải
                ETA hay chỉ thời gian chạy xe.
              </p>
            </Card>
          </div>
          {!dashboard && (
            <div className="driver-detail-grid">
              {[
                { title: 'Chuyến giao thành công theo ngày', days: data.data.completedByDay },
                { title: 'Chuyến lấy hàng theo ngày', days: data.data.pickedUpByDay },
              ].map((chart) => (
                <figure className="driver-chart" key={chart.title}>
                  <figcaption>{chart.title}</figcaption>
                  {chart.days.length ? (
                    <ul>
                      {chart.days.map((day) => (
                        <li key={day.date}>
                          <span>{day.date}</span>
                          <span
                            className="driver-bar"
                            style={{
                              width: `${(day.count / Math.max(1, ...chart.days.map((item) => item.count))) * 100}%`,
                            }}
                          />
                          <strong>{day.count} chuyến</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Chưa có chuyến trong kỳ.</p>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </DriverSection>
  );
}
export function DriverDashboard() {
  return <DriverAnalyticsPage dashboard />;
}
