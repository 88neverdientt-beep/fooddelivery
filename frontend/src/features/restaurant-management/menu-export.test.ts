import { it, expect, vi } from 'vitest';
import { createRestaurantApi } from './api';
import { priceInput } from './model';
import { account } from '@/test/fixtures';
const item = {
  restaurantFoodItemId: 9,
  price: 25000.5,
  isAvailable: true,
  restaurant: { restaurantId: 1, name: 'Bếp', address: 'Hà Nội' },
  foodItem: { itemId: 7, name: 'Phở', category: 'Phở', description: 'Nóng' },
};
it('accepts the DECIMAL12,2 boundary and rejects missing, rounded, exponent and out-of-domain price', () => {
  expect(priceInput.parse('9999999999.99')).toBe('9999999999.99');
  for (const value of ['', '0', '-1', '1e3', '25,000', '10000000000.00', '0.001'])
    expect(priceInput.safeParse(value).success).toBe(false);
});
it('exports only current Restaurant filter semantics without pagination or forged IDs', async () => {
  const blob = new Blob(['test'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    request = vi.fn().mockResolvedValue(blob);
  expect(
    await createRestaurantApi(request, () => account('RESTAURANT')).exportMenu({
      q: 'Phở',
      available: false,
      sort: 'price-desc',
      category: 'Phở',
      page: 2,
      size: 1,
      restaurantId: 999,
    }),
  ).toBe(blob);
  const [url, options] = request.mock.calls[0];
  expect(url).toContain('available=false');
  expect(url).toContain('sort=price-desc');
  expect(url).not.toMatch(/page=|size=|restaurantId=/);
  expect(options.responseType).toBe('blob');
});
it('forbids other roles and rejects a different catalog ID during reconciliation', async () => {
  const request = vi.fn().mockResolvedValue(item);
  for (const role of ['ADMIN', 'CUSTOMER', 'DRIVER'] as const)
    await expect(
      createRestaurantApi(request, () => account(role)).exportMenu(),
    ).rejects.toMatchObject({ status: 403 });
  expect(request).not.toHaveBeenCalled();
  await expect(
    createRestaurantApi(request, () => account('RESTAURANT')).ownByFood(8),
  ).rejects.toMatchObject({ code: 'CONTRACT' });
});
it('reconciles through the own-scoped endpoint and validates response ownership', async () => {
  const request = vi.fn().mockResolvedValue(item);
  expect(await createRestaurantApi(request, () => account('RESTAURANT')).ownByFood(7)).toEqual(
    item,
  );
  expect(request).toHaveBeenCalledWith('/restaurant-management/menu/by-food/7', {
    signal: undefined,
  });
  await expect(
    createRestaurantApi(request, () => account('RESTAURANT', 2)).ownByFood(7),
  ).rejects.toMatchObject({ status: 404 });
});
it('rejects a binary download returned after the Restaurant changed', async () => {
  let actor = account('RESTAURANT');
  const request = vi.fn(async () => {
    actor = account('RESTAURANT', 2);
    return new Blob();
  });
  await expect(createRestaurantApi(request, () => actor).exportMenu()).rejects.toMatchObject({
    name: 'AbortError',
  });
});
