import { it, expect, vi } from 'vitest';
import { createCheckoutApi } from './api';
import { codFixture, orderFixture } from './testFixtures';

it('discovers supported COD methods from server rather than guessing a database ID', async () => {
  const request = vi
    .fn()
    .mockResolvedValue([
      codFixture,
      { paymentMethodId: 99, paymentMethodCode: 'ONLINE', paymentMethodName: 'Not integrated' },
    ]);
  const api = createCheckoutApi(request, () => 1);
  expect(await api.paymentMethods()).toEqual([codFixture]);
  expect(request).toHaveBeenCalledExactlyOnceWith('/payment-methods', { signal: undefined });
});
it('checkout sends exactly address and payment ID, no customer/price/total payload', async () => {
  const request = vi.fn().mockResolvedValue(orderFixture);
  const api = createCheckoutApi(request, () => 1);
  const input = {
    deliveryAddress: ' Hà Nội ',
    paymentMethodId: 61,
    customerId: 999,
    accountId: 999,
    totalAmount: 1,
  };
  expect((await api.create(input)).orderId).toBe(71);
  expect(request).toHaveBeenCalledExactlyOnceWith('/customers/1/orders', {
    method: 'POST',
    body: { deliveryAddress: 'Hà Nội', paymentMethodId: 61 },
  });
});
it('blocks a missing customer identity and rejects a response owned by another profile', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ...orderFixture, customer: { customerId: 99, name: 'Other' } });
  await expect(
    createCheckoutApi(request, () => null).create({
      deliveryAddress: 'Hà Nội',
      paymentMethodId: 61,
    }),
  ).rejects.toMatchObject({ status: 403 });
  expect(request).not.toHaveBeenCalled();
  await expect(
    createCheckoutApi(request, () => 1).create({ deliveryAddress: 'Hà Nội', paymentMethodId: 61 }),
  ).rejects.toMatchObject({ code: 'CONTRACT' });
  expect(request).toHaveBeenCalledTimes(1);
});
