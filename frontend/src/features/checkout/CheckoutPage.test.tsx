import { it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { AuthenticatedRoute } from '@/app/guards';
import { gateway, immediateLock } from '@/test/fixtures';
import { api } from '@/lib/runtime';
import { ApiError } from '@/lib/api/http';
import { cartApi } from '@/features/cart/api';
import { cartFixture } from '@/features/cart/testFixtures';
import { ordersApi } from '@/features/orders/api';
import type { Order } from '@/features/orders/model';
import { checkoutApi } from './api';
import { CheckoutPage } from './CheckoutPage';
import { codFixture, orderFixture } from './testFixtures';
import { checkoutAttemptKey } from './model';

function mocks() {
  return {
    read: vi.spyOn(cartApi, 'read').mockResolvedValue(cartFixture),
    profile: vi
      .spyOn(api, 'get')
      .mockResolvedValue({ name: 'Khách thử nghiệm', address: orderFixture.deliveryAddress }),
    methods: vi.spyOn(checkoutApi, 'paymentMethods').mockResolvedValue([codFixture]),
    latest: vi.spyOn(ordersApi, 'latest').mockResolvedValue([]),
    create: vi.spyOn(checkoutApi, 'create').mockResolvedValue(orderFixture),
  };
}
async function mount(
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  const session = new Session(gateway(), immediateLock, () => client.clear());
  await session.restore();
  const content = (
    <MemoryRouter initialEntries={['/customer/checkout']}>
      <QueryClientProvider client={client}>
        <AuthProvider session={session}>
          <Routes>
            <Route element={<AuthenticatedRoute />}>
              <Route path="/customer/checkout" element={<CheckoutPage />} />
              <Route path="/customer/orders/71" element={<h1>Đơn máy chủ #71</h1>} />
            </Route>
            <Route path="/login" element={<h1>Đã ra khỏi phiên riêng tư</h1>} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
  return { ...render(content), client, session, content };
}
const button = () => screen.findByRole('button', { name: 'Xác nhận đặt hàng COD' });

it('checkout preflights server cart and prevents a rapid duplicate POST', async () => {
  const mock = mocks();
  let complete: (order: Order) => void = () => {};
  mock.create.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await mount();
  await userEvent.dblClick(await button());
  await waitFor(() =>
    expect(mock.create).toHaveBeenCalledExactlyOnceWith({
      deliveryAddress: orderFixture.deliveryAddress,
      paymentMethodId: codFixture.paymentMethodId,
    }),
  );
  expect(screen.queryByRole('button', { name: 'Xác nhận đặt hàng COD' })).not.toBeInTheDocument();
  await act(async () => {
    complete(orderFixture);
  });
  expect(await screen.findByRole('heading', { name: 'Đơn máy chủ #71' })).toBeVisible();
  // Initial quote, submit preflight, and authoritative cart invalidation after success.
  expect(mock.read).toHaveBeenCalledTimes(3);
});
it('price change updates the quote and requires another explicit confirmation before POST', async () => {
  const mock = mocks();
  const changed = { ...cartFixture, shippingFee: 16000, totalAmount: 36000 };
  mock.read.mockResolvedValueOnce(cartFixture).mockResolvedValue(changed);
  await mount();
  await userEvent.click(await button());
  expect(await screen.findByRole('alert')).toHaveTextContent('kiểm tra tổng tiền mới');
  expect(screen.getByText(/36\.000/)).toBeVisible();
  expect(mock.create).not.toHaveBeenCalled();
  await userEvent.click(await button());
  expect(await screen.findByRole('heading', { name: 'Đơn máy chủ #71' })).toBeVisible();
  expect(mock.create).toHaveBeenCalledTimes(1);
});
it('reconciles a timed-out POST with a uniquely matching server order without retrying it', async () => {
  const mock = mocks();
  mock.create.mockRejectedValue(new ApiError(0, 'TIMEOUT'));
  mock.latest.mockResolvedValueOnce([]).mockResolvedValue([orderFixture]);
  await mount();
  await userEvent.click(await button());
  expect(await screen.findByRole('heading', { name: 'Đơn máy chủ #71' })).toBeVisible();
  expect(mock.create).toHaveBeenCalledTimes(1);
  expect(mock.latest).toHaveBeenCalledTimes(2);
});
it('keeps an unresolved outcome blocked across remounts and only retries reads', async () => {
  const mock = mocks();
  mock.create.mockRejectedValue(new ApiError(0, 'NETWORK'));
  const view = await mount();
  await userEvent.click(await button());
  expect(await screen.findByText('Kết quả đặt hàng đang được xác minh')).toBeVisible();
  await waitFor(() =>
    expect(view.client.getQueryData(checkoutAttemptKey(1))).toMatchObject({ kind: 'uncertain' }),
  );
  view.unmount();
  render(view.content);
  expect(await screen.findByText('Kết quả đặt hàng đang được xác minh')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Xác nhận đặt hàng COD' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra trên máy chủ' }));
  await waitFor(() => expect(mock.latest).toHaveBeenCalledTimes(3));
  expect(mock.create).toHaveBeenCalledTimes(1);
});
it('handles a definite 409 as a rejected request and retains the server cart', async () => {
  const mock = mocks();
  mock.create.mockRejectedValue(new ApiError(409, '409'));
  const view = await mount();
  await userEvent.click(await button());
  expect(await screen.findByRole('alert')).toHaveTextContent('trạng thái vừa thay đổi');
  expect(screen.getByText('Phở thử nghiệm', { exact: false })).toBeVisible();
  expect(view.client.getQueryData(checkoutAttemptKey(1))).toBeNull();
  expect(mock.create).toHaveBeenCalledTimes(1);
});
it('does not repopulate private checkout/order cache after logout while POST resolves', async () => {
  const mock = mocks();
  let complete: (order: Order) => void = () => {};
  mock.create.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const view = await mount();
  await userEvent.click(await button());
  await waitFor(() => expect(mock.create).toHaveBeenCalledTimes(1));
  await act(async () => {
    await view.session.logout();
  });
  expect(await screen.findByRole('heading', { name: 'Đã ra khỏi phiên riêng tư' })).toBeVisible();
  await act(async () => {
    complete(orderFixture);
  });
  expect(view.client.getQueryData(checkoutAttemptKey(1))).toBeUndefined();
  expect(view.client.getQueryCache().findAll({ queryKey: ['customer', 1, 'orders'] })).toHaveLength(
    0,
  );
  expect(screen.queryByRole('heading', { name: 'Đơn máy chủ #71' })).not.toBeInTheDocument();
});
