import { it, expect, vi } from 'vitest';
import { createAdminApi } from './api';
import { createRestaurantSchema, createProfileSchema } from './model';
import { account } from '@/test/fixtures';
const value = {
  name: ' Bếp Hà Nội ',
  email: 'bep@test.example',
  phoneNumber: '0901234567',
  address: '12 Hà Nội',
  activity: 'true',
  licensePlate: '',
  password: 'valid-password-123',
  confirmPassword: 'valid-password-123',
};
it('validates restaurant inputs without adding administrative geography or changing Driver rules', () => {
  expect(createRestaurantSchema.parse(value).name).toBe('Bếp Hà Nội');
  for (const field of [
    'name',
    'email',
    'phoneNumber',
    'address',
    'password',
    'confirmPassword',
  ] as const)
    expect(createRestaurantSchema.safeParse({ ...value, [field]: '' }).success).toBe(false);
  for (const phoneNumber of ['letters', '++123', '123 456', '0123456789012345'])
    expect(createRestaurantSchema.safeParse({ ...value, phoneNumber }).success).toBe(false);
  expect(createRestaurantSchema.safeParse({ ...value, email: 'invalid' }).success).toBe(false);
  expect(
    createRestaurantSchema.safeParse({ ...value, password: 'short', confirmPassword: 'short' })
      .success,
  ).toBe(false);
  expect(
    createRestaurantSchema.safeParse({
      ...value,
      password: 'é'.repeat(37),
      confirmPassword: 'é'.repeat(37),
    }).success,
  ).toBe(false);
  expect(createProfileSchema.safeParse({ ...value, phoneNumber: 'legacy contact' }).success).toBe(
    true,
  );
});
it('exports all filtered results without sending pagination and preserves binary data', async () => {
  const blob = new Blob(['xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    request = vi.fn().mockResolvedValue(blob);
  const api = createAdminApi(request, () => account('ADMIN'));
  expect(
    await api.exportRestaurants({ q: 'Bếp', page: 7, size: 1, activity: 'open', sort: 'oldest' }),
  ).toBe(blob);
  const [url, options] = request.mock.calls[0];
  expect(url).toContain('activity=open');
  expect(url).not.toMatch(/page=|size=/);
  expect(options.responseType).toBe('blob');
});
it('never exports admin records for other roles or after identity change', async () => {
  const request = vi.fn();
  await expect(
    createAdminApi(request, () => account('CUSTOMER')).exportRestaurants(),
  ).rejects.toMatchObject({ status: 403 });
  expect(request).not.toHaveBeenCalled();
  let actor = account('ADMIN', 1);
  const delayed = vi.fn(async () => {
    actor = account('ADMIN', 2);
    return new Blob();
  });
  await expect(createAdminApi(delayed, () => actor).exportRestaurants()).rejects.toMatchObject({
    name: 'AbortError',
  });
});
it('rejects JSON/error payloads masquerading as spreadsheet downloads', async () => {
  await expect(
    createAdminApi(vi.fn().mockResolvedValue({ password: 'not a workbook' }), () =>
      account('ADMIN'),
    ).exportRestaurants(),
  ).rejects.toMatchObject({ code: 'CONTRACT' });
});
