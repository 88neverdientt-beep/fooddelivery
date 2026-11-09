import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '@/lib/api/http';
import { account } from '@/test/fixtures';
import { cartSchema, cartQueryKey, createCartApi, MAX_CART_QUANTITY, quantitySchema } from './api';
import { cartFixture, emptyCartFixture } from './testFixtures';

describe('cart contract and validation', () => {
  it.each([0, -1, 1.5, NaN, Infinity, '', '  ', MAX_CART_QUANTITY + 1])(
    'rejects invalid quantity %s',
    (input) => {
      expect(quantitySchema.safeParse(input).success).toBe(false);
    },
  );
  it('accepts positive integers through backend Integer limit', () => {
    expect(quantitySchema.parse('2')).toBe(2);
    expect(quantitySchema.parse(MAX_CART_QUANTITY)).toBe(MAX_CART_QUANTITY);
  });
  it('accepts empty/null restaurant and server totals without client recalculation', () => {
    expect(cartSchema.parse(emptyCartFixture).restaurant).toBeNull();
    expect(cartSchema.parse({ ...cartFixture, totalAmount: 98765 }).totalAmount).toBe(98765);
  });
  it('scopes cart keys by authenticated account and profile', () => {
    expect(cartQueryKey(1, 7)).not.toEqual(cartQueryKey(2, 7));
    expect(cartQueryKey(1, 7)).not.toEqual(cartQueryKey(1, 8));
  });
});
it('loads cart through the current verified Customer identity', async () => {
  const request = vi.fn().mockResolvedValue(cartFixture);
  const client = createCartApi(request, () => account('CUSTOMER', 7));
  expect((await client.read()).totalAmount).toBe(35000);
  expect(request).toHaveBeenCalledWith('/cart/7', { signal: undefined });
});
it('never accepts customer/price/total fields from an add payload', async () => {
  const request = vi.fn().mockResolvedValue(cartFixture.cartItems[0]);
  const client = createCartApi(request, () => account('CUSTOMER', 7));
  const input = {
    restaurantFoodItemId: 41,
    quantity: 2,
    customerId: 999,
    unitPrice: 1,
    totalAmount: 1,
  };
  await client.add(input);
  expect(request).toHaveBeenCalledExactlyOnceWith('/7/cart-items', {
    method: 'POST',
    body: { restaurantFoodItemId: 41, quantity: 2 },
  });
});
it('updates and removes exact item routes with no copied profile ID', async () => {
  const request = vi.fn().mockResolvedValue(cartFixture.cartItems[0]);
  const client = createCartApi(request, () => account());
  await client.update(31, 3);
  await client.remove(31);
  expect(request).toHaveBeenNthCalledWith(1, '/cart-items/31', {
    method: 'PUT',
    body: { quantity: 3 },
  });
  expect(request).toHaveBeenNthCalledWith(2, '/cart-items/31', { method: 'DELETE' });
});
it('rejects anonymous or wrong-role identities before any request', async () => {
  const request = vi.fn();
  await expect(createCartApi(request, () => null).read()).rejects.toMatchObject({ status: 403 });
  await expect(
    createCartApi(request, () => account('ADMIN')).add({ restaurantFoodItemId: 41, quantity: 1 }),
  ).rejects.toMatchObject({ status: 403 });
  expect(request).not.toHaveBeenCalled();
});
it('preserves API errors, performs no retry, and rejects malformed responses', async () => {
  const request = vi.fn().mockRejectedValue(new ApiError(409, '409'));
  const client = createCartApi(request, () => account());
  await expect(client.update(31, 3)).rejects.toMatchObject({ status: 409 });
  expect(request).toHaveBeenCalledTimes(1);
  request.mockResolvedValue({ cartItems: [] });
  await expect(client.read()).rejects.toMatchObject({ code: 'CONTRACT' });
});
