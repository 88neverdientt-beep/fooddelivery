import { it, expect, vi } from 'vitest';
import { createRestaurantApi } from '@/features/restaurant-management/api';
import { createAdminApi } from '@/features/admin-management/api';
import { account } from '@/test/fixtures';
const blob = () =>
  new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
it('Restaurant export preserves active order filters across every page and strips forged scope', async () => {
  const request = vi.fn().mockResolvedValue(blob());
  await createRestaurantApi(request, () => account('RESTAURANT')).exportOrders({
    q: 'Phở',
    status: 'PENDING',
    from: '2026-11-01',
    to: '2026-11-12',
    sort: 'total-desc',
    page: 3,
    size: 1,
    restaurantId: 99,
  });
  const [url, options] = request.mock.calls[0];
  expect(url).toContain('/restaurant-management/orders/export.xlsx?');
  expect(url).toContain('sort=total-desc');
  expect(url).toContain('from=2026-11-01');
  expect(url).toContain('status=PENDING');
  expect(url).not.toMatch(/page=|size=|restaurantId=/);
  expect(options.responseType).toBe('blob');
});
it('Admin export preserves permitted administrative filters but never pagination', async () => {
  const request = vi.fn().mockResolvedValue(blob());
  await createAdminApi(request, () => account('ADMIN')).exportOrders({
    customerId: '2',
    restaurantId: '3',
    paymentStatus: 'SUCCESS',
    page: '9',
    size: '1',
  });
  expect(request.mock.calls[0][0]).toContain('customerId=2');
  expect(request.mock.calls[0][0]).toContain('restaurantId=3');
  expect(request.mock.calls[0][0]).toContain('paymentStatus=SUCCESS');
  expect(request.mock.calls[0][0]).not.toMatch(/page=|size=/);
});
it('forbids CUSTOMER and DRIVER before any export network call', async () => {
  const request = vi.fn();
  for (const role of ['CUSTOMER', 'DRIVER'] as const) {
    await expect(
      createRestaurantApi(request, () => account(role)).exportOrders(),
    ).rejects.toMatchObject({ status: 403 });
    await expect(createAdminApi(request, () => account(role)).exportOrders()).rejects.toMatchObject(
      { status: 403 },
    );
  }
  expect(request).not.toHaveBeenCalled();
});
it('rejects invalid binary contract and discards download after identity changes', async () => {
  await expect(
    createAdminApi(vi.fn().mockResolvedValue({}), () => account('ADMIN')).exportOrders(),
  ).rejects.toMatchObject({ code: 'CONTRACT' });
  let a = account('RESTAURANT');
  const request = vi.fn(async () => {
    a = account('RESTAURANT', 2);
    return blob();
  });
  await expect(createRestaurantApi(request, () => a).exportOrders()).rejects.toMatchObject({
    name: 'AbortError',
  });
});
