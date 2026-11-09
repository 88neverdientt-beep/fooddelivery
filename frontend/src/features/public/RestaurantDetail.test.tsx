import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MenuItem } from '@/types/domain';
import { ApiError } from '@/lib/api/http';
import { RestaurantDetailPage } from './RestaurantDetail';
import { publicApi } from './api';

vi.mock('@/features/ratings/RatingPages', () => ({
  RestaurantRatings: ({ restaurantId }: { restaurantId: number }) => (
    <section id="restaurant-ratings">Đánh giá API cho {restaurantId}</section>
  ),
}));
const restaurant = {
  restaurantId: 21,
  name: 'Quán từ API',
  address: 'Hà Nội',
  restaurantStatus: true,
};
const item: MenuItem = {
  restaurantFoodItemId: 41,
  price: 45000,
  isAvailable: true,
  restaurant,
  foodItem: { itemId: 51, name: 'Phở từ API', category: 'Phở', description: 'Nước dùng từ API' },
};
function Location() {
  const value = useLocation();
  return <output data-testid="location">{value.pathname + value.search}</output>;
}
function setup(path = '/restaurants/21', initialError = false) {
  const info = vi.spyOn(publicApi, 'restaurant').mockResolvedValue(restaurant);
  const menu = vi
    .spyOn(publicApi, 'menuPage')
    .mockResolvedValue({ items: [item], page: 0, size: 12, totalElements: 1, totalPages: 1 });
  if (initialError) menu.mockRejectedValueOnce(new ApiError(0, 'NETWORK'));
  vi.spyOn(publicApi, 'categories').mockResolvedValue(['Phở', 'Cơm']);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <Location />
        <Routes>
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { info, menu };
}
it('RestaurantDetail loads bounded real menu data and no longer shows a future-ordering shell', async () => {
  const { menu } = setup();
  expect(await screen.findByRole('heading', { name: 'Quán từ API' })).toBeVisible();
  expect(await screen.findByRole('heading', { name: 'Phở từ API' })).toBeVisible();
  expect(menu).toHaveBeenCalledWith(
    '21',
    expect.objectContaining({ page: 0, size: 12, sort: 'name' }),
    expect.any(AbortSignal),
  );
  expect(screen.getByRole('link', { name: 'Xem món Phở từ API' })).toHaveAttribute(
    'href',
    '/restaurants/21/food/41',
  );
  expect(screen.queryByText(/sẵn sàng ở Giai đoạn 4/)).not.toBeInTheDocument();
});
it('RestaurantDetail sends search/category/sort/status to server and preserves review context', async () => {
  const { menu } = setup('/restaurants/21?reviewOrder=71#restaurant-ratings');
  await screen.findByRole('heading', { name: 'Phở từ API' });
  await userEvent.type(screen.getByLabelText('Tìm món trong thực đơn'), 'Nước');
  await userEvent.type(screen.getByLabelText('Danh mục món'), 'Phở');
  await userEvent.click(screen.getByRole('button', { name: 'Tìm món' }));
  await waitFor(() =>
    expect(menu).toHaveBeenLastCalledWith(
      '21',
      expect.objectContaining({ q: 'Nước', category: 'Phở', page: 0 }),
      expect.any(AbortSignal),
    ),
  );
  expect(screen.getByTestId('location')).toHaveTextContent('reviewOrder=71');
  await userEvent.selectOptions(screen.getByLabelText('Sắp xếp món'), 'price-asc');
  await waitFor(() =>
    expect(menu).toHaveBeenLastCalledWith(
      '21',
      expect.objectContaining({ sort: 'price-asc' }),
      expect.any(AbortSignal),
    ),
  );
  await userEvent.click(screen.getByRole('tab', { name: 'Đang có bán' }));
  await waitFor(() =>
    expect(menu).toHaveBeenLastCalledWith(
      '21',
      expect.objectContaining({ available: true }),
      expect.any(AbortSignal),
    ),
  );
});
it('RestaurantDetail handles menu error with explicit retry', async () => {
  const { menu } = setup('/restaurants/21', true);
  await userEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('heading', { name: 'Phở từ API' })).toBeVisible();
  expect(menu).toHaveBeenCalledTimes(2);
});
it('RestaurantDetail rejects unsafe IDs before querying any API', async () => {
  const { info, menu } = setup('/restaurants/9007199254740992');
  expect(await screen.findByRole('heading', { name: 'Không tìm thấy thông tin' })).toBeVisible();
  expect(info).not.toHaveBeenCalled();
  expect(menu).not.toHaveBeenCalled();
});
