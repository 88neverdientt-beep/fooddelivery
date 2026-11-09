import { it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MenuItem, Role } from '@/types/domain';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { account, anonymousSession, gateway, immediateLock } from '@/test/fixtures';
import { cartApi, cartQueryKey, type Cart } from '@/features/cart/api';
import { cartFixture, emptyCartFixture } from '@/features/cart/testFixtures';
import { FoodDetailPage } from './FoodDetail';
import { publicApi } from './api';

const restaurant = {
  restaurantId: 21,
  name: 'Quán từ API',
  address: 'Hà Nội',
  restaurantStatus: true,
};
const item: MenuItem = {
  restaurantFoodItemId: 41,
  price: 20000,
  isAvailable: true,
  restaurant,
  foodItem: {
    itemId: 51,
    name: 'Phở thử nghiệm',
    category: 'Phở',
    description: 'Mô tả từ máy chủ',
  },
};
function LoginFixture() {
  const location = useLocation();
  return <h1>Đăng nhập rồi trở lại {(location.state as { from: string }).from}</h1>;
}
async function setup(
  role: Role | null = 'CUSTOMER',
  overrides: Partial<MenuItem> = {},
  path = '/restaurants/21/food/41',
  initialCart: Cart = emptyCartFixture,
) {
  vi.spyOn(publicApi, 'restaurant').mockResolvedValue(restaurant);
  const menu = vi.spyOn(publicApi, 'menuItem').mockResolvedValue({ ...item, ...overrides });
  const read = vi.spyOn(cartApi, 'read').mockResolvedValue(initialCart);
  const add = vi.spyOn(cartApi, 'add').mockResolvedValue(cartFixture.cartItems[0]);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const session = role
    ? new Session(gateway(account(role)), immediateLock, () => client.clear())
    : anonymousSession().session;
  await session.restore().catch(() => {});
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <AuthProvider session={session}>
          <Routes>
            <Route path="/restaurants/:id/food/:foodId" element={<FoodDetailPage />} />
            <Route path="/login" element={<LoginFixture />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { ...view, menu, read, add, client, session };
}
it('FoodDetail renders real food data and sends only the server menu ID plus selected quantity', async () => {
  const view = await setup();
  let current = emptyCartFixture;
  view.read.mockImplementation(async () => current);
  view.add.mockImplementation(async () => {
    current = {
      ...cartFixture,
      cartItems: [{ ...cartFixture.cartItems[0], quantity: 2, subtotal: 40000 }],
      subtotal: 40000,
      totalAmount: 55000,
    };
    return current.cartItems[0];
  });
  expect(await screen.findByRole('heading', { name: 'Phở thử nghiệm' })).toBeVisible();
  const add = screen.getByRole('button', { name: 'Thêm vào giỏ hàng' });
  await waitFor(() => expect(add).toBeEnabled());
  await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
  await userEvent.click(add);
  expect(view.add).toHaveBeenCalledExactlyOnceWith({ restaurantFoodItemId: 41, quantity: 2 });
  expect(await screen.findByRole('link', { name: 'Xem giỏ hàng' })).toBeVisible();
  expect(view.client.getQueryData(cartQueryKey(1, 1))).toMatchObject({ totalAmount: 55000 });
});
it('FoodDetail sends a guest to login with the valid return path and no cart request', async () => {
  const view = await setup(null);
  await userEvent.click(await screen.findByRole('link', { name: 'Đăng nhập để thêm món' }));
  expect(
    await screen.findByRole('heading', { name: 'Đăng nhập rồi trở lại /restaurants/21/food/41' }),
  ).toBeVisible();
  expect(view.read).not.toHaveBeenCalled();
  expect(view.add).not.toHaveBeenCalled();
});
it('FoodDetail prevents zero or overflowing quantities before any mutation', async () => {
  const view = await setup();
  const add = await screen.findByRole('button', { name: 'Thêm vào giỏ hàng' });
  await waitFor(() => expect(add).toBeEnabled());
  const quantity = screen.getByRole('spinbutton', { name: 'Số lượng' });
  await userEvent.clear(quantity);
  await userEvent.type(quantity, '0');
  await userEvent.click(add);
  expect(screen.getByText('Chọn ít nhất 1 phần.')).toBeVisible();
  await userEvent.clear(quantity);
  await userEvent.type(quantity, '2147483648');
  await userEvent.click(add);
  expect(screen.getByText('Số lượng vượt giới hạn máy chủ.')).toBeVisible();
  expect(view.add).not.toHaveBeenCalled();
});
it('FoodDetail does not silently clear a cart belonging to another restaurant', async () => {
  const view = await setup('CUSTOMER', {}, '/restaurants/21/food/41', {
    ...cartFixture,
    restaurant: { restaurantId: 99, name: 'Quán khác' },
  });
  expect(await screen.findByRole('link', { name: 'Xem giỏ hiện tại' })).toHaveAttribute(
    'href',
    '/customer/cart',
  );
  expect(screen.getByRole('button', { name: 'Thêm vào giỏ hàng' })).toBeDisabled();
  expect(view.add).not.toHaveBeenCalled();
});
it('FoodDetail blocks an unavailable item and a non-Customer role', async () => {
  const view = await setup('CUSTOMER', { isAvailable: false });
  expect(await screen.findByRole('button', { name: 'Thêm vào giỏ hàng' })).toBeDisabled();
  expect(view.add).not.toHaveBeenCalled();
  view.unmount();
  vi.restoreAllMocks();
  const other = await setup('ADMIN');
  expect(await screen.findByText('Chức năng đặt món dành cho tài khoản CUSTOMER.')).toBeVisible();
  expect(other.read).not.toHaveBeenCalled();
  expect(other.add).not.toHaveBeenCalled();
});
it('FoodDetail rejects menu/restaurant URL mismatches instead of adding a different resource', async () => {
  const view = await setup('CUSTOMER', { restaurant: { ...restaurant, restaurantId: 99 } });
  expect(await screen.findByRole('heading', { name: 'Không tìm thấy thông tin' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Thêm vào giỏ hàng' })).not.toBeInTheDocument();
  expect(view.add).not.toHaveBeenCalled();
});
it('FoodDetail does not write or announce an old add result after logout', async () => {
  const view = await setup();
  let complete: () => void = () => {};
  view.add.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = () => resolve(cartFixture.cartItems[0]);
      }),
  );
  const add = await screen.findByRole('button', { name: 'Thêm vào giỏ hàng' });
  await waitFor(() => expect(add).toBeEnabled());
  await userEvent.click(add);
  await waitFor(() => expect(view.add).toHaveBeenCalledTimes(1));
  await act(async () => {
    await view.session.logout();
  });
  expect(await screen.findByRole('link', { name: 'Đăng nhập để thêm món' })).toBeVisible();
  await act(async () => {
    complete();
  });
  expect(view.client.getQueryData(cartQueryKey(1, 1))).toBeUndefined();
  expect(screen.queryByRole('link', { name: 'Xem giỏ hàng' })).not.toBeInTheDocument();
});
