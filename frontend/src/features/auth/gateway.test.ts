import { it, expect, vi } from 'vitest';
import { createAuthGateway } from './gateway';
import type { Transport } from '@/lib/api/http';
import { tokens, account } from '@/test/fixtures';
it('fetches CSRF before login and uses exact server header', async () => {
  const http = vi
    .fn()
    .mockResolvedValueOnce({ headerName: 'X-XSRF-TOKEN', token: 'test-csrf' })
    .mockResolvedValueOnce(tokens()) as unknown as Transport;
  await createAuthGateway(http).login({ email: account().email, password: 'fixture' });
  expect(http).toHaveBeenNthCalledWith(1, '/auth/csrf');
  expect(http).toHaveBeenNthCalledWith(
    2,
    '/auth/login',
    expect.objectContaining({ method: 'POST', headers: { 'X-XSRF-TOKEN': 'test-csrf' } }),
  );
});
it('rejects an unexpected CSRF header and never submits credentials', async () => {
  const http = vi
    .fn()
    .mockResolvedValue({ headerName: 'Unexpected', token: 'fixture' }) as unknown as Transport;
  await expect(
    createAuthGateway(http).login({ email: account().email, password: 'fixture' }),
  ).rejects.toMatchObject({ code: 'CONTRACT' });
  expect(http).toHaveBeenCalledTimes(1);
});
