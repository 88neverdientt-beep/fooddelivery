import { beforeEach, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { attemptFixture, orderFixture } from './testFixtures';
import {
  rememberPending,
  restorePending,
  restoredMatches,
  forgetPending,
  pendingStorageKey,
} from './pending';
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});
it('persists only hashed matching metadata, scopes account/customer and reconciles exactly', async () => {
  await rememberPending(1, attemptFixture);
  const raw = sessionStorage.getItem(pendingStorageKey(1))!;
  expect(raw).not.toContain(attemptFixture.address);
  expect(raw).not.toContain('cart');
  expect(raw).not.toContain('token');
  expect(raw).not.toContain('password');
  const m = restorePending(1, attemptFixture.customerId)!;
  expect('signature' in m).toBe(true);
  if (!('signature' in m)) throw new Error('Missing marker');
  expect(await restoredMatches(m, [orderFixture])).toEqual([orderFixture]);
  expect(await restoredMatches(m, [{ ...orderFixture, deliveryAddress: 'Other' }])).toEqual([]);
  expect(restorePending(2, attemptFixture.customerId)).toBeNull();
  expect(restorePending(1, 999)).toEqual({ kind: 'unavailable', customerId: 999 });
  forgetPending(1);
  expect(restorePending(1, attemptFixture.customerId)).toBeNull();
});
it('fails closed on corrupted or unreadable marker', () => {
  sessionStorage.setItem(pendingStorageKey(1), 'broken');
  expect(restorePending(1, 2)?.kind).toBe('unavailable');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error();
  });
  expect(restorePending(1, 2)?.kind).toBe('unavailable');
});
it('rejects old baseline matches and preserves ambiguity instead of choosing an order', async () => {
  await rememberPending(1, { ...attemptFixture, baselineIds: [71] });
  let m = restorePending(1, attemptFixture.customerId)!;
  if (!('signature' in m)) throw new Error();
  expect(await restoredMatches(m, [orderFixture])).toEqual([]);
  await rememberPending(1, attemptFixture);
  m = restorePending(1, attemptFixture.customerId)!;
  if (!('signature' in m)) throw new Error();
  expect(await restoredMatches(m, [orderFixture, { ...orderFixture, orderId: 72 }])).toHaveLength(
    2,
  );
});
