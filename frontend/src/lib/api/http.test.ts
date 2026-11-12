import { it, expect, vi } from 'vitest';
import { createTransport, ApiError, normalizeError } from './http';
it('sends Bearer and credentials without storing anything', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', data: { ok: true } }), { status: 200 }),
    );
  const http = createTransport('/api', fetcher);
  expect(await http('/private', { token: 'test-memory' })).toEqual({ ok: true });
  expect(fetcher).toHaveBeenCalledWith(
    '/api/private',
    expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({ Authorization: 'Bearer test-memory' }),
    }),
  );
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});
it.each([400, 401, 403, 404, 409, 422, 429, 500])(
  'normalizes HTTP %i without exposing server details',
  async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response('internal SQL details', { status }));
    const http = createTransport('/api', fetcher);
    await expect(http('/thing')).rejects.toMatchObject({ status });
    try {
      await http('/thing');
    } catch (error) {
      expect(normalizeError(error).message).not.toContain('SQL');
    }
  },
);
it('rejects unexpected successful response format', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  await expect(createTransport('/api', fetcher)('/thing')).rejects.toMatchObject({
    code: 'CONTRACT',
  });
});
it('does not retry transport errors', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('private implementation detail'));
  await expect(createTransport('/api', fetcher)('/thing')).rejects.toMatchObject({
    code: 'NETWORK',
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('preserves caller cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
  await expect(
    createTransport('/api', fetcher)('/thing', { signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
it('rejects credential-bearing base URLs', () =>
  expect(() => createTransport('https://user:pass@example.test')).toThrow());
it('handles no-content logout', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  expect(
    await createTransport('/api', fetcher)('/auth/logout', { method: 'POST' }),
  ).toBeUndefined();
  expect(new ApiError(0, 'TIMEOUT').message).toContain('thời gian');
});

it('downloads authenticated Excel bytes without requiring the JSON envelope', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(new Uint8Array([80, 75, 3, 4]), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    }),
  );
  const data = await createTransport('/api', fetcher)<Blob>('/export', {
    token: 'memory-only',
    responseType: 'blob',
  });
  expect(data.size).toBe(4);
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer memory-only');
});
it('rejects a successful JSON response on an Excel request', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
  await expect(
    createTransport('/api', fetcher)('/export', { responseType: 'blob' }),
  ).rejects.toMatchObject({ code: 'CONTRACT' });
});
