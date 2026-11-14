import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  priceInput,
  profileInput,
  nextRestaurantStatus,
  sameMenu,
  periodValid,
  type Analytics,
} from './model';
import { createRestaurantApi, restaurantApi, managementKey } from './api';
import { MenuForm, RestaurantMenuPage } from './MenuPages';
import { RestaurantProfileForm } from './ProfilePage';
import { Metrics } from './DashboardPages';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { ToastProvider } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
const item = {
  restaurantFoodItemId: 9,
  price: 25000,
  isAvailable: true,
  restaurant: { restaurantId: 1, name: 'Quán thật', address: 'Hà Nội' },
  foodItem: { itemId: 7, name: 'Phở catalog', category: 'Phở', description: 'Dữ liệu thật từ API' },
};
const profile = {
  restaurantId: 1,
  name: 'Quán thật',
  address: 'Hà Nội',
  phoneNumber: '0901234567',
  restaurantStatus: true,
  createdAt: null,
};
it.each(['0', '-1', '25,000', '12.345', '10000000000', '1e4', 'NaN'])(
  'rejects unsupported price %s without rounding',
  (price) => expect(priceInput.safeParse(price).success).toBe(false),
);
it.each(['0.01', '25000', '25000.50', '9999999999.99'])(
  'accepts backend decimal precision %s',
  (price) => expect(priceInput.safeParse(price).success).toBe(true),
);
it('restricts profile to mutable valid fields', () => {
  expect(profileInput.safeParse({ ...profile, name: ' ' }).success).toBe(false);
  expect(profileInput.safeParse({ ...profile, phoneNumber: '1'.repeat(16) }).success).toBe(false);
  expect(profileInput.parse({ ...profile, role: 'ADMIN' })).not.toHaveProperty('role');
});
it('maps only the three Restaurant transitions, never delivery or payment completion', () => {
  expect(nextRestaurantStatus('PENDING')).toBe('CONFIRMED');
  expect(nextRestaurantStatus('CONFIRMED')).toBe('PREPARING');
  expect(nextRestaurantStatus('PREPARING')).toBe('READY');
  for (const status of ['READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'])
    expect(nextRestaurantStatus(status)).toBeUndefined();
});
it('detects stale menu state and bounds analytics periods', () => {
  expect(sameMenu(item, { ...item, price: 26000 })).toBe(false);
  expect(sameMenu(item, { ...item, isAvailable: false })).toBe(false);
  expect(periodValid('2026-01-01', '2026-01-31')).toBe(true);
  expect(periodValid('2026-01-01', '2026-12-31')).toBe(false);
  expect(periodValid('2026-02-01', '2026-01-01')).toBe(false);
  expect(periodValid('2026-02-30', '2026-03-01')).toBe(false);
});
it('derives Restaurant identity instead of accepting owner IDs from callers', async () => {
  const request = vi.fn().mockResolvedValue(item);
  const api = createRestaurantApi(request, () => account('RESTAURANT'));
  const creationKey = '11111111-1111-4111-8111-111111111111';
  await api.createDish(
    { name: 'Phở', category: 'Phở', description: 'Nóng', price: '25000.50', isAvailable: true },
    creationKey,
  );
  expect(request).toHaveBeenCalledExactlyOnceWith('/restaurant-management/dishes', {
    method: 'POST',
    body: {
      name: 'Phở',
      category: 'Phở',
      description: 'Nóng',
      price: 25000.5,
      isAvailable: true,
      creationKey,
    },
  });
});
it('sends a frozen expected price/availability pair for conditional writes', async () => {
  const request = vi.fn().mockResolvedValue({ ...item, price: 27000, isAvailable: false });
  await createRestaurantApi(request, () => account('RESTAURANT')).update(item, {
    price: '27000',
    isAvailable: false,
  });
  expect(request).toHaveBeenCalledExactlyOnceWith('/restaurant-food-items/9', {
    method: 'PUT',
    body: { price: 27000, isAvailable: false, expectedPrice: 25000, expectedIsAvailable: true },
  });
});
it('does not read/mutate management under another role or resource owner', async () => {
  const request = vi.fn();
  await expect(
    createRestaurantApi(request, () => account('CUSTOMER')).profile(),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    createRestaurantApi(request, () => account('RESTAURANT', 2)).update(item, {
      price: '27000',
      isAvailable: true,
    }),
  ).rejects.toMatchObject({ status: 404 });
  expect(request).not.toHaveBeenCalled();
});
it('uses scoped bounded order discovery and validates private profile identity', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ items: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
  const api = createRestaurantApi(request, () => account('RESTAURANT'));
  await api.orders({ q: 'A%_', status: 'PENDING' });
  expect(request.mock.calls[0][0]).toBe(
    '/restaurant-management/orders?page=0&size=12&q=A%25_&status=PENDING',
  );
  request.mockResolvedValue({ ...profile, restaurantId: 2 });
  await expect(api.profile()).rejects.toMatchObject({ code: 'CONTRACT' });
  await expect(api.updateProfile(profile)).rejects.toMatchObject({ code: 'CONTRACT' });
  expect(managementKey(1, 1)).not.toEqual(managementKey(2, 2));
});
function formMount(element: React.ReactNode) {
  const router = createMemoryRouter(
    [
      { path: '/', element },
      { path: '/restaurant/menu', element: <h1>Menu destination</h1> },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
it('MenuForm validates and submits only price/availability without catalog edits', async () => {
  const save = vi.fn().mockResolvedValue(item);
  formMount(<MenuForm item={item} busy={false} onSave={save} />);
  const field = screen.getByLabelText('Giá bán (VND)');
  await userEvent.clear(field);
  await userEvent.type(field, '0');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi món' }));
  expect(await screen.findByText('Giá phải lớn hơn 0.')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
  await userEvent.clear(field);
  await userEvent.type(field, '27000.50');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi món' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledExactlyOnceWith({ price: '27000.50', isAvailable: true }),
  );
});
it('warns before discarding unsaved menu form changes', async () => {
  formMount(<MenuForm item={item} busy={false} onSave={vi.fn()} />);
  await userEvent.clear(screen.getByLabelText('Giá bán (VND)'));
  await userEvent.type(screen.getByLabelText('Giá bán (VND)'), '28000');
  await userEvent.click(screen.getByRole('link', { name: 'Về thực đơn' }));
  expect(await screen.findByRole('dialog')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }));
  expect(screen.getByLabelText('Giá bán (VND)')).toHaveValue('28000');
  await userEvent.click(screen.getByRole('link', { name: 'Về thực đơn' }));
  await userEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi và rời đi' }));
  expect(await screen.findByRole('heading', { name: 'Menu destination' })).toBeVisible();
});
it('Restaurant profile form exposes only permitted fields and reports validation', async () => {
  const save = vi.fn();
  formMount(<RestaurantProfileForm profile={profile} busy={false} onSave={save} />);
  expect(screen.queryByLabelText(/ID|owner|role|email/i)).not.toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText('Tên nhà hàng'));
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin nhà hàng' }));
  expect(await screen.findByText('Nhập tên nhà hàng.')).toBeVisible();
  expect(save).not.toHaveBeenCalled();
});
it('renders server KPI values and no invented rating when count is zero', () => {
  const data: Analytics = {
    from: '2026-01-01',
    to: '2026-01-31',
    totalOrders: 3,
    states: { PENDING: 2, PREPARING: 0, COMPLETED: 1 },
    paidOrderCount: 1,
    paidFoodValue: 25000,
    paidShipping: 15000,
    activeMenuCount: 2,
    ratingsCount: 0,
    averageRating: null,
    ordersByDay: [],
    paidFoodByDay: [],
    topItems: [],
  };
  render(<Metrics data={data} />);
  expect(screen.getByText('Chưa có đánh giá')).toBeVisible();
  expect(screen.getByText('3')).toBeVisible();
  expect(screen.queryByText('4.5')).not.toBeInTheDocument();
});
it('menu mutations serialize double clicks and refetch before showing availability', async () => {
  let current = item;
  vi.spyOn(restaurantApi, 'menu').mockImplementation(async () => ({
    items: [current],
    page: 0,
    size: 12,
    totalElements: 1,
    totalPages: 1,
  }));
  let complete: () => void = () => {};
  const update = vi.spyOn(restaurantApi, 'update').mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = () => {
          current = { ...item, isAvailable: false };
          resolve(current);
        };
      }),
  );
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const session = new Session(gateway(account('RESTAURANT')), immediateLock, () => cache.clear());
  await session.restore();
  const router = createMemoryRouter([{ path: '/', element: <RestaurantMenuPage /> }], {
    initialEntries: ['/'],
  });
  render(
    <QueryClientProvider client={cache}>
      <AuthProvider session={session}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  const button = await screen.findByRole('button', { name: 'Ngừng bán Phở catalog' });
  await userEvent.dblClick(button);
  expect(update).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  complete();
  expect(await screen.findByRole('button', { name: 'Bật bán Phở catalog' })).toBeVisible();
});
it('normalizes failed API payloads without rendering internal server details', async () => {
  const api = createRestaurantApi(vi.fn().mockResolvedValue({ passwordHash: 'hidden' }), () =>
    account('RESTAURANT'),
  );
  await expect(api.analytics()).rejects.toBeInstanceOf(ApiError);
});
