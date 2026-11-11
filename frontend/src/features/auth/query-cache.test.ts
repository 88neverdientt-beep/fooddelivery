import { QueryClient } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { gateway, immediateLock } from '@/test/fixtures';
import { ApiError } from '@/lib/api/http';
import { Session } from './session';
import { clearIdentityCaches } from './query-cache';

const clients: QueryClient[] = [];
function client() {
  const value = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  clients.push(value);
  return value;
}
function pending(q: QueryClient, key: readonly unknown[]) {
  let signal: AbortSignal | undefined;
  let resolve: (value: string[]) => void = () => {};
  const data = new Promise<string[]>((done) => {
    resolve = done;
  });
  const work = q
    .fetchQuery({
      queryKey: key,
      queryFn: (context) => {
        signal = context.signal;
        return data;
      },
    })
    .catch(() => undefined);
  return { work, resolve, aborted: () => signal?.aborted };
}
afterEach(() => {
  for (const q of clients.splice(0)) q.clear();
});

it('anonymous restoration keeps the in-flight public restaurant request alive', async () => {
  const q = client(),
    key = ['public', 'restaurants'] as const,
    request = pending(q, key),
    g = gateway();
  q.setQueryData(['customer', 1, 'orders'], ['old private data']);
  g.refresh = vi.fn().mockRejectedValue(new ApiError(401, '401'));
  const session = new Session(g, immediateLock, () => clearIdentityCaches(q));
  await expect(session.restore()).rejects.toBeInstanceOf(ApiError);
  expect(session.getSnapshot().status).toBe('anonymous');
  expect(request.aborted()).toBe(false);
  request.resolve(['Visible restaurant']);
  await request.work;
  expect(q.getQueryData(key)).toEqual(['Visible restaurant']);
  expect(q.getQueryData(['customer', 1, 'orders'])).toBeUndefined();
});

it('authenticated restoration also preserves public loading and cached public ratings', async () => {
  const q = client(),
    key = ['public', 'food-categories'] as const,
    request = pending(q, key);
  q.setQueryData(['public', 'ratings', 7], ['Public review']);
  q.setQueryData(['driver', 2, 'deliveries'], ['Old private trip']);
  const session = new Session(gateway(), immediateLock, () => clearIdentityCaches(q));
  await session.restore();
  expect(session.getSnapshot().status).toBe('authenticated');
  expect(request.aborted()).toBe(false);
  request.resolve(['Pho']);
  await request.work;
  expect(q.getQueryData(key)).toEqual(['Pho']);
  expect(q.getQueryData(['public', 'ratings', 7])).toEqual(['Public review']);
  expect(q.getQueryData(['driver', 2, 'deliveries'])).toBeUndefined();
});

it('logout cancels private requests and mutations, rejects unknown namespaces and ignores late private data', async () => {
  const q = client(),
    session = new Session(gateway(), immediateLock, () => clearIdentityCaches(q));
  await session.restore();
  const key = ['customer', 1, 'orders'] as const,
    request = pending(q, key);
  q.setQueryData(['public', 'restaurant-menu', 7], ['Public dish']);
  q.setQueryData(['public', 'unknown-sensitive-key'], ['Must not survive']);
  q.setQueryData(['unknown'], ['Must not survive']);
  q.getMutationCache().build(q, { mutationFn: async () => null });
  await session.logout();
  expect(request.aborted()).toBe(true);
  expect(q.getQueryData(key)).toBeUndefined();
  expect(q.getQueryData(['public', 'unknown-sensitive-key'])).toBeUndefined();
  expect(q.getQueryData(['unknown'])).toBeUndefined();
  expect(q.getMutationCache().getAll()).toHaveLength(0);
  expect(q.getQueryData(['public', 'restaurant-menu', 7])).toEqual(['Public dish']);
  request.resolve(['Late private order']);
  await request.work;
  expect(q.getQueryData(key)).toBeUndefined();
});
