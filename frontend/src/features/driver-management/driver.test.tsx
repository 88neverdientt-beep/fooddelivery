import { it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Session } from '@/features/auth/session';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { ToastProvider } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { createDriverApi, driverApi, driverKey } from './api';
import {
  profileInput,
  nextDeliveryStatus,
  periodValid,
  deliveryStatusSchema,
  deliveryLabels,
  type DriverProfile,
  type DeliveryDetail,
  type Analytics,
  type AssignedDelivery,
} from './model';
import {
  DeliveryCard,
  DeliveryStatusBadge,
  DeliveryTimeline,
  DeliveryActionButtons,
} from './Components';
import { DriverProfileForm } from './ProfilePage';
import { DriverDeliveriesPage, DriverHistoryPage, DriverDeliveryDetailPage } from './DeliveryPages';
import { DriverMetrics, DriverDashboard, DriverAnalyticsPage } from './DashboardPages';
const profile: DriverProfile = {
  driverId: 1,
  name: 'QA Driver',
  email: 'qa@test.example',
  phoneNumber: '0901234567',
  address: 'QA home',
  licensePlate: 'TEST-06',
  driveStatus: true,
  createdAt: null,
};
const detail: DeliveryDetail = {
  deliveryId: 9,
  driverId: 1,
  deliveryStatus: 'PENDING',
  pickupTime: null,
  deliveredTime: null,
  pickup: { restaurantId: 7, name: 'QA kitchen', address: 'QA pickup' },
  order: {
    orderId: 4,
    deliveryAddress: 'QA dropoff',
    subtotal: 25000,
    shippingFee: 15000,
    totalAmount: 40000,
    orderStatus: 'READY',
    createdAt: '2026-11-09T10:00:00',
    customer: { customerId: 2, name: 'QA Customer' },
    restaurant: { restaurantId: 7, name: 'QA kitchen' },
    orderDetails: [
      {
        orderDetailId: 1,
        foodItemName: 'Phở',
        quantity: 1,
        unitPrice: 25000,
        subtotalItem: 25000,
        note: null,
      },
    ],
    deliveryOutputDTO: {
      deliveryId: 9,
      deliveryStatus: 'PENDING',
      pickupTime: null,
      deliveredTime: null,
    },
    paymentResponseDTO: {
      paymentId: 1,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      amount: 40000,
      paidAt: null,
      refundedAt: null,
    },
  },
};
const assigned: AssignedDelivery = {
  deliveryId: 9,
  orderId: 4,
  driverId: 1,
  deliveryStatus: 'PENDING',
  orderStatus: 'READY',
  orderCreatedAt: detail.order.createdAt,
  pickupTime: null,
  deliveredTime: null,
  pickup: detail.pickup,
  deliveryAddress: 'QA dropoff',
  totalAmount: 40000,
  paymentMethod: 'COD',
  paymentStatus: 'PENDING',
};
const stats: Analytics = {
  from: '2026-11-01',
  to: '2026-11-09',
  totalAssignedAllTime: 102,
  activeNow: 2,
  statesAllTime: { PENDING: 1, PICKED_UP: 0, DELIVERING: 1, DELIVERED: 100, CANCELLED: 0 },
  completedInPeriod: 3,
  pickedUpInPeriod: 4,
  completedByDay: [],
  pickedUpByDay: [],
  averagePickupToDeliveredMinutes: null,
};
const pageOf = <T,>(items: T[]) => ({
  items,
  page: 0,
  size: 12,
  totalElements: items.length,
  totalPages: items.length ? 1 : 0,
});
async function mount(element: React.ReactNode, path = '/') {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const session = new Session(gateway(account('DRIVER')), immediateLock, () => cache.clear());
  await session.restore();
  const router = createMemoryRouter(
    [
      { path: path.includes('/deliveries/') ? '/driver/deliveries/:id' : '/', element },
      { path: '/other', element: <h1>Other</h1> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={cache}>
      <AuthProvider session={session}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { cache, session, router };
}
it.each(deliveryStatusSchema.options)('maps the actual %s status to a text badge', (status) => {
  render(<DeliveryStatusBadge status={status} />);
  expect(screen.getByText(deliveryLabels[status])).toBeVisible();
});
it('accepts only actual delivery enums, never invented failure or return states', () => {
  for (const state of ['FAILED', 'RETURNED', 'ASSIGNED', 'IN_TRANSIT'])
    expect(deliveryStatusSchema.safeParse(state).success).toBe(false);
});
it.each([
  ['PENDING', 'READY', 'PICKED_UP'],
  ['PICKED_UP', 'READY', 'DELIVERING'],
  ['DELIVERING', 'DELIVERING', 'DELIVERED'],
] as const)('permits %s only with matching Order state %s', (deliveryStatus, orderStatus, next) => {
  expect(
    nextDeliveryStatus({ ...detail, deliveryStatus, order: { ...detail.order, orderStatus } }),
  ).toBe(next);
});
it.each(['CONFIRMED', 'PREPARING', 'CANCELLED', 'COMPLETED'] as const)(
  'does not allow pickup for Order %s',
  (orderStatus) => {
    expect(
      nextDeliveryStatus({ ...detail, order: { ...detail.order, orderStatus } }),
    ).toBeUndefined();
  },
);
it('has no actions on completed or cancelled deliveries', () => {
  for (const deliveryStatus of ['DELIVERED', 'CANCELLED'] as const)
    expect(nextDeliveryStatus({ ...detail, deliveryStatus })).toBeUndefined();
});
it('validates mutable profile limits and strips self-declared IDs or roles', () => {
  expect(profileInput.safeParse({ ...profile, name: 'T'.repeat(100) }).success).toBe(true);
  expect(profileInput.safeParse({ ...profile, name: 'T'.repeat(101) }).success).toBe(false);
  expect(profileInput.safeParse({ ...profile, name: ' ' }).success).toBe(false);
  expect(profileInput.safeParse({ ...profile, licensePlate: 'x'.repeat(21) }).success).toBe(false);
  expect(profileInput.safeParse({ ...profile, phoneNumber: 'x'.repeat(16) }).success).toBe(false);
  const value = profileInput.parse({ ...profile, role: 'ADMIN' });
  expect(value).not.toHaveProperty('driverId');
  expect(value).not.toHaveProperty('role');
});
it('bounds real calendar periods to 93 inclusive days', () => {
  expect(periodValid('2026-01-01', '2026-04-03')).toBe(true);
  expect(periodValid('2026-01-01', '2026-04-04')).toBe(false);
  expect(periodValid('2026-02-30', '2026-03-01')).toBe(false);
  expect(periodValid('2026-03-01', '2026-02-01')).toBe(false);
});
it('derives accept driverId from verified identity and never accepts an owner parameter', async () => {
  const request = vi.fn().mockResolvedValue({
    deliveryId: 9,
    deliveryStatus: 'PENDING',
    pickupTime: null,
    deliveredTime: null,
    order: { orderId: 4, deliveryAddress: 'QA' },
    driver: { driverId: 1, name: 'QA', phoneNumber: '090', licensePlate: null },
  });
  await createDriverApi(request, () => account('DRIVER')).accept(9);
  expect(request).toHaveBeenCalledExactlyOnceWith('/deliveries/9/accept', {
    method: 'POST',
    body: { driverId: 1 },
  });
});
it.each(['CUSTOMER', 'RESTAURANT', 'ADMIN'] as const)(
  'refuses private Driver calls from %s',
  async (role) => {
    const request = vi.fn();
    await expect(createDriverApi(request, () => account(role)).profile()).rejects.toMatchObject({
      status: 403,
    });
    expect(request).not.toHaveBeenCalled();
  },
);
it('rejects wrong owners and mismatched nested delivery data', async () => {
  const request = vi.fn().mockResolvedValue({ ...profile, driverId: 2 }),
    api = createDriverApi(request, () => account('DRIVER'));
  await expect(api.profile()).rejects.toMatchObject({ code: 'CONTRACT' });
  await expect(
    api.updateProfile({ ...profile, licensePlate: 'TEST', driveStatus: true }),
  ).rejects.toMatchObject({ code: 'CONTRACT' });
  request.mockResolvedValue({ ...detail, driverId: 2 });
  await expect(api.detail(9)).rejects.toMatchObject({ code: 'CONTRACT' });
  request.mockResolvedValue({
    ...detail,
    order: {
      ...detail.order,
      deliveryOutputDTO: { ...detail.order.deliveryOutputDTO, deliveryId: 10 },
    },
  });
  await expect(api.detail(9)).rejects.toMatchObject({ code: 'CONTRACT' });
  request.mockResolvedValue(pageOf([{ ...assigned, driverId: 2 }]));
  await expect(api.deliveries()).rejects.toMatchObject({ code: 'CONTRACT' });
  expect(driverKey(1, 1)).not.toEqual(driverKey(2, 2));
});
it('uses bounded filters, escaped query encoding and the existing raw enum PUT', async () => {
  const request = vi.fn().mockResolvedValue(pageOf([])),
    api = createDriverApi(request, () => account('DRIVER'));
  await api.deliveries({ q: '100%_', scope: 'history' });
  expect(request.mock.calls[0][0]).toBe(
    '/driver-management/deliveries?page=0&size=12&q=100%25_&scope=history',
  );
  request.mockResolvedValue({
    deliveryId: 9,
    deliveryStatus: 'PICKED_UP',
    pickupTime: '2026-11-09T10:00:00',
    deliveredTime: null,
    order: { orderId: 4, deliveryAddress: 'QA' },
    driver: { driverId: 1, name: 'QA', phoneNumber: '090', licensePlate: null },
  });
  await api.transition(9, 'PICKED_UP');
  expect(request).toHaveBeenLastCalledWith('/deliveries/9/status', {
    method: 'PUT',
    body: 'PICKED_UP',
  });
});
it('renders pickup/dropoff and COD without treating money as earnings', () => {
  render(
    <RouterProvider
      router={createMemoryRouter([{ path: '/', element: <DeliveryCard delivery={assigned} /> }])}
    />,
  );
  expect(screen.getByText('QA pickup')).toBeVisible();
  expect(screen.getByText('QA dropoff')).toBeVisible();
  expect(screen.getByText(/Giá trị đơn COD/)).toBeVisible();
  expect(screen.queryByText(/Thu nhập:/)).not.toBeInTheDocument();
});
it('timeline displays only stored pickup and delivered timestamps', () => {
  render(<DeliveryTimeline detail={detail} />);
  expect(screen.getByText('Chưa có thời gian lấy hàng')).toBeVisible();
  expect(screen.getByText('Chưa có thời gian giao thành công')).toBeVisible();
  expect(screen.getByText(/không lưu thời gian nhận chuyến/)).toBeVisible();
});
it('action buttons require confirmation and show COD amount before completion', async () => {
  const action = vi.fn().mockResolvedValue(undefined);
  render(
    <DeliveryActionButtons
      detail={{
        ...detail,
        deliveryStatus: 'DELIVERING',
        order: { ...detail.order, orderStatus: 'DELIVERING' },
      }}
      busy={false}
      onAction={action}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận giao thành công' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('đã thu COD');
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận bước giao hàng' }));
  await waitFor(() => expect(action).toHaveBeenCalledExactlyOnceWith('DELIVERED'));
});
it('profile validates before save and warns on unsaved navigation', async () => {
  const save = vi.fn();
  const { router } = await mount(
    <DriverProfileForm profile={profile} busy={false} onSave={save} />,
  );
  await userEvent.clear(screen.getByLabelText('Họ tên tài xế'));
  await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ tài xế' }));
  expect(await screen.findByText('Nhập họ tên.')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  void router.navigate('/other');
  expect(await screen.findByRole('dialog')).toHaveTextContent('Rời khỏi biểu mẫu?');
  await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }));
});
it('list provides an empty state and history requests only final own deliveries', async () => {
  const read = vi.spyOn(driverApi, 'deliveries').mockResolvedValue(pageOf([]));
  await mount(<DriverHistoryPage />);
  expect(await screen.findByText('Chưa có chuyến phù hợp')).toBeVisible();
  expect(read.mock.calls[0][0]).toMatchObject({ scope: 'history', size: 12 });
});
it('list has loading and safe error states without leaking backend detail', async () => {
  let reject: (error: unknown) => void = () => {};
  vi.spyOn(driverApi, 'deliveries').mockImplementation(
    () =>
      new Promise((_resolve, no) => {
        reject = no;
      }),
  );
  const view = await mount(<DriverDeliveriesPage />);
  expect(await screen.findByRole('status', { name: 'Đang tải nội dung' })).toBeVisible();
  reject(new ApiError(500, 'internal SQL private'));
  expect(await screen.findByRole('alert')).not.toHaveTextContent('internal SQL private');
  view.cache.clear();
});
it('dashboard and analytics use complete aggregates, never a page count or invented averages', async () => {
  vi.spyOn(driverApi, 'analytics').mockResolvedValue(stats);
  vi.spyOn(driverApi, 'profile').mockResolvedValue(profile);
  vi.spyOn(driverApi, 'deliveries').mockResolvedValue({
    ...pageOf([assigned]),
    size: 1,
    totalElements: 2,
    totalPages: 2,
  });
  await mount(<DriverDashboard />);
  expect(await screen.findByText('102')).toBeVisible();
  expect(screen.getByText('Chưa có dữ liệu')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Chào mừng tài xế' })).toBeVisible();
});
it('analytics rejects oversized date ranges before requesting more data', async () => {
  const read = vi.spyOn(driverApi, 'analytics').mockResolvedValue(stats);
  vi.spyOn(driverApi, 'profile').mockResolvedValue(profile);
  await mount(<DriverAnalyticsPage />);
  await screen.findByLabelText('Hoạt động từ ngày');
  fireEvent.change(screen.getByLabelText('Hoạt động từ ngày'), { target: { value: '2026-01-01' } });
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng kỳ hoạt động' }));
  expect(await screen.findByText('Chọn khoảng ngày hợp lệ, tối đa 93 ngày.')).toBeVisible();
  expect(read).toHaveBeenCalledTimes(1);
});
it('serializes double submission and refetches detail from the server', async () => {
  let current = detail,
    finish: () => void = () => {};
  vi.spyOn(driverApi, 'detail').mockImplementation(async () => current);
  const update = vi.spyOn(driverApi, 'transition').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = () => {
          current = {
            ...detail,
            deliveryStatus: 'PICKED_UP',
            pickupTime: '2026-11-09T11:00:00',
            order: {
              ...detail.order,
              deliveryOutputDTO: {
                deliveryId: 9,
                deliveryStatus: 'PICKED_UP',
                pickupTime: '2026-11-09T11:00:00',
                deliveredTime: null,
              },
            },
          };
          resolve({
            deliveryId: 9,
            deliveryStatus: 'PICKED_UP',
            pickupTime: current.pickupTime,
            deliveredTime: null,
            order: { orderId: 4, deliveryAddress: 'QA dropoff' },
            driver: { driverId: 1, name: 'QA Driver', phoneNumber: '090', licensePlate: null },
          });
        };
      }),
  );
  await mount(<DriverDeliveryDetailPage />, '/driver/deliveries/9');
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận đã lấy hàng' }));
  await userEvent.dblClick(screen.getByRole('button', { name: 'Xác nhận bước giao hàng' }));
  expect(update).toHaveBeenCalledTimes(1);
  finish();
  expect(await screen.findByRole('button', { name: 'Bắt đầu giao hàng' })).toBeVisible();
});
it('metrics do not fabricate monetary KPIs', () => {
  render(<DriverMetrics data={stats} />);
  expect(screen.getByText('102')).toBeVisible();
  expect(screen.queryByText(/₫|hoa hồng|tiền thưởng/)).not.toBeInTheDocument();
});
