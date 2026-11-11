import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { Session, type CookieLock } from './session';
import { account, gateway, immediateLock, tokens } from '@/test/fixtures';
import { ApiError, type Transport } from '@/lib/api/http';
const credentials = { email: 'user1@test.example', password: 'Fixture password' };
describe('session lifecycle and request safety', () => {
  it('restores then verifies account with me', async () => {
    const g = gateway();
    const s = new Session(g, immediateLock);
    await s.restore();
    expect(g.me).toHaveBeenCalledWith(tokens().accessToken);
    expect(s.getSnapshot().account).toEqual(account());
  });
  it('coalesces concurrent refresh within a tab', async () => {
    const g = gateway();
    const s = new Session(g, immediateLock);
    await Promise.all(Array.from({ length: 20 }, () => s.refresh()));
    expect(g.refresh).toHaveBeenCalledTimes(1);
  });
  it('distinguishes missing cookie from network failure', async () => {
    const g = gateway();
    g.refresh = vi.fn().mockRejectedValue(new ApiError(401, '401'));
    const s = new Session(g, immediateLock);
    await expect(s.restore()).rejects.toBeInstanceOf(ApiError);
    expect(s.getSnapshot().status).toBe('anonymous');
    g.refresh = vi.fn().mockRejectedValue(new ApiError(0, 'NETWORK'));
    await expect(s.restore()).rejects.toBeInstanceOf(ApiError);
    expect(s.getSnapshot().status).toBe('unavailable');
    expect(s.getSnapshot().account).toBeNull();
  });
  it('clears account-scoped Query cache only after acknowledged logout', async () => {
    const q = new QueryClient();
    const g = gateway();
    const s = new Session(g, immediateLock, () => q.clear());
    await s.login(credentials);
    q.setQueryData(['account', 1, 'private'], 'private fixture');
    g.logout = vi.fn().mockRejectedValue(new ApiError(0, 'NETWORK'));
    await expect(s.logout()).rejects.toBeInstanceOf(ApiError);
    expect(s.getSnapshot().status).toBe('authenticated');
    g.logout = vi.fn().mockResolvedValue(undefined);
    await s.logout();
    expect(q.getQueryData(['account', 1, 'private'])).toBeUndefined();
    expect(s.getSnapshot().accessToken).toBeNull();
  });
  it('clears identity after logout-all and password change', async () => {
    const g = gateway();
    const clear = vi.fn();
    const broadcast = vi.fn();
    const s = new Session(g, immediateLock, clear, broadcast);
    await s.login(credentials);
    await s.logout(true);
    expect(g.logout).toHaveBeenCalledWith(tokens().accessToken, true);
    expect(s.getSnapshot().account).toBeNull();
    await s.login(credentials);
    await s.changePassword({ currentPassword: 'Old fixture', newPassword: 'New long fixture' });
    expect(s.getSnapshot().status).toBe('anonymous');
    expect(broadcast).toHaveBeenCalledWith('signed-out');
  });
  it('retries a safe GET once after one shared refresh', async () => {
    const g = gateway();
    const s = new Session(g, immediateLock);
    await s.login(credentials);
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(401, '401'))
      .mockResolvedValue({ ok: true }) as unknown as Transport;
    expect(await s.request(transport, '/account')).toEqual({ ok: true });
    expect(transport).toHaveBeenCalledTimes(2);
    expect(g.refresh).toHaveBeenCalledTimes(1);
  });
  it('never automatically retries a mutation', async () => {
    const g = gateway();
    const s = new Session(g, immediateLock);
    await s.login(credentials);
    const transport = vi.fn().mockRejectedValue(new ApiError(401, '401')) as unknown as Transport;
    await expect(
      s.request(transport, '/orders', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({ code: 'REAUTH' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('does not loop if the retried GET is rejected', async () => {
    const g = gateway();
    const s = new Session(g, immediateLock);
    await s.login(credentials);
    const transport = vi.fn().mockRejectedValue(new ApiError(401, '401')) as unknown as Transport;
    await expect(s.request(transport, '/account')).rejects.toBeInstanceOf(ApiError);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(g.refresh).toHaveBeenCalledTimes(1);
  });
  it('serializes cookie operations across tabs using the shared lock', async () => {
    let active = 0,
      max = 0,
      tail: Promise<unknown> = Promise.resolve();
    const lock: CookieLock = (work) => {
      const result = tail.then(async () => {
        active++;
        max = Math.max(max, active);
        try {
          return await work();
        } finally {
          active--;
        }
      });
      tail = result.catch(() => {});
      return result;
    };
    const one = new Session(gateway(), lock),
      two = new Session(gateway(), lock);
    await Promise.all([one.restore(), two.restore()]);
    expect(max).toBe(1);
  });
  it('prevents an old private response from surviving an identity change', async () => {
    const s = new Session(gateway(), immediateLock);
    await s.login(credentials);
    let finish!: (value: unknown) => void;
    const transport = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    ) as unknown as Transport;
    const pending = s.request(transport, '/private');
    s.external('signed-out');
    finish({ private: 'old' });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(s.getSnapshot().account).toBeNull();
  });
  it('starts session restoration only once under StrictMode effects', async () => {
    const g = gateway();
    const s = new Session(g, immediateLock);
    s.start();
    s.start();
    await s.restore();
    expect(g.refresh).toHaveBeenCalledTimes(1);
  });
  it('does not accept an invalid role/profile shape', async () => {
    const { accountSchema } = await import('@/types/domain');
    expect(accountSchema.safeParse({ ...account('ADMIN'), customerId: 1 }).success).toBe(false);
  });
});

it('refreshes expired access before a protected auth mutation without replaying it', async () => {
  const g = gateway();
  const s = new Session(g, immediateLock);
  await s.login(credentials);
  g.me = vi.fn().mockRejectedValueOnce(new ApiError(401, '401')).mockResolvedValue(account());
  await s.changePassword({ currentPassword: 'old fixture', newPassword: 'new long fixture' });
  expect(g.refresh).toHaveBeenCalledTimes(1);
  expect(g.changePassword).toHaveBeenCalledTimes(1);
});
it('does not retry a wrong current password or a network-uncertain mutation', async () => {
  const g = gateway();
  const s = new Session(g, immediateLock);
  await s.login(credentials);
  g.changePassword = vi.fn().mockRejectedValue(new ApiError(401, '401'));
  await expect(
    s.changePassword({ currentPassword: 'wrong fixture', newPassword: 'new long fixture' }),
  ).rejects.toBeInstanceOf(ApiError);
  expect(g.changePassword).toHaveBeenCalledTimes(1);
  expect(g.refresh).not.toHaveBeenCalled();
});

it('does not clear a newer account when an older retried GET returns 401', async () => {
  const g = gateway();
  const s = new Session(g, immediateLock);
  await s.login(credentials);
  let rejectRetry!: (reason: unknown) => void;
  const retried = vi.fn();
  const transport = vi
    .fn()
    .mockRejectedValueOnce(new ApiError(401, '401'))
    .mockImplementationOnce(() => {
      retried();
      return new Promise((_, reject) => {
        rejectRetry = reject;
      });
    }) as unknown as Transport;
  const request = s.request(transport, '/private');
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(retried).toHaveBeenCalledOnce());
  g.me = vi.fn().mockResolvedValue({ ...account(), accountId: 2, customerId: 2 });
  await s.login({ ...credentials, email: 'user2@test.example' });
  const current = s.getSnapshot();
  rejectRetry(new ApiError(401, '401'));
  await rejected;
  expect(s.getSnapshot()).toBe(current);
  expect(s.getSnapshot().account?.accountId).toBe(2);
  expect(transport).toHaveBeenCalledTimes(2);
});

it('does not invalidate the current session for an aborted retried GET', async () => {
  const g = gateway();
  const s = new Session(g, immediateLock);
  await s.login(credentials);
  const abort = new AbortController();
  let rejectRetry!: (reason: unknown) => void;
  const retried = vi.fn();
  const transport = vi
    .fn()
    .mockRejectedValueOnce(new ApiError(401, '401'))
    .mockImplementationOnce(() => {
      retried();
      return new Promise((_, reject) => {
        rejectRetry = reject;
      });
    }) as unknown as Transport;
  const request = s.request(transport, '/private', { signal: abort.signal });
  const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(retried).toHaveBeenCalledOnce());
  const current = s.getSnapshot();
  abort.abort();
  rejectRetry(new ApiError(401, '401'));
  await rejected;
  expect(s.getSnapshot()).toBe(current);
  expect(transport).toHaveBeenCalledTimes(2);
});
