import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.restoreAllMocks());

it('validates strict API shapes without attempting dynamic code under CSP', async () => {
  vi.resetModules();
  const dynamicCode = vi.spyOn(globalThis, 'Function').mockImplementation(() => {
    throw new EvalError('Strict test CSP');
  });
  await import('./schema-config');
  const { z } = await import('zod');
  const schema = z
    .object({ version: z.number().int().nonnegative(), name: z.string().min(1) })
    .strict();
  expect(schema.safeParse({ version: 0, name: 'Valid' }).success).toBe(true);
  expect(schema.safeParse({ version: -1, name: '' }).success).toBe(false);
  expect(schema.safeParse({ version: 0, name: 'Valid', role: 'ADMIN' }).success).toBe(false);
  expect(dynamicCode).not.toHaveBeenCalled();
});
