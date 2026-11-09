import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { restaurantFilters, apiQuery, validId } from './model';
import { createPublicApi } from './api';
import { RestaurantCard } from './PublicPages';
import type { Transport } from '@/lib/api/http';

it('sends server filters, bounded page and allowlisted sort instead of filtering an unbounded client list', () => {
  expect(restaurantFilters(new URLSearchParams('q=Pho&status=open&page=3&sort=name-desc'))).toEqual(
    { q: 'Pho', active: true, page: 2, size: 12, sort: 'name-desc' },
  );
  expect(restaurantFilters(new URLSearchParams('status=closed')).active).toBe(false);
});
it('normalizes malicious sort/page input and limits query length to the server contract', () => {
  const result = restaurantFilters(
    new URLSearchParams({ q: 'q'.repeat(110), page: 'Infinity', sort: 'password' }),
  );
  expect(result.q).toHaveLength(100);
  expect(result.page).toBe(0);
  expect(result.sort).toBe('name');
});
it.each(['0', '-1', '2.5', '10002', 'NaN'])('normalizes invalid displayed page %s', (page) => {
  expect(restaurantFilters(new URLSearchParams({ page })).page).toBe(0);
});
it('encodes search literals, false boolean and zero page without dropping meaningful values', () => {
  const values = new URLSearchParams(
    apiQuery({ q: 'A%_ & Hà Nội', active: false, page: 0, category: '', other: undefined }),
  );
  expect(values.get('q')).toBe('A%_ & Hà Nội');
  expect(values.get('active')).toBe('false');
  expect(values.get('page')).toBe('0');
  expect(values.has('other')).toBe(false);
});
it('rejects unsafe, malformed and fractional resource IDs', () => {
  for (const id of ['0', '-1', '1.2', '9007199254740992', '../1']) expect(validId(id)).toBe(false);
  expect(validId('123')).toBe(true);
});
it('loads bounded restaurant/menu/category pages and preserves the actual metadata', async () => {
  const request = vi
    .fn<Transport>()
    .mockResolvedValue({ items: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
  const api = createPublicApi(request);
  expect((await api.restaurantPage({ q: 'A&B' })).totalElements).toBe(0);
  expect(request.mock.calls[0][0]).toBe('/restaurants/search?page=0&size=12&q=A%26B');
  await api.menuPage('12', { available: false, sort: 'price-desc' });
  expect(request.mock.calls[1][0]).toBe(
    '/restaurants/12/menu?page=0&size=12&available=false&sort=price-desc',
  );
  await api.categories();
  expect(request.mock.calls[2][0]).toBe('/food-categories?page=0&size=12');
});
it('fails closed for malformed server page envelopes', async () => {
  const request = vi
    .fn<Transport>()
    .mockResolvedValue({ items: [], page: 0, size: 100000, totalElements: 0, totalPages: 0 });
  await expect(createPublicApi(request).restaurantPage()).rejects.toMatchObject({
    code: 'CONTRACT',
  });
});
it('restaurant card exposes real public name/address/status and labels imagery without inventing ratings', () => {
  render(
    <MemoryRouter>
      <RestaurantCard
        restaurant={{
          restaurantId: 12,
          name: 'Quán thật',
          address: 'Địa chỉ từ API',
          restaurantStatus: false,
        }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Quán thật' })).toBeVisible();
  expect(screen.getByText('Địa chỉ từ API')).toBeVisible();
  expect(screen.getByText('Đang nghỉ')).toBeVisible();
  expect(screen.getByText('Ảnh minh họa')).toBeVisible();
  expect(screen.getByRole('link')).toHaveAttribute('href', '/restaurants/12');
  expect(screen.queryByText(/\d\.\d\s*sao/)).not.toBeInTheDocument();
});
