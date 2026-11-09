import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { ToastProvider } from '@/components/feedback';
import { CustomerProfile } from './CustomerProfile';
import { createCustomerApi, customerApi, customerProfileInput } from './api';
import { ApiError } from '@/lib/api/http';

const saved = {
  customerId: 1,
  name: 'Nguyễn An',
  email: 'user1@test.example',
  phoneNumber: '0900000011',
  address: 'Hà Nội',
  createdAt: null,
};
it('profile validation matches mutable DTO bounds and refuses blank input', () => {
  expect(
    customerProfileInput.safeParse({ name: ' ', phoneNumber: '1', address: 'A' }).success,
  ).toBe(false);
  for (const [field, max] of [
    ['name', 100],
    ['phoneNumber', 15],
    ['address', 255],
  ] as const)
    expect(customerProfileInput.safeParse({ ...saved, [field]: 'x'.repeat(max + 1) }).success).toBe(
      false,
    );
});
it('updates only name/phone/address using verified identity, never accountId/role/price/email', async () => {
  const request = vi.fn().mockResolvedValue(saved);
  const api = createCustomerApi(request, () => account());
  await api.update({ ...saved, role: 'ADMIN', price: 1 } as typeof saved, 1);
  expect(request).toHaveBeenCalledExactlyOnceWith('/customers/1', {
    method: 'PUT',
    body: { name: saved.name, phoneNumber: saved.phoneNumber, address: saved.address },
  });
});
it('refuses stale actors and a mismatched returned customer instead of showing another profile', async () => {
  const request = vi.fn().mockResolvedValue({ ...saved, customerId: 2 });
  const api = createCustomerApi(request, () => account());
  await expect(api.update(saved, 2)).rejects.toMatchObject({ name: 'AbortError' });
  expect(request).not.toHaveBeenCalled();
  await expect(api.read()).rejects.toMatchObject({ code: 'CONTRACT' });
});
async function mount() {
  const cache = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const session = new Session(gateway(), immediateLock, () => cache.clear());
  await session.restore();
  render(
    <QueryClientProvider client={cache}>
      <AuthProvider session={session}>
        <ToastProvider>
          <CustomerProfile profile={saved} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
  return { cache, session };
}
it('edits profile through real adapter boundary and updates only the current account scoped cache', async () => {
  const update = vi.spyOn(customerApi, 'update').mockResolvedValue({ ...saved, name: 'Tên mới' });
  const { cache } = await mount();
  await userEvent.clear(screen.getByLabelText('Họ và tên'));
  await userEvent.type(screen.getByLabelText('Họ và tên'), 'Tên mới');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toBeVisible(),
  );
  expect(update).toHaveBeenCalledExactlyOnceWith(
    { name: 'Tên mới', phoneNumber: saved.phoneNumber, address: saved.address },
    1,
  );
  expect(cache.getQueryData(['account', 1, 'profile'])).toMatchObject({ name: 'Tên mới' });
});
it('keeps failed form values and does not automatically retry a rejected update', async () => {
  const update = vi.spyOn(customerApi, 'update').mockRejectedValue(new ApiError(409, '409'));
  await mount();
  await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(update).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Họ và tên')).toHaveValue(saved.name);
});
it('does not repopulate private cache or show a success after logout during profile save', async () => {
  let finish: ((value: typeof saved) => void) | undefined;
  vi.spyOn(customerApi, 'update').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { cache, session } = await mount();
  await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
  await waitFor(() => expect(finish).toBeDefined());
  await session.logout();
  finish!(saved);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Lưu hồ sơ' })).not.toBeInTheDocument(),
  );
  expect(cache.getQueryData(['account', 1, 'profile'])).toBeUndefined();
  expect(screen.queryByText('Đã cập nhật hồ sơ của bạn.')).not.toBeInTheDocument();
});
