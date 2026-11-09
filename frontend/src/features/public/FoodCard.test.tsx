import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MenuItem } from '@/types/domain';
import { FoodCard } from './FoodCard';

const item: MenuItem = {
  restaurantFoodItemId: 41,
  price: 45000,
  isAvailable: true,
  restaurant: { restaurantId: 21, name: 'Quán API', address: 'Hà Nội' },
  foodItem: {
    itemId: 51,
    name: 'Phở từ API',
    category: 'Phở',
    description: 'Nước dùng được nhà hàng mô tả.',
  },
};
it('FoodCard presents API name/price/availability with an exact detail link', () => {
  render(
    <MemoryRouter>
      <FoodCard item={item} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Phở từ API' })).toBeVisible();
  expect(screen.getByText(/45\.000/)).toBeVisible();
  expect(screen.getByText('Còn bán')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Xem món Phở từ API' })).toHaveAttribute(
    'href',
    '/restaurants/21/food/41',
  );
  expect(screen.getByText('Ảnh minh họa')).toBeVisible();
});
it('FoodCard displays actual unavailable state and safely escapes user text', () => {
  const payload = '<img src=x onerror=alert(1)>';
  const view = render(
    <MemoryRouter>
      <FoodCard
        item={{ ...item, isAvailable: false, foodItem: { ...item.foodItem, description: payload } }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText('Tạm hết')).toBeVisible();
  expect(screen.getByText(payload)).toBeInTheDocument();
  expect(view.container.querySelector('img[onerror]')).toBeNull();
});
