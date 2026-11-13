import { reportTime } from './business-report-format';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { BusinessReportCenter, BusinessReportPage } from './BusinessReports';
import {
  businessReportsApi,
  reportQuery,
  businessReportSchema,
  type BusinessReport,
} from './business-reports-api';
import { ApiError } from '@/lib/api/http';

function fixture(delivery = false): BusinessReport {
  return {
    filters: {
      from: '2026-11-01',
      to: '2026-11-30',
      status: '',
      profileId: null,
      page: 0,
      size: 20,
      sort: 'newest',
      delivery,
    },
    timeZone: 'Asia/Ho_Chi_Minh',
    generatedAt: '2026-11-13T10:00:00',
    summary: delivery
      ? {
          total: 8,
          assigned: 7,
          delivered: 5,
          cancelled: 1,
          averageSeconds: 1200,
          validDurationCount: 4,
          successRate: 71.43,
        }
      : {
          total: 8,
          completed: 5,
          cancelled: 1,
          amount: 240000,
          shipping: 40000,
          completionRate: 62.5,
        },
    series: delivery ? [] : [{ day: '2026-11-01', orders: 2, amount: 120000 }],
    details: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
    drivers: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
  };
}
async function mount(element: React.ReactNode) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const session = new Session(gateway(account('ADMIN')), immediateLock, () => cache.clear());
  await session.restore();
  render(
    <QueryClientProvider client={cache}>
      <AuthProvider session={session}>
        <MemoryRouter>{element}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
it('shows both reports in the existing admin center', async () => {
  await mount(<BusinessReportCenter />);
  expect(screen.getByRole('link', { name: /Mở báo cáo doanh thu/ })).toHaveAttribute(
    'href',
    '/admin/reports/orders',
  );
  expect(screen.getByRole('link', { name: /Mở báo cáo hiệu suất/ })).toHaveAttribute(
    'href',
    '/admin/reports/delivery',
  );
});
it('renders order KPI, chart and empty detail from API data', async () => {
  vi.spyOn(businessReportsApi, 'read').mockResolvedValue(fixture());
  await mount(<BusinessReportPage kind="orders" />);
  expect(await screen.findByText('Tổng đơn')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Xu hướng/ })).toBeInTheDocument();
  expect(screen.getByText('Không có dữ liệu chi tiết')).toBeInTheDocument();
  expect(screen.getByText(/Không phải lợi nhuận/)).toBeInTheDocument();
});
it('labels missing delivery metrics honestly', async () => {
  vi.spyOn(businessReportsApi, 'read').mockResolvedValue(fixture(true));
  await mount(<BusinessReportPage kind="delivery" />);
  expect(await screen.findByText('Không có trạng thái FAILED')).toBeInTheDocument();
  expect(screen.getByText('Trung bình lấy món → giao')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it('keeps a delivery with NULL status and labels it without counting a success', async () => {
  const report = fixture(true);
  report.summary = {
    total: 1,
    assigned: 1,
    delivered: 0,
    cancelled: 0,
    averageSeconds: null,
    validDurationCount: 0,
    successRate: 0,
  };
  report.details = {
    items: [
      {
        orderId: 901,
        driverName: 'Tài xế NULL fixture',
        pickupTime: null,
        deliveredTime: null,
        status: null,
        durationSeconds: null,
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };
  report.drivers = {
    items: [
      { driverId: 1, driverName: 'Tài xế NULL fixture', assigned: 1, delivered: 0, cancelled: 0 },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };
  vi.spyOn(businessReportsApi, 'read').mockResolvedValue(report);
  await mount(<BusinessReportPage kind="delivery" />);
  expect(await screen.findByText('Chưa xác định')).toBeInTheDocument();
  expect(screen.getByText('901')).toBeInTheDocument();
  expect(
    screen.getByText('Giao thành công', { exact: true, selector: '.business-report-kpis p' })
      .parentElement,
  ).toHaveTextContent('0');
  expect(screen.getByText('901').closest('tr')).toHaveTextContent('Chưa xác định');
  expect(screen.getByText('901').closest('tr')).not.toHaveTextContent('Đã giao đến khách hàng');
});
it('rejects inverted periods without a second API call', async () => {
  const read = vi.spyOn(businessReportsApi, 'read').mockResolvedValue(fixture());
  await mount(<BusinessReportPage kind="orders" />);
  await screen.findByText('Tổng đơn');
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-12-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));
  expect(await screen.findByText(/Chọn khoảng ngày hợp lệ/)).toBeInTheDocument();
  expect(read).toHaveBeenCalledTimes(1);
});
it('applies restaurant filter to the entire query and resets pagination', async () => {
  const read = vi.spyOn(businessReportsApi, 'read').mockResolvedValue(fixture());
  await mount(<BusinessReportPage kind="orders" />);
  await screen.findByText('Tổng đơn');
  fireEvent.change(screen.getByLabelText('Mã nhà hàng'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));
  await waitFor(() =>
    expect(read).toHaveBeenLastCalledWith(
      'orders',
      expect.objectContaining({ restaurantId: '2', page: 0, from: '2026-11-01', to: '2026-11-30' }),
      expect.anything(),
    ),
  );
});
it('shows an API error with retry and no fabricated KPI', async () => {
  vi.spyOn(businessReportsApi, 'read').mockRejectedValue(new ApiError(503, '503'));
  await mount(<BusinessReportPage kind="orders" />);
  expect(await screen.findByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
  expect(screen.queryByText('Tổng đơn')).not.toBeInTheDocument();
});
it('shows loading before API completion', async () => {
  vi.spyOn(businessReportsApi, 'read').mockImplementation(() => new Promise(() => {}));
  await mount(<BusinessReportPage kind="orders" />);
  expect(screen.queryByText('Tổng đơn')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Xuất Excel' })).not.toBeInTheDocument();
});
it('export query strips both paginations and preserves effective filters', () => {
  const q = new URLSearchParams(
    reportQuery(
      {
        from: '2026-11-01',
        to: '2026-11-30',
        driverId: '2',
        status: 'DELIVERED',
        page: 4,
        size: 20,
        driverPage: 2,
      },
      true,
    ),
  );
  expect(q.has('page')).toBe(false);
  expect(q.has('driverPage')).toBe(false);
  expect(q.has('size')).toBe(false);
  expect(q.get('driverId')).toBe('2');
  expect(q.get('status')).toBe('DELIVERED');
});
it('validates the server contract instead of accepting a fabricated result', () => {
  expect(businessReportSchema.safeParse({ summary: {} }).success).toBe(false);
  expect(businessReportSchema.safeParse(fixture()).success).toBe(true);
});

it('formats only wall-clock dates without timezone conversion or changing names', () => {
  expect(reportTime('2026-11-01T00:00:00.000000')).toBe('01/11/2026 00:00:00');
  expect(reportTime('Tai Test')).toBe('Tai Test');
});
