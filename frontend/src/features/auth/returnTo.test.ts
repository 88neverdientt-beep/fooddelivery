import { it, expect } from 'vitest';
import { customerReturnTo } from './returnTo';
it.each([
  '/restaurants/12/food/34',
  '/restaurants/12',
  '/customer/checkout',
  '/customer/orders/15',
  '/customer/cart',
])('allows a known customer return path %s', (value) =>
  expect(customerReturnTo(value)).toBe(value),
);
it.each([
  '//evil.test',
  'https://evil.test',
  '/admin/accounts',
  '/driver/dashboard',
  '/restaurants/0',
  '/restaurants/9007199254740992',
  '/customer/orders/../../admin',
  '/customer/cart?redirect=//evil.test',
  null,
  { role: 'ADMIN' },
])('refuses arbitrary or privileged return destinations', (value) =>
  expect(customerReturnTo(value)).toBeNull(),
);
