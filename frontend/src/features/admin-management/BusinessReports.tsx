import { reportTime } from './business-report-format';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select, PageHeader } from '@/components/ui';
import { Alert, EmptyState } from '@/components/feedback';
import { useSession } from '@/features/auth/AuthProvider';
import { normalizeError } from '@/lib/api/http';
import { money } from '@/features/public/api';
import { orderLabels, deliveryLabels, paymentLabels } from '@/features/orders/model';
import { AdminReadState, useAdminIdentity } from './ExistingPages';
import {
  businessReportsApi,
  type BusinessReport,
  type ReportFilters,
  type ReportKind,
} from './business-reports-api';
import './business-reports.css';

const states = {
  orders: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
  delivery: ['PENDING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'CANCELLED'],
};
const number = (value: unknown) =>
  value === null || value === undefined
    ? 'Không có dữ liệu'
    : Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
export function BusinessReportCenter() {
  useAdminIdentity();
  return (
    <>
      <PageHeader
        eyebrow="ADMIN · Báo cáo"
        title="Trung tâm báo cáo"
        description="Số liệu theo kỳ từ dữ liệu hệ thống, kèm định nghĩa và Excel."
      />
      <div className="business-report-links">
        <Card>
          <h2>Doanh thu và đơn hàng</h2>
          <p>Giá trị đơn hoàn thành có thanh toán hợp lệ, trạng thái và xu hướng.</p>
          <Link to="/admin/reports/orders">Mở báo cáo doanh thu và đơn hàng</Link>
        </Card>
        <Card>
          <h2>Hiệu suất giao hàng</h2>
          <p>Kết quả hiện tại của các chuyến thuộc nhóm đơn tạo trong kỳ.</p>
          <Link to="/admin/reports/delivery">Mở báo cáo hiệu suất giao hàng</Link>
        </Card>
      </div>
    </>
  );
}
export function BusinessReportPage({ kind }: { kind: ReportKind }) {
  const { account, key } = useAdminIdentity();
  const session = useSession();
  const [filters, setFilters] = useState<ReportFilters>({ page: 0, size: 20, sort: 'newest' });
  const [draft, setDraft] = useState({ from: '', to: '', status: '', profile: '', sort: 'newest' });
  const [error, setError] = useState(''),
    [exporting, setExporting] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );
  const query = useQuery({
    queryKey: [...key, 'business-reports', kind, filters],
    queryFn: ({ signal }) => businessReportsApi.read(kind, filters, signal),
  });
  const data = query.data;
  useEffect(() => {
    abort.current?.abort();
  }, [filters, kind]);
  const labels: Record<string, string> = kind === 'orders' ? orderLabels : deliveryLabels;
  async function download() {
    if (!data || abort.current) return;
    const current = session.getSnapshot();
    const controller = new AbortController();
    abort.current = controller;
    setExporting(true);
    setError('');
    try {
      const blob = await businessReportsApi.export(
        kind,
        { ...filters, from: data.filters.from, to: data.filters.to },
        controller.signal,
      );
      const latest = session.getSnapshot();
      if (
        controller.signal.aborted ||
        latest.account?.accountId !== account.accountId ||
        latest.account.role !== 'ADMIN' ||
        current.generation !== latest.generation
      )
        return;
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      try {
        link.href = url;
        link.download = `${kind === 'orders' ? 'BaoCaoDoanhThuDonHang' : 'BaoCaoHieuSuatGiaoHang'}_${data.generatedAt.slice(0, 10).replaceAll('-', '')}.xlsx`;
        document.body.append(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(normalizeError(cause).message);
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setExporting(false);
      }
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="ADMIN · Báo cáo nghiệp vụ"
        title={kind === 'orders' ? 'Báo cáo doanh thu và đơn hàng' : 'Báo cáo hiệu suất giao hàng'}
        description="Toàn bộ KPI, biểu đồ và Excel áp dụng cùng bộ lọc; trạng thái được ghi nhận tại thời điểm đọc."
      />
      <Link to="/admin/reports">Trung tâm báo cáo</Link>
      <Card>
        <form
          className="business-report-filters"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const from = draft.from || data?.filters.from,
              to = draft.to || data?.filters.to;
            if (
              !from ||
              !to ||
              to < from ||
              (Date.parse(to) - Date.parse(from)) / 86400000 > 92 ||
              (draft.profile && !/^[1-9][0-9]*$/.test(draft.profile))
            ) {
              setError('Chọn khoảng ngày hợp lệ tối đa 93 ngày và mã dương.');
              return;
            }
            setError('');
            setFilters({
              from,
              to,
              status: draft.status,
              [kind === 'orders' ? 'restaurantId' : 'driverId']: draft.profile,
              sort: draft.sort,
              page: 0,
              size: 20,
            });
          }}
        >
          <Input
            type="date"
            label="Từ ngày"
            value={draft.from || data?.filters.from || ''}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
          <Input
            type="date"
            label="Đến ngày"
            value={draft.to || data?.filters.to || ''}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
          <Input
            label={kind === 'orders' ? 'Mã nhà hàng' : 'Mã tài xế'}
            inputMode="numeric"
            value={draft.profile}
            onChange={(e) => setDraft({ ...draft, profile: e.target.value })}
          />
          <Select
            label="Trạng thái"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {states[kind].map((s) => (
              <option key={s} value={s}>
                {labels[s] || s}
              </option>
            ))}
          </Select>
          <Select
            label="Sắp xếp"
            value={draft.sort}
            onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
          >
            <option value="newest">Mã mới nhất</option>
            <option value="oldest">Mã cũ nhất</option>
          </Select>
          <Button type="submit">Áp dụng bộ lọc</Button>
          <Button type="button" variant="secondary" onClick={() => void query.refetch()}>
            Làm mới
          </Button>
        </form>
      </Card>
      {error && <Alert>{error}</Alert>}
      <AdminReadState query={query}>
        {(report) => (
          <>
            <p className="muted">
              Kỳ {report.filters.from} → {report.filters.to}, theo ngày tạo đơn · {report.timeZone}.
              Mẫu số tỷ lệ thay đổi theo bộ lọc. Ngày lập: {reportTime(report.generatedAt)}.
            </p>
            <p>
              Người lập:{' '}
              {kind === 'orders' ? 'Quản trị viên hệ thống' : 'Quản trị viên phụ trách vận hành'}{' '}
              (ADMIN). Người nhận:{' '}
              {kind === 'orders' ? 'Ban điều hành / Quản lý kinh doanh' : 'Trưởng bộ phận vận hành'}
              .
            </p>
            <Kpis report={report} kind={kind} />
            <Button variant="secondary" busy={exporting} onClick={() => void download()}>
              Xuất Excel
            </Button>
            <p className="muted">
              Xuất toàn bộ kết quả theo bộ lọc, tối đa 10.000 dòng, không chỉ trang hiện tại.
            </p>
            {kind === 'orders' && <Trend report={report} />}
            <Card>
              <h2>Chi tiết {kind === 'orders' ? 'đơn hàng' : 'giao hàng'}</h2>
              <Details report={report} kind={kind} />
            </Card>
            <div className="business-report-pagination">
              <Button
                variant="secondary"
                disabled={report.details.page === 0}
                onClick={() => setFilters({ ...filters, page: report.details.page - 1 })}
              >
                Trang trước
              </Button>
              <span>
                Trang {report.details.page + 1} · {report.details.totalElements} dòng
              </span>
              <Button
                variant="secondary"
                disabled={report.details.page + 1 >= report.details.totalPages}
                onClick={() => setFilters({ ...filters, page: report.details.page + 1 })}
              >
                Trang sau
              </Button>
            </div>
            {kind === 'delivery' && (
              <Card>
                <h2>Hiệu suất theo tài xế</h2>
                <p className="muted">
                  Nhóm tài xế hiện lưu, không có lịch sử phân công lại. Phân trang độc lập với chi
                  tiết.
                </p>
                {report.drivers.items.length === 0 ? (
                  <EmptyState
                    title="Không có tài xế trong trang này"
                    description="Chọn bộ lọc hoặc trang khác."
                  />
                ) : (
                  <div className="business-report-table">
                    <table>
                      <thead>
                        <tr>
                          {[
                            'Mã tài xế',
                            'Tên tài xế',
                            'Đã phân công',
                            'Đã giao',
                            'Đã hủy',
                            'Tỷ lệ giao / phân công',
                          ].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.drivers.items.map((d) => (
                          <tr key={String(d.driverId)}>
                            <td>{d.driverId}</td>
                            <td>{d.driverName ?? 'Không có dữ liệu'}</td>
                            <td>{d.assigned}</td>
                            <td>{d.delivered}</td>
                            <td>{d.cancelled}</td>
                            <td>
                              {Number(d.assigned)
                                ? `${number((Number(d.delivered) / Number(d.assigned)) * 100)}%`
                                : 'Không có dữ liệu'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="business-report-pagination">
                  <Button
                    variant="secondary"
                    disabled={report.drivers.page === 0}
                    onClick={() => setFilters({ ...filters, driverPage: report.drivers.page - 1 })}
                  >
                    Nhóm tài xế trước
                  </Button>
                  <span>
                    Trang nhóm {report.drivers.page + 1} · {report.drivers.totalElements} tài xế
                  </span>
                  <Button
                    variant="secondary"
                    disabled={report.drivers.page + 1 >= report.drivers.totalPages}
                    onClick={() => setFilters({ ...filters, driverPage: report.drivers.page + 1 })}
                  >
                    Nhóm tài xế sau
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </AdminReadState>
    </>
  );
}
function Kpis({ report, kind }: { report: BusinessReport; kind: ReportKind }) {
  const s = report.summary;
  const entries =
    kind === 'orders'
      ? [
          ['Tổng đơn', number(s.total)],
          ['Đơn hoàn thành', number(s.completed)],
          ['Đơn hủy', number(s.cancelled)],
          ['Giá trị hoàn thành đã thanh toán', money(Number(s.amount))],
          ['Phí giao trong tập hợp lệ', money(Number(s.shipping))],
          [
            'Tỷ lệ hoàn thành / tổng đơn',
            s.completionRate == null ? 'Không có dữ liệu' : `${number(s.completionRate)}%`,
          ],
        ]
      : [
          ['Chuyến có tài xế', number(s.assigned)],
          ['Giao thành công', number(s.delivered)],
          ['Đã hủy (không phải thất bại)', number(s.cancelled)],
          ['Giao thất bại', 'Không có trạng thái FAILED'],
          [
            'Tỷ lệ giao / đã phân công',
            s.successRate == null ? 'Không có dữ liệu' : `${number(s.successRate)}%`,
          ],
          [
            'Trung bình lấy món → giao',
            s.averageSeconds == null
              ? 'Không có dữ liệu'
              : `${number(s.averageSeconds)} giây (${number(s.validDurationCount)} chuyến)`,
          ],
        ];
  return (
    <>
      <div className="business-report-kpis">
        {entries.map(([label, value]) => (
          <Card key={label}>
            <p className="muted">{label}</p>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>
      <p className="muted">
        {kind === 'orders'
          ? 'Chỉ COMPLETED + SUCCESS, có paidAt và amount khớp tổng tiền/món + phí. Không phải lợi nhuận hoặc doanh thu thực nhận nền tảng. Đơn chưa thanh toán không cộng vào giá trị.'
          : 'Không lưu thời điểm nhận phân công. Thời gian lấy món được hiển thị đúng tên; không dùng thay cho thời gian nhận đơn. Tỷ lệ gồm chuyến đang xử lý trong mẫu số.'}
      </p>
    </>
  );
}
function Trend({ report }: { report: BusinessReport }) {
  if (!report.series.length)
    return (
      <EmptyState title="Chưa có dữ liệu xu hướng" description="Không có đơn trong kỳ đã lọc." />
    );
  const max = Math.max(1, ...report.series.map((d) => Number(d.amount)));
  return (
    <Card>
      <h2>Giá trị hoàn thành đã thanh toán theo ngày tạo đơn (VNĐ)</h2>
      <p className="muted">
        Chỉ hiển thị ngày có đơn; ngày không có dòng không phải dữ liệu bị thiếu.
      </p>
      <div
        className="business-report-chart"
        role="img"
        aria-label="Xu hướng giá trị đơn hoàn thành đã thanh toán theo ngày tạo đơn"
      >
        {report.series.map((d) => (
          <div className="business-report-bar" key={String(d.day)}>
            <span>{String(d.day)}</span>
            <div style={{ width: `${(Number(d.amount) / max) * 100}%` }} />
            <span>{money(Number(d.amount))}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
function Details({ report, kind }: { report: BusinessReport; kind: ReportKind }) {
  const cols =
    kind === 'orders'
      ? [
          ['orderId', 'Mã đơn'],
          ['customerName', 'Khách hàng'],
          ['restaurantName', 'Nhà hàng'],
          ['amount', 'Giá trị đơn'],
          ['shipping', 'Phí giao'],
          ['createdAt', 'Ngày đặt'],
          ['status', 'Trạng thái đơn'],
          ['paymentStatus', 'Thanh toán'],
        ]
      : [
          ['orderId', 'Mã đơn'],
          ['driverName', 'Tài xế'],
          ['pickupTime', 'Lấy món'],
          ['deliveredTime', 'Giao thành công'],
          ['status', 'Trạng thái'],
          ['durationSeconds', 'Thời lượng (giây)'],
        ];
  if (!report.details.items.length)
    return (
      <EmptyState
        title="Không có dữ liệu chi tiết"
        description="Thử bộ lọc hoặc kỳ báo cáo khác."
      />
    );
  return (
    <div className="business-report-table">
      <table>
        <thead>
          <tr>
            {cols.map(([key, label]) => (
              <th key={key}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.details.items.map((d) => (
            <tr key={String(d.orderId)}>
              {cols.map(([key]) => (
                <td key={key}>
                  {d[key] == null
                    ? key === 'status' && kind === 'delivery'
                      ? 'Chưa xác định'
                      : 'Không có dữ liệu'
                    : ['amount', 'shipping'].includes(key)
                      ? money(Number(d[key]))
                      : key === 'status'
                        ? (kind === 'orders'
                            ? (orderLabels as Record<string, string>)
                            : (deliveryLabels as Record<string, string>))[String(d[key])] ||
                          String(d[key])
                        : key === 'paymentStatus'
                          ? paymentLabels[String(d[key]) as keyof typeof paymentLabels] ||
                            String(d[key])
                          : ['createdAt', 'pickupTime', 'deliveredTime'].includes(key)
                            ? reportTime(String(d[key]))
                            : String(d[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
