import { it, expect } from 'vitest';
import { ApiError } from '@/lib/api/http';
import { cartFixture } from '@/features/cart/testFixtures';
import {
  cartFingerprint,
  checkoutSchema,
  isDefiniteCheckoutRejection,
  matchingCheckoutOrders,
} from './model';
import { attemptFixture, codFixture, orderFixture } from './testFixtures';

it('checkout validates and trims per-order address, preserves backend method ID', () => {
  expect(
    checkoutSchema.parse({
      deliveryAddress: '  Hà Nội  ',
      paymentMethodId: codFixture.paymentMethodId,
    }),
  ).toEqual({ deliveryAddress: 'Hà Nội', paymentMethodId: 61 });
});
it.each(['', '   ', 'a'.repeat(256)])(
  'rejects missing or too long checkout address',
  (deliveryAddress) => {
    expect(checkoutSchema.safeParse({ deliveryAddress, paymentMethodId: 61 }).success).toBe(false);
  },
);
it.each([0, -1, 1.5, null])('rejects invalid backend payment ID %s', (paymentMethodId) => {
  expect(checkoutSchema.safeParse({ deliveryAddress: 'Hà Nội', paymentMethodId }).success).toBe(
    false,
  );
});
it('cart fingerprint detects a server price or quantity change and ignores array order', () => {
  expect(cartFingerprint(cartFixture)).not.toBe(
    cartFingerprint({ ...cartFixture, totalAmount: 36000 }),
  );
  expect(cartFingerprint(cartFixture)).not.toBe(
    cartFingerprint({ ...cartFixture, cartItems: [{ ...cartFixture.cartItems[0], quantity: 2 }] }),
  );
  expect(cartFingerprint(cartFixture)).toBe(cartFingerprint(structuredClone(cartFixture)));
});
it('reconciles only new, owned, exactly matching server order snapshots', () => {
  expect(matchingCheckoutOrders(attemptFixture, [orderFixture])).toEqual([orderFixture]);
  expect(matchingCheckoutOrders({ ...attemptFixture, baselineIds: [71] }, [orderFixture])).toEqual(
    [],
  );
  expect(
    matchingCheckoutOrders(attemptFixture, [
      { ...orderFixture, customer: { customerId: 99, name: 'Other' } },
    ]),
  ).toEqual([]);
  expect(
    matchingCheckoutOrders(attemptFixture, [{ ...orderFixture, deliveryAddress: 'Other address' }]),
  ).toEqual([]);
  expect(matchingCheckoutOrders(attemptFixture, [{ ...orderFixture, totalAmount: 1 }])).toEqual([]);
  expect(
    matchingCheckoutOrders(attemptFixture, [
      { ...orderFixture, orderDetails: [{ ...orderFixture.orderDetails[0], quantity: 2 }] },
    ]),
  ).toEqual([]);
});
it('distinguishes definite API rejection from timeout/network/unknown server outcomes', () => {
  expect(isDefiniteCheckoutRejection(new ApiError(409, '409'))).toBe(true);
  for (const error of [
    new ApiError(0, 'TIMEOUT'),
    new ApiError(0, 'NETWORK'),
    new ApiError(408, '408'),
    new ApiError(500, '500'),
    new ApiError(502, 'CONTRACT'),
  ])
    expect(isDefiniteCheckoutRejection(error)).toBe(false);
});
