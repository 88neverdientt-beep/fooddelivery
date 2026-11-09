import { test as base, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use, info) => {
      const records: { kind: string; path: string; classification: string }[] = [];
      page.on('pageerror', () =>
        records.push({ kind: 'pageerror', path: '', classification: 'unexpected' }),
      );
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        let path = '';
        try {
          path = new URL(message.location().url).pathname;
        } catch {
          /* No URL is stored. */
        }
        const text = message.text();
        const auth = path.startsWith('/api/auth/') && /401/.test(text);
        const network =
          info.title.includes('network failure') &&
          (path === '/api/restaurants/search' ||
            /^\/api\/restaurant-food-items\/\d+$/.test(path) ||
            /^\/api\/customers\/\d+\/orders(?:\/page)?$/.test(path)) &&
          /ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(text);
        const ownership =
          info.title.includes('ownership') && /^\/api\/orders\/\d+$/.test(path) && /404/.test(text);
        records.push({
          kind: 'console-error',
          path,
          classification: auth
            ? 'expected-auth-401'
            : network
              ? 'expected-network-test'
              : ownership
                ? 'expected-ownership-404'
                : 'unexpected',
        });
      });
      await use();
      const directory = process.env.FOOD_E2E_DIAGNOSTIC_DIR || 'test-results/diagnostics';
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, info.testId.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json'),
        JSON.stringify({ test: info.title, records }, null, 2),
      );
      expect(
        records.filter((record) => record.classification === 'unexpected').length,
        'Unexpected JavaScript/browser console error',
      ).toBe(0);
    },
    { auto: true },
  ],
});
