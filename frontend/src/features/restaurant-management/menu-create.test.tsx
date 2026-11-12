import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
it('requires a catalog selection and shows selected catalog fields read-only', async () => {
  vi.spyOn(restaurantApi, 'catalog').mockResolvedValue({
    items: [food],
    page: 0,
    size: 12,
    totalElements: 1,
    totalPages: 1,
  });
  const add = vi.spyOn(restaurantApi, 'add');
  await mount(<RestaurantMenuEditor />);
  expect(
    await screen.findByText('Chọn một món từ catalog để nhập giá bán và trạng thái.'),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Thêm món vào thực đơn' })).not.toBeInTheDocument();
  await userEvent.click(await screen.findByRole('button', { name: 'Chọn Phở Hà Nội' }));
  expect(screen.getByText('Danh mục: Phở')).toBeVisible();
  expect(screen.getByText('Mô tả: Nóng và thơm')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Thêm món vào thực đơn' }));
  expect(await screen.findByText('Nhập giá bán.')).toBeVisible();
  expect(add).not.toHaveBeenCalled();
});
it('lost POST result reconciles the exact food ID and stays locked without announcing a fake create', async () => {
  const add = vi.spyOn(restaurantApi, 'add').mockRejectedValue(new ApiError(0, 'NETWORK')),
    lookup = vi.spyOn(restaurantApi, 'ownByFood').mockResolvedValue(item),
    uncertain = vi.fn();
  await mount(<MenuCreationPanel food={food} onUncertain={uncertain} />);
  await userEvent.type(screen.getByLabelText('Giá bán (VND)'), '25000.50');
  const button = screen.getByRole('button', { name: 'Thêm món vào thực đơn' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(await screen.findByRole('link', { name: 'Mở món đã xác minh' })).toHaveAttribute(
    'href',
    '/restaurant/menu/9/edit',
  );
  expect(button).toBeDisabled();
  expect(add).toHaveBeenCalledTimes(1);
  expect(lookup).toHaveBeenCalledWith(7);
  expect(uncertain).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Đã lưu món #/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết quả thêm món' }));
  expect(add).toHaveBeenCalledTimes(1);
});
it('a missing lookup does not unlock an ambiguous create or replay POST', async () => {
  const add = vi.spyOn(restaurantApi, 'add').mockRejectedValue(new ApiError(0, 'TIMEOUT'));
  vi.spyOn(restaurantApi, 'ownByFood').mockRejectedValue(new ApiError(404, '404'));
  await mount(<MenuCreationPanel food={food} onUncertain={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('Giá bán (VND)'), '25000.50');
  await userEvent.click(screen.getByRole('button', { name: 'Thêm món vào thực đơn' }));
  expect(await screen.findByText(/Chưa xác định được món đã lưu/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Thêm món vào thực đơn' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết quả thêm món' }));
  expect(add).toHaveBeenCalledTimes(1);
});
it('successful create reads the persisted ID before showing stored price and serializes double clicks', async () => {
  const add = vi.spyOn(restaurantApi, 'add').mockResolvedValue(item),
    read = vi.spyOn(restaurantApi, 'menuItem').mockResolvedValue({ ...item, price: 26000.75 });
  await mount(<MenuCreationPanel food={food} onUncertain={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('Giá bán (VND)'), '25000.50');
  const button = screen.getByRole('button', { name: 'Thêm món vào thực đơn' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(screen.getByLabelText('Giá bán (VND)')).toHaveValue('26000.75'));
  expect(read).toHaveBeenCalledExactlyOnceWith(9);
  expect(add).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
});
