import { it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Session } from '@/features/auth/session';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { ToastProvider } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { createAdminApi, adminApi } from './api';
import { createAdminExistingApi, adminExistingApi, adminKey } from './existing-api';
import {
  managedAccountSchema,
  analyticsSchema,
  rangeValid,
  presetDates,
  type Analytics,
  type AccountRow,
  type CreateProfileInput,
} from './model';
import {
  AdminAccountsPage,
  AdminCustomersPage,
  AdminRestaurantsPage,
  AdminDriversPage,
  AdminOrdersPage,
  AdminDeliveriesPage,
  AdminPaymentsPage,
  AdminReviewsPage,
  ReviewDetail,
  AdminStatus,
  adminTime,
} from './ListPages';
import { AdminProfilePage, AdminCustomerDetail, AdminOrderView } from './ExistingPages';
import { AdminAccountDetail } from './AccountPage';
import { AdminProfileEditor, editProfileSchema } from './ProfilePages';
import { AdminDashboard, AdminAnalyticsPage, AdminMetrics } from './DashboardPages';
import { AdminCreateProfile } from './CreatePages';
import type { Order } from '@/features/orders/model';
import { WorkspaceLayout, workspaceNav } from '@/features/workspace/Workspace';
import { driverApi } from '@/features/driver-management/api';
import { restaurantApi } from '@/features/restaurant-management/api';
import { Link } from 'react-router-dom';

const target: AccountRow = {
  ...account('CUSTOMER', 21),
  name: 'Khách QA',
  createdAt: '2026-11-10T08:00:00',
};
const report: Analytics = {
  from: '2026-11-01',
  to: '2026-11-10',
  businessToday: '2026-11-10',
  timeZone: 'Asia/Ho_Chi_Minh',
  allTimeCounts: { customers: 101, restaurants: 42, drivers: 37, accounts: 181, orders: 260 },
  orderCohort: {
    total: 24,
    states: {
      PENDING: 3,
      CONFIRMED: 1,
      PREPARING: 1,
      READY: 1,
      DELIVERING: 1,
      COMPLETED: 15,
      CANCELLED: 2,
    },
    nonCancelledOrderValue: 250000,
    days: [{ date: '2026-11-10', count: 24 }],
  },
  recordedSuccessfulPayments: {
    count: 15,
    foodValue: 300000,
    shippingValue: 225000,
    totalValue: 525000,
    days: [{ date: '2026-11-10', amount: 525000 }],
  },
  deliveryCohort: {
    states: { PENDING: 2, PICKED_UP: 2, DELIVERING: 1, DELIVERED: 15, CANCELLED: 2 },
    terminalCount: 17,
    deliveredCount: 15,
    deliveredSharePercent: 88.2353,
  },
  paymentMethods: [{ methodCode: 'COD', methodName: 'COD', count: 24, successfulCount: 15 }],
  topRestaurants: [{ subject: { id: 5, name: 'Bếp QA' }, count: 24, completedCount: 15 }],
  topDrivers: [{ subject: { id: 7, name: 'Tài xế QA' }, count: 15, completedCount: 15 }],
};
const page = <T,>(items: T[]) => ({ items, page: 0, size: 20, totalElements: 71, totalPages: 4 });
const customer = {
  customerId: 21,
  name: 'Khách QA',
  email: 'qa@test.example',
  phoneNumber: '0901234567',
  address: 'QA address',
  createdAt: '2026-11-10T08:00:00',
};
const driver = {
  driverId: 7,
  name: 'Tài xế QA',
  email: 'driver@test.example',
  phoneNumber: '0901234567',
  address: 'QA driver',
  licensePlate: 'TEST07',
  driveStatus: true,
  createdAt: null,
};
const order: Order = {
  orderId: 10,
  customer: { customerId: 21, name: 'Khách QA' },
  restaurant: { restaurantId: 5, name: 'Bếp QA' },
  deliveryAddress: 'QA dropoff',
  subtotal: 20000,
  shippingFee: 15000,
  totalAmount: 35000,
  orderStatus: 'CONFIRMED',
  createdAt: '2026-11-10T08:00:00',
  orderDetails: [
    {
      orderDetailId: 1,
      foodItemName: 'Món QA',
      quantity: 1,
      unitPrice: 20000,
      subtotalItem: 20000,
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
    paymentId: 4,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    amount: 35000,
    paidAt: null,
    refundedAt: null,
  },
};
async function mount(element: React.ReactNode, path = '/', pattern = '/') {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const session = new Session(gateway(account('ADMIN')), immediateLock, () => cache.clear());
  await session.restore();
  const router = createMemoryRouter(
    [
      { path: pattern, element },
      { path: '/other', element: <h1>Other</h1> },
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <QueryClientProvider client={cache}>
      <AuthProvider session={session}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { cache, session, router, ...view };
}
it.each(['CUSTOMER', 'RESTAURANT', 'DRIVER'] as const)(
  'does not issue ADMIN API calls for %s',
  async (role) => {
    const request = vi.fn();
    await expect(createAdminApi(request, () => account(role)).accounts()).rejects.toMatchObject({
      status: 403,
    });
    await expect(createAdminExistingApi(request, () => account(role)).me()).rejects.toMatchObject({
      status: 403,
    });
    expect(request).not.toHaveBeenCalled();
  },
);
it('accepts disabled managed identities but rejects forged role/profile relationships', () => {
  expect(managedAccountSchema.safeParse({ ...target, status: 'DISABLED' }).success).toBe(true);
  expect(managedAccountSchema.safeParse({ ...target, role: 'ADMIN' }).success).toBe(false);
});
it('uses server pagination and only the approved read endpoint', async () => {
  const request = vi.fn().mockResolvedValue(page([target]));
  const api = createAdminApi(request, () => account('ADMIN'));
  await api.accounts({ q: '100%_!', page: 2, size: 20 });
  expect(request.mock.calls[0][0]).toContain('/admin-management/accounts?');
  expect(new URL(request.mock.calls[0][0], 'http://test').searchParams.get('q')).toBe('100%_!');
  expect(new URL(request.mock.calls[0][0], 'http://test').searchParams.get('page')).toBe('2');
});
it('sends a conditional status write and validates the exact affected account', async () => {
  const request = vi.fn().mockResolvedValue({ ...target, status: 'DISABLED' });
  await createAdminApi(request, () => account('ADMIN')).status(21, 'DISABLED', 'ACTIVE');
  expect(request).toHaveBeenCalledWith('/admin/accounts/21/status', {
    method: 'PUT',
    body: { status: 'DISABLED', expectedStatus: 'ACTIVE' },
  });
  request.mockResolvedValue({ ...target, accountId: 22 });
  await expect(
    createAdminApi(request, () => account('ADMIN')).status(21, 'DISABLED', 'ACTIVE'),
  ).rejects.toMatchObject({ status: 502 });
});
it('rejects mismatched detail IDs and stale reads after switching ADMIN sessions', async () => {
  const request = vi.fn().mockResolvedValue({ ...customer, customerId: 22 });
  await expect(
    createAdminExistingApi(request, () => account('ADMIN')).customer(21),
  ).rejects.toMatchObject({ status: 502 });
  let identity = account('ADMIN');
  const api = createAdminExistingApi(
    async () => {
      identity = account('ADMIN', 2);
      return customer;
    },
    () => identity,
  );
  await expect(api.customer(21)).rejects.toMatchObject({ name: 'AbortError' });
});
it('keeps account caches separate and does not reinterpret business wall time using the browser zone', () => {
  expect(adminKey(1)).not.toEqual(adminKey(2));
  expect(adminTime('2026-11-10T00:00:00.000001')).toBe('10/11/2026 00:00:00');
  expect(adminTime(null)).toBe('Chưa ghi nhận');
});
it('validates actual calendar boundaries and exactly93inclusive days', () => {
  expect(rangeValid('2026-01-01', '2026-04-03')).toBe(true);
  expect(rangeValid('2026-01-01', '2026-04-04')).toBe(false);
  expect(rangeValid('2026-02-30', '2026-03-01')).toBe(false);
  expect(rangeValid('2026-03-02', '2026-03-01')).toBe(false);
  expect(presetDates('2026-01-02', 7)).toEqual({ from: '2025-12-27', to: '2026-01-02' });
});
it('requires all backend state groups instead of fabricating missing zero counts', () => {
  expect(
    analyticsSchema.safeParse({ ...report, orderCohort: { ...report.orderCohort, states: {} } })
      .success,
  ).toBe(false);
});
it('does not display revenue or a success percentage when the backend reports no qualifying events', () => {
  render(
    <AdminMetrics
      data={{
        ...report,
        recordedSuccessfulPayments: {
          count: 0,
          foodValue: 0,
          shippingValue: 0,
          totalValue: 0,
          days: [],
        },
        deliveryCohort: {
          ...report.deliveryCohort,
          deliveredSharePercent: null,
          terminalCount: 0,
          deliveredCount: 0,
        },
      }}
    />,
  );
  expect(screen.getByText('Chưa đủ dữ liệu')).toBeVisible();
  expect(screen.queryByText('0%')).not.toBeInTheDocument();
  expect(screen.getByText(/không phải lợi nhuận/)).toBeVisible();
});
it.each(['ACTIVE', 'DISABLED'])('labels %s without relying only on badge color', (value) => {
  render(<AdminStatus value={value} />);
  expect(screen.getByText(value === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hóa')).toBeVisible();
});
const listCases = [
  {
    name: 'accounts',
    title: 'Quản lý tài khoản',
    view: <AdminAccountsPage />,
    stub: () => vi.spyOn(adminApi, 'accounts').mockResolvedValue(page([target])),
  },
  {
    name: 'customers',
    title: 'Khách hàng',
    view: <AdminCustomersPage />,
    stub: () =>
      vi
        .spyOn(adminApi, 'customers')
        .mockResolvedValue(
          page([{ ...customer, accountId: 21, accountStatus: 'ACTIVE', orderCount: 8 }]),
        ),
  },
  {
    name: 'restaurants',
    title: 'Quản lý nhà hàng',
    view: <AdminRestaurantsPage />,
    stub: () =>
      vi.spyOn(adminApi, 'restaurants').mockResolvedValue(
        page([
          {
            restaurantId: 5,
            name: 'Bếp QA',
            address: 'QA pickup',
            restaurantStatus: false,
            createdAt: null,
            accountId: 5,
            accountStatus: 'ACTIVE',
            orderCount: 8,
            menuCount: 2,
          },
        ]),
      ),
  },
  {
    name: 'drivers',
    title: 'Quản lý tài xế',
    view: <AdminDriversPage />,
    stub: () =>
      vi.spyOn(adminApi, 'drivers').mockResolvedValue(
        page([
          {
            ...driver,
            accountId: 7,
            accountStatus: 'ACTIVE',
            deliveryCount: 8,
            activeDeliveryCount: 2,
          },
        ]),
      ),
  },
  {
    name: 'orders',
    title: 'Giám sát đơn hàng',
    view: <AdminOrdersPage />,
    stub: () =>
      vi.spyOn(adminApi, 'orders').mockResolvedValue(
        page([
          {
            orderId: 10,
            customer: { id: 21, name: 'Khách QA' },
            restaurant: { id: 5, name: 'Bếp QA' },
            createdAt: order.createdAt,
            subtotal: 20000,
            shippingFee: 15000,
            totalAmount: 35000,
            orderStatus: 'CONFIRMED',
            paymentId: 4,
            paymentStatus: 'PENDING',
            deliveryId: 9,
            deliveryStatus: 'PENDING',
          },
        ]),
      ),
  },
  {
    name: 'deliveries',
    title: 'Giám sát giao hàng',
    view: <AdminDeliveriesPage />,
    stub: () =>
      vi.spyOn(adminApi, 'deliveries').mockResolvedValue(
        page([
          {
            deliveryId: 9,
            orderId: 10,
            driver: null,
            restaurant: { id: 5, name: 'Bếp QA' },
            orderStatus: 'CONFIRMED',
            deliveryStatus: 'PENDING',
            pickupTime: null,
            deliveredTime: null,
            orderCreatedAt: order.createdAt,
          },
        ]),
      ),
  },
  {
    name: 'payments',
    title: 'Giám sát thanh toán',
    view: <AdminPaymentsPage />,
    stub: () =>
      vi.spyOn(adminApi, 'payments').mockResolvedValue(
        page([
          {
            paymentId: 4,
            orderId: 10,
            methodCode: 'COD',
            methodName: 'COD',
            amount: 35000,
            paymentStatus: 'PENDING',
            createdAt: order.createdAt,
            paidAt: null,
            refundedAt: null,
            orderStatus: 'CONFIRMED',
          },
        ]),
      ),
  },
  {
    name: 'reviews',
    title: 'Đánh giá khách hàng',
    view: <AdminReviewsPage />,
    stub: () =>
      vi.spyOn(adminApi, 'reviews').mockResolvedValue(
        page([
          {
            ratingId: 12,
            score: 5,
            comment: 'QA review',
            createdAt: order.createdAt,
            customer: { id: 21, name: 'Khách QA' },
            restaurant: { id: 5, name: 'Bếp QA' },
          },
        ]),
      ),
  },
];
it.each(listCases)(
  'renders $name using backend totals and requests subsequent pages',
  async ({ view, title, stub }) => {
    const api = stub();
    await mount(view);
    expect(await screen.findByRole('table', { name: title })).toBeVisible();
    expect(screen.getByText('71 kết quả · tối đa 20/trang')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: '1' }),
        expect.any(AbortSignal),
      ),
    );
  },
);
it('applies search only on submit and keeps its literal text', async () => {
  const api = vi.spyOn(adminApi, 'accounts').mockResolvedValue(page([target]));
  await mount(<AdminAccountsPage />);
  await screen.findByRole('table');
  await userEvent.type(screen.getByLabelText('Tìm kiếm'), '100%_!');
  expect(api).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));
  await waitFor(() =>
    expect(api).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: '100%_!' }),
      expect.any(AbortSignal),
    ),
  );
});
it('has separate loading, empty and server error recovery states', async () => {
  const api = vi.spyOn(adminApi, 'accounts').mockReturnValue(new Promise(() => {}));
  const view = await mount(<AdminAccountsPage />);
  expect(screen.getByRole('status', { name: 'Đang tải nội dung' })).toBeVisible();
  view.unmount();
  api.mockRejectedValue(new ApiError(500, 'SERVER'));
  const failed = await mount(<AdminAccountsPage />);
  expect(await screen.findByRole('alert')).toBeVisible();
  failed.unmount();
  api.mockResolvedValue(page([]));
  await mount(<AdminAccountsPage />);
  expect(await screen.findByText('Không có kết quả phù hợp')).toBeVisible();
});
it('review dialog displays untrusted comment as text and returns focus after Escape', async () => {
  const user = userEvent.setup();
  const row = {
    ratingId: 12,
    score: 5,
    comment: '<script>unsafe()</script>',
    createdAt: null,
    customer: { id: 21, name: 'QA' },
    restaurant: { id: 5, name: 'QA kitchen' },
  };
  render(<ReviewDetail row={row} />);
  const trigger = screen.getByRole('button', { name: 'Xem đánh giá #12' });
  await user.click(trigger);
  expect(screen.getByText(row.comment)).toBeVisible();
  expect(document.querySelector('script')).toBeNull();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
});
it('Admin profile uses verified me and no invented editable name or role', async () => {
  vi.spyOn(adminExistingApi, 'me').mockResolvedValue(account('ADMIN'));
  await mount(<AdminProfilePage />);
  expect(await screen.findByRole('heading', { name: account('ADMIN').email })).toBeVisible();
  expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Đổi mật khẩu' })).toBeVisible();
});
it('customer detail uses its route ID and exposes no cart or order mutation controls', async () => {
  const api = vi.spyOn(adminExistingApi, 'customer').mockResolvedValue(customer);
  await mount(<AdminCustomerDetail />, '/admin/customers/21', '/admin/customers/:id');
  expect(await screen.findByText('QA address')).toBeVisible();
  expect(api).toHaveBeenCalledWith(21, expect.any(AbortSignal));
  expect(
    screen.queryByRole('button', { name: /Tạo đơn|Giỏ hàng|Hủy đơn/ }),
  ).not.toBeInTheDocument();
});
it('order monitor keeps snapshot prices and provides no status mutation', async () => {
  await mount(<AdminOrderView order={order} />);
  expect(screen.getByText('Món QA')).toBeVisible();
  expect(screen.getAllByText(/35.000/).length).toBeGreaterThan(0);
  expect(
    screen.queryByRole('button', { name: /Hủy đơn|Xác nhận đơn|Giao thành công/ }),
  ).not.toBeInTheDocument();
});
it('status recovery blocks a second PUT when both commit-response and verification are lost', async () => {
  const detail = vi
    .spyOn(adminApi, 'account')
    .mockResolvedValueOnce(target)
    .mockRejectedValue(new ApiError(0, 'NETWORK'));
  const put = vi.spyOn(adminApi, 'status').mockRejectedValue(new ApiError(0, 'NETWORK'));
  const context = await mount(<AdminAccountDetail />, '/admin/accounts/21', '/admin/accounts/:id');
  await userEvent.click(await screen.findByRole('button', { name: 'Vô hiệu hóa tài khoản' }));
  const confirm = screen.getByRole('button', { name: 'Xác nhận trạng thái tài khoản' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(
    await screen.findByRole('button', { name: 'Kiểm tra kết quả trên máy chủ' }),
  ).toBeVisible();
  expect(put).toHaveBeenCalledTimes(1);
  detail.mockResolvedValue({ ...target, status: 'DISABLED' });
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết quả trên máy chủ' }));
  expect(await screen.findByRole('button', { name: 'Kích hoạt tài khoản' })).toBeEnabled();
  expect(put).toHaveBeenCalledTimes(1);
  expect(context.cache.getQueryData([...adminKey(1), 'account', 21])).toMatchObject({
    status: 'DISABLED',
  });
});
it('self-disable is not offered even though the backend also enforces it', async () => {
  vi.spyOn(adminApi, 'account').mockResolvedValue({
    ...account('ADMIN'),
    name: null,
    createdAt: null,
  });
  await mount(<AdminAccountDetail />, '/admin/accounts/1', '/admin/accounts/:id');
  expect(await screen.findByRole('button', { name: 'Vô hiệu hóa tài khoản' })).toBeDisabled();
});
it('profile form bounds match actual DTO limits and do not invent unknown activity', () => {
  const value = {
    kind: 'driver',
    name: 'T'.repeat(100),
    phoneNumber: '0901234567',
    address: 'QA',
    licensePlate: 'QA07',
    activity: 'true',
  };
  expect(editProfileSchema.safeParse(value).success).toBe(true);
  expect(editProfileSchema.safeParse({ ...value, name: 'T'.repeat(101) }).success).toBe(false);
  expect(
    editProfileSchema.safeParse({ ...value, kind: 'restaurant', name: 'R'.repeat(150) }).success,
  ).toBe(true);
  expect(editProfileSchema.safeParse({ ...value, activity: '' }).success).toBe(false);
});
it('profile validation rejects invalid fields before showing a save confirmation', async () => {
  const save = vi.spyOn(adminApi, 'saveDriver');
  await mount(<AdminProfileEditor kind="driver" id={7} profile={driver} />);
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Tên hồ sơ'));
  await user.click(screen.getByRole('button', { name: 'Kiểm tra và lưu hồ sơ' }));
  expect(await screen.findByText('Nhập tên hồ sơ.')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it.each([
  { view: <AdminDashboard />, title: 'Tổng quan quản trị' },
  { view: <AdminAnalyticsPage />, title: 'Báo cáo hoạt động' },
])('renders $title from full aggregates rather than one result page', async ({ view, title }) => {
  vi.spyOn(adminApi, 'analytics').mockResolvedValue(report);
  await mount(view);
  expect(
    within(await screen.findByRole('region', { name: 'Thanh toán thành công trong kỳ' })).getByText(
      '525.000 ₫',
    ),
  ).toBeVisible();
  expect(screen.getByRole('heading', { name: title })).toBeVisible();
  expect(screen.getByText('260')).toBeVisible();
  expect(screen.getByText('Giờ nghiệp vụ: Asia/Ho_Chi_Minh')).toBeVisible();
});
it('invalid report range does not issue a second request', async () => {
  const api = vi.spyOn(adminApi, 'analytics').mockResolvedValue(report);
  await mount(<AdminAnalyticsPage />);
  await screen.findByLabelText('Báo cáo từ ngày');
  fireEvent.change(screen.getByLabelText('Báo cáo từ ngày'), { target: { value: '2026-01-01' } });
  fireEvent.change(screen.getByLabelText('Báo cáo đến ngày'), { target: { value: '2026-05-01' } });
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng kỳ báo cáo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('tối đa 93 ngày');
  expect(api).toHaveBeenCalledTimes(1);
});
it('does not send an old profile write after logout while its preflight read is in flight', async () => {
  let resolve!: (value: typeof driver) => void;
  const read = vi.spyOn(adminExistingApi, 'driver').mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const save = vi.spyOn(adminApi, 'saveDriver').mockResolvedValue(driver);
  function GuardedEditor() {
    return useAuth().account?.role === 'ADMIN' ? (
      <AdminProfileEditor kind="driver" id={7} profile={driver} />
    ) : (
      <p>Đã kết thúc phiên</p>
    );
  }
  const context = await mount(<GuardedEditor />);
  await userEvent.clear(screen.getByLabelText('Tên hồ sơ'));
  await userEvent.type(screen.getByLabelText('Tên hồ sơ'), 'QA đổi tên');
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra và lưu hồ sơ' }));
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu hồ sơ' }));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  await act(async () => context.session.logout());
  await act(async () => resolve(driver));
  expect(screen.getByText('Đã kết thúc phiên')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
});
it('creates only the selected existing business profile and preserves password bytes without sending role or confirmation', async () => {
  const value: CreateProfileInput = {
    name: 'QA new driver',
    email: account('DRIVER', 7).email.toUpperCase(),
    phoneNumber: '0901234567',
    address: 'QA',
    licensePlate: 'QA-07',
    activity: 'true',
    password: '  Password-for-unit-7  ',
    confirmPassword: '  Password-for-unit-7  ',
  };
  const injected = { ...value, role: 'ADMIN', accountId: 99 };
  const request = vi.fn().mockResolvedValue(account('DRIVER', 7));
  await createAdminApi(request, () => account('ADMIN')).createProfile('DRIVER', injected);
  expect(request).toHaveBeenCalledWith('/drivers', {
    method: 'POST',
    body: {
      name: value.name,
      email: value.email.toLowerCase(),
      phoneNumber: value.phoneNumber,
      address: value.address,
      licensePlate: value.licensePlate,
      driveStatus: true,
      password: value.password,
    },
  });
});
it('unknown create result clears passwords and verifies the exact email without replaying POST', async () => {
  const post = vi.spyOn(adminApi, 'createProfile').mockRejectedValue(new ApiError(0, 'NETWORK'));
  const row: AccountRow = { ...account('RESTAURANT', 5), name: 'New kitchen', createdAt: null };
  vi.spyOn(adminApi, 'accounts').mockResolvedValue(page([row]));
  await mount(<AdminCreateProfile kind="RESTAURANT" />);
  const user = userEvent.setup();
  for (const [label, value] of [
    ['Tên hồ sơ mới', 'New kitchen'],
    ['Email đăng nhập mới', row.email],
    ['Số điện thoại mới', '0901234567'],
    ['Địa chỉ hồ sơ mới', 'QA address'],
    ['Mật khẩu tài khoản mới', 'Password-unit-new-7'],
    ['Xác nhận mật khẩu tài khoản mới', 'Password-unit-new-7'],
  ])
    await user.type(screen.getByLabelText(label, { exact: true }), value);
  await user.click(screen.getByRole('button', { name: 'Kiểm tra và tạo hồ sơ' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo hồ sơ' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo hồ sơ' }));
  expect(await screen.findByRole('link', { name: 'Mở hồ sơ đã xác minh' })).toHaveAttribute(
    'href',
    '/admin/restaurants/5',
  );
  expect(screen.getByLabelText('Mật khẩu tài khoản mới', { exact: true })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Kiểm tra và tạo hồ sơ' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Kiểm tra kết quả tạo' }));
  expect(post).toHaveBeenCalledTimes(1);
});
it('Admin layout exposes working management links without reading another role profile', async () => {
  const driverRead = vi.spyOn(driverApi, 'profile'),
    restaurantRead = vi.spyOn(restaurantApi, 'profile');
  await mount(<WorkspaceLayout />);
  const nav = screen.getByRole('navigation', { name: 'Điều hướng Quản trị viên' });
  for (const item of workspaceNav.ADMIN)
    expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute('href', item.to);
  expect(driverRead).not.toHaveBeenCalled();
  expect(restaurantRead).not.toHaveBeenCalled();
});
it('returning to an already cached Restaurant list after create shows the new profile without manual refresh', async () => {
  let created = false;
  const row = {
    restaurantId: 5,
    name: 'New cached kitchen',
    address: 'QA address',
    restaurantStatus: true,
    createdAt: null,
    accountId: 5,
    accountStatus: 'ACTIVE' as const,
    orderCount: 0,
    menuCount: 0,
  };
  const load = vi.spyOn(adminApi, 'restaurants').mockImplementation(async () => ({
    items: created ? [row] : [],
    page: 0,
    size: 20,
    totalElements: created ? 1 : 0,
    totalPages: created ? 1 : 0,
  }));
  vi.spyOn(adminApi, 'createProfile').mockImplementation(async () => {
    created = true;
    return account('RESTAURANT', 5);
  });
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30000 } },
  });
  const session = new Session(gateway(account('ADMIN')), immediateLock, () => cache.clear());
  await session.restore();
  const router = createMemoryRouter(
    [
      { path: '/admin/restaurants', element: <AdminRestaurantsPage /> },
      { path: '/admin/restaurants/new', element: <AdminCreateProfile kind="RESTAURANT" /> },
      {
        path: '/admin/restaurants/:id',
        element: <Link to="/admin/restaurants">Trở về danh sách đã mở</Link>,
      },
    ],
    { initialEntries: ['/admin/restaurants'] },
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
  await screen.findByText('Không có kết quả phù hợp');
  const user = userEvent.setup();
  await user.click(screen.getByRole('link', { name: 'Tạo nhà hàng' }));
  for (const [label, value] of [
    ['Tên hồ sơ mới', row.name],
    ['Email đăng nhập mới', account('RESTAURANT', 5).email],
    ['Số điện thoại mới', '0901234567'],
    ['Địa chỉ hồ sơ mới', row.address],
    ['Mật khẩu tài khoản mới', 'Password-cache-7'],
    ['Xác nhận mật khẩu tài khoản mới', 'Password-cache-7'],
  ])
    await user.type(screen.getByLabelText(label, { exact: true }), value);
  await user.click(screen.getByRole('button', { name: 'Kiểm tra và tạo hồ sơ' }));
  await user.click(screen.getByRole('button', { name: 'Xác nhận tạo hồ sơ' }));
  await user.click(await screen.findByRole('link', { name: 'Trở về danh sách đã mở' }));
  expect(await screen.findByText('#5 · New cached kitchen')).toBeVisible();
  expect(load).toHaveBeenCalledTimes(2);
});
