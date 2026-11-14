import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { ToastProvider } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { MenuCreationPanel } from './MenuCreationPanel';
import { RestaurantMenuEditor } from './MenuPages';
import { restaurantApi } from './api';
import { publicApi } from '@/features/public/api';
const food = { itemId: 7, name: 'Phở Hà Nội', category: 'Phở', description: 'Nóng và thơm' };
const item = {
  restaurantFoodItemId: 9,
  price: 25000.5,
  isAvailable: true,
  restaurant: { restaurantId: 1, name: 'Bếp', address: 'Hà Nội' },
  foodItem: food,
};
async function mount(element: React.ReactNode) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    session = new Session(gateway(account('RESTAURANT')), immediateLock, () => cache.clear());
  await session.restore();
  const router = createMemoryRouter(
    [
      { path: '/', element },
      { path: '/restaurant/menu', element: <h1>Thực đơn</h1> },
    ],
    { initialEntries: ['/'] },
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
}
it('creates directly without selecting or querying a catalog and validates required fields', async () => {
  vi.spyOn(publicApi, 'categories').mockResolvedValue(['Phở']);
  const create = vi.spyOn(restaurantApi, 'createDish');
  await mount(<RestaurantMenuEditor />);
  expect(screen.getByLabelText('Tên món')).toBeVisible();
  expect(screen.queryByText(/catalog/i)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Lưu món ăn' }));
  expect(await screen.findByText('Nhập giá bán.')).toBeVisible();
  expect(create).not.toHaveBeenCalled();
});
it('serializes double submission and reads the persisted ID before navigating', async () => {
  vi.spyOn(publicApi, 'categories').mockResolvedValue(['Phở']);
  const create = vi.spyOn(restaurantApi, 'createDish').mockResolvedValue({ ...item, version: 0 });
  const read = vi.spyOn(restaurantApi, 'menuItem').mockResolvedValue({ ...item, version: 0 });
  await mount(<MenuCreationPanel />);
  await userEvent.type(screen.getByLabelText('Tên món'), 'Phở Hà Nội');
  await userEvent.type(screen.getByLabelText('Giá bán (VND)'), '25000.50');
  const button = screen.getByRole('button', { name: 'Lưu món ăn' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(read).toHaveBeenCalledExactlyOnceWith(9));
  expect(create).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('heading', { name: 'Thực đơn' })).toBeVisible();
});
it('ambiguous create reuses the same operation key on an explicit retry', async () => {
  vi.spyOn(publicApi, 'categories').mockResolvedValue([]);
  const create = vi
    .spyOn(restaurantApi, 'createDish')
    .mockRejectedValue(new ApiError(0, 'NETWORK'));
  await mount(<MenuCreationPanel />);
  await userEvent.type(screen.getByLabelText('Tên món'), 'Phở');
  await userEvent.type(screen.getByLabelText('Giá bán (VND)'), '25000');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu món ăn' }));
  expect(await screen.findByText(/Chưa hoàn tất lưu món/)).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Lưu món ăn' }));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  expect(create.mock.calls[0][1]).toBe(create.mock.calls[1][1]);
});
it.each([
  ['SVG', new File(['<svg/>'], 'fake.svg', { type: 'image/svg+xml' })],
  [
    'oversized',
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
  ],
  ['empty', new File([], 'empty.png', { type: 'image/png' })],
])('rejects %s uploads before posting data', async (_label, file) => {
  vi.spyOn(publicApi, 'categories').mockResolvedValue([]);
  const create = vi.spyOn(restaurantApi, 'createDish');
  await mount(<MenuCreationPanel />);
  fireEvent.change(screen.getByLabelText('Ảnh món ăn'), {
    target: { files: [file as File] },
  });
  expect(await screen.findByText('Chỉ nhận JPG, PNG hoặc WebP, tối đa 5 MB.')).toBeVisible();
  expect(create).not.toHaveBeenCalled();
});

it('edit description has a stable accessible label even when prefilled', async () => {
  vi.spyOn(publicApi, 'categories').mockResolvedValue(['Phở']);
  await mount(<MenuCreationPanel item={{ ...item, version: 1 }} />);
  expect(screen.getByLabelText('Mô tả', { exact: true })).toHaveValue('Nóng và thơm');
  await userEvent.clear(screen.getByLabelText('Mô tả', { exact: true }));
  await userEvent.type(screen.getByLabelText('Mô tả', { exact: true }), 'Mô tả mới');
  expect(screen.getByLabelText('Mô tả', { exact: true })).toHaveValue('Mô tả mới');
});

it.each([409, 0])(
  'keeps an ambiguous/stale edit draft and requires explicit rebase (%s)',
  async (status) => {
    vi.spyOn(publicApi, 'categories').mockResolvedValue(['Phở']);
    const update = vi
      .spyOn(restaurantApi, 'updateDish')
      .mockRejectedValue(new ApiError(status, status === 0 ? 'NETWORK' : '409'));
    vi.spyOn(restaurantApi, 'menuItem').mockResolvedValue({ ...item, price: 27000, version: 2 });
    await mount(<MenuCreationPanel item={{ ...item, version: 1 }} />);
    await userEvent.clear(screen.getByLabelText('Giá bán (VND)'));
    await userEvent.type(screen.getByLabelText('Giá bán (VND)'), '28000');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu món ăn' }));
    expect(await screen.findByText(/Dữ liệu máy chủ đã thay đổi hoặc chưa xác định/)).toBeVisible();
    expect(screen.getByLabelText('Giá bán (VND)')).toHaveValue('28000');
    expect(screen.getByRole('button', { name: 'Lưu món ăn' })).toBeDisabled();
    await userEvent.click(await screen.findByRole('button', { name: 'Dùng bản mới' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dùng bản mới' }));
    await waitFor(() => expect(screen.getByLabelText('Giá bán (VND)')).toHaveValue('27000'));
    expect(update).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Lưu món ăn' })).toBeEnabled();
  },
);
