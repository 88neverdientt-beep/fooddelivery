import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChartColumn, RefreshCw, ReceiptText, Users, ArrowUpRight } from 'lucide-react';
import { Badge, Button, Card, Input, PageHeader } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { money } from '@/features/public/api';
import { orderLabels, deliveryLabels } from '@/features/orders/model';
import { AdminReadState, useAdminIdentity } from './ExistingPages';
import { adminApi } from './api';
import { rangeValid, presetDates, type Analytics } from './model';

export function ReportingDates({
  from,
  to,
  today,
  apply,
}: {
  from: string;
  to: string;
  today: string;
  apply: (v: { from: string; to: string }) => void;
}) {
  const [start, setStart] = useState(from),
    [end, setEnd] = useState(to),
    [error, setError] = useState('');
  return (
    <Card>
      <div className="admin-date-presets" aria-label="Kỳ báo cáo">
        {[1, 7, 30].map((days) => (
          <Button key={days} variant="secondary" onClick={() => apply(presetDates(today, days))}>
            {days === 1 ? 'Hôm nay' : `${days} ngày`}
          </Button>
        ))}
      </div>
      <form
        noValidate
        className="admin-filter-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!rangeValid(start, end)) {
            setError('Chọn khoảng ngày hợp lệ, tối đa 93 ngày bao gồm hai đầu.');
            return;
          }
          setError('');
          apply({ from: start, to: end });
        }}
      >
        <Input
          type="date"
          label="Báo cáo từ ngày"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input
          type="date"
          label="Báo cáo đến ngày"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <Button type="submit">Áp dụng kỳ báo cáo</Button>
      </form>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
export function AdminMetrics({ data }: { data: Analytics }) {
  const values = [
    { title: 'Khách hàng', value: data.allTimeCounts.customers },
    { title: 'Nhà hàng', value: data.allTimeCounts.restaurants },
    { title: 'Tài xế', value: data.allTimeCounts.drivers },
    { title: 'Tài khoản', value: data.allTimeCounts.accounts },
    { title: 'Đơn hàng', value: data.allTimeCounts.orders },
  ];
  return (
    <>
      <div className="admin-section-heading">
        <h2>
          <Users size={21} /> Quy mô hệ thống
        </h2>
        <span>Mọi thời gian</span>
      </div>
      <dl className="admin-count-strip">
        {values.map((v) => (
          <div key={v.title}>
            <dt>{v.title}</dt>
            <dd>{v.value.toLocaleString('vi-VN')}</dd>
          </div>
        ))}
      </dl>
      <div className="admin-money-band" role="region" aria-label="Thanh toán thành công trong kỳ">
        <div>
          <span className="eyebrow">THANH TOÁN THÀNH CÔNG ĐÃ GHI NHẬN</span>
          <strong>{money(data.recordedSuccessfulPayments.totalValue)}</strong>
          <p>
            {data.recordedSuccessfulPayments.count} đơn hoàn thành, Payment thành công và số tiền
            khớp; tính theo ngày ghi nhận thanh toán trong kỳ.
          </p>
        </div>
        <dl>
          <div>
            <dt>Giá trị món ăn</dt>
            <dd>{money(data.recordedSuccessfulPayments.foodValue)}</dd>
          </div>
          <div>
            <dt>Phí giao hàng</dt>
            <dd>{money(data.recordedSuccessfulPayments.shippingValue)}</dd>
          </div>
        </dl>
      </div>
      <p className="muted">
        Giá trị hệ thống ghi nhận trước đối soát, không phải lợi nhuận hoặc doanh thu thực nhận của
        nền tảng.
      </p>
      <div className="admin-kpi-grid">
        <Card>
          <ReceiptText size={23} />
          <h3>Đơn tạo trong kỳ</h3>
          <strong>{data.orderCohort.total}</strong>
          <p>
            {data.orderCohort.states.COMPLETED} hiện hoàn thành ·{' '}
            {data.orderCohort.states.CANCELLED} hiện đã hủy
          </p>
        </Card>
        <Card>
          <ChartColumn size={23} />
          <h3>Giá trị đơn chưa hủy</h3>
          <strong>{money(data.orderCohort.nonCancelledOrderValue)}</strong>
          <p>Gồm khoản chưa thanh toán, theo ngày tạo đơn trong kỳ.</p>
        </Card>
        <Card>
          <h3>Giao hoàn tất / chuyến đã kết thúc</h3>
          <strong>
            {data.deliveryCohort.deliveredSharePercent === null
              ? 'Chưa đủ dữ liệu'
              : `${data.deliveryCohort.deliveredSharePercent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`}
          </strong>
          <p>
            {data.deliveryCohort.deliveredCount}/{data.deliveryCohort.terminalCount} chuyến
            DELIVERED hoặc CANCELLED, thuộc đơn tạo trong kỳ.
          </p>
        </Card>
      </div>
    </>
  );
}
export function Bars({
  title,
  rows,
  moneyValues = false,
  source,
}: {
  title: string;
  rows: { label: string; value: number }[];
  moneyValues?: boolean;
  source: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <h2>{title}</h2>
      <p className="muted">{source}</p>
      {rows.length ? (
        <ul className="admin-bars" aria-label={title}>
          {rows.map((row) => (
            <li key={row.label}>
              <div>
                <span>{row.label}</span>
                <strong>
                  {moneyValues ? money(row.value) : row.value.toLocaleString('vi-VN')}
                </strong>
              </div>
              <span className="admin-bar-track" aria-hidden="true">
                <i style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Chưa có hoạt động trong kỳ"
          description="Đổi khoảng ngày để xem các mốc đã được hệ thống ghi nhận."
        />
      )}
    </Card>
  );
}
function ReportBody({ data }: { data: Analytics }) {
  return (
    <>
      <AdminMetrics data={data} />
      <div className="admin-report-grid">
        <Bars
          title="Đơn hàng theo ngày tạo"
          rows={data.orderCohort.days.map((v) => ({ label: v.date, value: v.count }))}
          source="Số đơn tạo trong từng ngày nghiệp vụ của kỳ đã chọn."
        />
        <Bars
          title="Giá trị thanh toán thành công theo ngày"
          rows={data.recordedSuccessfulPayments.days.map((v) => ({
            label: v.date,
            value: v.amount,
          }))}
          moneyValues
          source="VNĐ, theo paidAt của Payment thành công và Order hoàn thành, số tiền khớp."
        />
        <Bars
          title="Trạng thái đơn tạo trong kỳ"
          rows={Object.entries(data.orderCohort.states).map(([key, value]) => ({
            label: orderLabels[key as keyof typeof orderLabels] || 'Chưa xác định',
            value,
          }))}
          source="Trạng thái hiện tại của nhóm đơn tạo trong kỳ, không phải số sự kiện chuyển trạng thái."
        />
        <Bars
          title="Trạng thái chuyến giao"
          rows={Object.entries(data.deliveryCohort.states).map(([key, value]) => ({
            label: deliveryLabels[key as keyof typeof deliveryLabels] || 'Chưa xác định',
            value,
          }))}
          source="Nhóm chuyến thuộc Order tạo trong kỳ; không suy thời gian phân công."
        />
        <Bars
          title="Nhà hàng có nhiều đơn trong kỳ"
          rows={data.topRestaurants.map((v) => ({
            label: `${v.subject.name || 'Nhà hàng'} #${v.subject.id}`,
            value: v.count,
          }))}
          source="Top 10 theo số đơn tạo trong kỳ, gồm mọi trạng thái."
        />
        <Bars
          title="Tài xế có chuyến giao hoàn tất"
          rows={data.topDrivers.map((v) => ({
            label: `${v.subject.name || 'Tài xế'} #${v.subject.id}`,
            value: v.completedCount,
          }))}
          source="Top 10 chuyến DELIVERED theo deliveredTime trong kỳ, không phải thu nhập."
        />
      </div>
      <Card>
        <h2>Phương thức thanh toán</h2>
        <p className="muted">
          Số Payment tạo trong kỳ; phương thức COD không đồng nghĩa đã thanh toán.
        </p>
        {data.paymentMethods.length ? (
          <ul className="admin-methods">
            {data.paymentMethods.map((v) => (
              <li key={v.methodCode || 'UNKNOWN'}>
                <strong>{v.methodName || v.methodCode || 'Chưa rõ phương thức'}</strong>
                <span>
                  {v.count} khoản · {v.successfulCount} có trạng thái SUCCESS
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState description="Không có Payment tạo trong khoảng ngày này." />
        )}
      </Card>
    </>
  );
}
function ReportingPage({ dashboard = false }: { dashboard?: boolean }) {
  const { key } = useAdminIdentity(),
    [period, setPeriod] = useState<{ from: string; to: string } | undefined>();
  const query = useQuery({
    queryKey: [...key, 'analytics', period || {}],
    queryFn: ({ signal }) => adminApi.analytics(period || {}, signal),
  });
  return (
    <section className="admin-management">
      <PageHeader
        eyebrow="QUẢN TRỊ HANOIFOOD"
        title={dashboard ? 'Tổng quan quản trị' : 'Báo cáo hoạt động'}
        description={
          dashboard
            ? 'Theo dõi quy mô, đơn hàng, giao hàng và thanh toán từ dữ liệu hệ thống.'
            : 'Các chỉ số có định nghĩa thời gian và nguồn ghi nhận rõ ràng.'
        }
        action={
          <Button variant="secondary" busy={query.isFetching} onClick={() => void query.refetch()}>
            <RefreshCw size={17} /> Làm mới báo cáo
          </Button>
        }
      />
      {dashboard && (
        <div className="admin-shortcuts">
          {[
            ['accounts', 'Quản lý tài khoản'],
            ['orders', 'Giám sát đơn'],
            ['deliveries', 'Theo dõi chuyến'],
            ['analytics', 'Báo cáo chi tiết'],
          ].map(([path, label]) => (
            <Link key={path} to={`/admin/${path}`}>
              {label}
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      )}
      <AdminReadState query={query}>
        {(data) => (
          <>
            <div className="admin-report-period">
              <Badge>
                Kỳ {data.from} — {data.to}
              </Badge>
              <span>Giờ nghiệp vụ: {data.timeZone}</span>
            </div>
            <ReportingDates
              key={`${data.from}/${data.to}`}
              from={data.from}
              to={data.to}
              today={data.businessToday}
              apply={setPeriod}
            />
            <ReportBody data={data} />
          </>
        )}
      </AdminReadState>
    </section>
  );
}
export function AdminDashboard() {
  return <ReportingPage dashboard />;
}
export function AdminAnalyticsPage() {
  return <ReportingPage />;
}
