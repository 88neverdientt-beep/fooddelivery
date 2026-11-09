import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { ApiError } from '@/lib/api/http';
import { CartPage } from './CartPage';
import { cartApi, cartQueryKey } from './api';
import { cartFixture, emptyCartFixture } from './testFixtures';

async function mount(
  id = 1,
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  const session = new Session(gateway(account('CUSTOMER', id)), immediateLock);
  await session.restore();
  const view = render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AuthProvider session={session}>
          <CartPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { ...view, client, session };
}
it('loads cart and serializes rapid quantity changes until server refetch completes', async () => {
  let current = structuredClone(cartFixture);
  vi.spyOn(cartApi, 'read').mockImplementation(async () => current);
  let complete: (() => void) | undefined;
  const update = vi.spyOn(cartApi, 'update').mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = () => {
          current = {
            ...current,
            cartItems: [{ ...current.cartItems[0], quantity: 2, subtotal: 40000 }],
            subtotal: 40000,
            totalAmount: 55000,
          };
          resolve(current.cartItems[0]);
        };
      }),
  );
  await mount();
  const increase = await screen.findByRole('button', { name: 'Tăng số lượng Phở thử nghiệm' });
  await userEvent.dblClick(increase);
  expect(update).toHaveBeenCalledExactlyOnceWith(31, 2);
  expect(increase).toBeDisabled();
  expect(screen.getByRole('spinbutton')).toHaveValue(1);
  complete!();
  await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveValue(2));
  expect(screen.getByText(/55\.000/)).toBeVisible();
});
it('removes the last item through API and displays the real empty state', async () => {
  let current = structuredClone(cartFixture);
  vi.spyOn(cartApi, 'read').mockImplementation(async () => current);
  const remove = vi.spyOn(cartApi, 'remove').mockImplementation(async () => {
    current = emptyCartFixture;
  });
  await mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Xóa Phở thử nghiệm khỏi giỏ' }));
  expect(
    await screen.findByRole('heading', { name: 'Giỏ hàng đang chờ một món ngon' }),
  ).toBeVisible();
  expect(remove).toHaveBeenCalledExactlyOnceWith(31);
});
it('handles a rejected update without optimistic money or automatic retry', async () => {
  vi.spyOn(cartApi, 'read').mockResolvedValue(cartFixture);
  const update = vi.spyOn(cartApi, 'update').mockRejectedValue(new ApiError(409, '409'));
  await mount();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Tăng số lượng Phở thử nghiệm' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Giỏ đã được đối chiếu');
  expect(screen.getByRole('spinbutton')).toHaveValue(1);
  expect(update).toHaveBeenCalledTimes(1);
});
it('does not render a different account cached cart while loading', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(cartQueryKey(1, 1), cartFixture);
  vi.spyOn(cartApi, 'read').mockResolvedValue(emptyCartFixture);
  await mount(2, client);
  expect(
    await screen.findByRole('heading', { name: 'Giỏ hàng đang chờ một món ngon' }),
  ).toBeVisible();
  expect(screen.queryByText('Phở thử nghiệm')).not.toBeInTheDocument();
});
it('shows read failures and supports explicit retry', async () => {
  const read = vi
    .spyOn(cartApi, 'read')
    .mockRejectedValueOnce(new ApiError(0, 'NETWORK'))
    .mockResolvedValue(emptyCartFixture);
  await mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
  expect(
    await screen.findByRole('heading', { name: 'Giỏ hàng đang chờ một món ngon' }),
  ).toBeVisible();
  expect(read).toHaveBeenCalledTimes(2);
});
