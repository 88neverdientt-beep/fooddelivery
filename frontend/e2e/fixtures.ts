import { test as base, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use, info) => {
      const records: {
        kind: string;
        path: string;
        classification: string;
        diagnostic?: string;
        stack?: string;
        errorArguments?: { name?: string; message?: string; code?: string; status?: number }[];
      }[] = [];
      const inspections: Promise<void>[] = [];
      const capturedAtSource: unknown[] = [];
      const failedRequests: { path: string; failure: string | null }[] = [];
      // Values, bodies and headers are deliberately excluded from this timeline.
      const timeline: { at: number; event: string; path: string; status?: number }[] = [];
      const started = Date.now();
      const observe = (event: string, url: string, status?: number) => {
        let path = '[non-http]';
        try {
          path = new URL(url).pathname;
        } catch {
          // Navigation to about:blank has no resource path.
        }
        timeline.push({ at: Date.now() - started, event, path, status });
      };
      page.on('request', (r) => observe('request:' + r.method(), r.url()));
      page.on('response', (r) => observe('response', r.url(), r.status()));
      page.on('requestfinished', (r) => observe('requestfinished', r.url()));
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) observe('navigation', frame.url());
      });
      page.on('requestfailed', (request) => {
        observe('requestfailed', request.url());
        failedRequests.push({
          path: new URL(request.url()).pathname,
          failure: request.failure()?.errorText || null,
        });
      });
      const safe = (text: string) =>
        text
          .replace(/eyJ[A-Za-z0-9_.-]+/g, '[redacted-token]')
          .replace(/https?:\/\/[^\s"')]+/g, (url) => {
            try {
              return new URL(url).pathname;
            } catch {
              return '[URL]';
            }
          })
          .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
          .replace(/[A-Za-z0-9_-]{24,}/g, '[redacted-long-value]')
          .slice(0, 2000);
      if (process.env.FOOD_E2E_CAPTURE_ERROR_ARGS === 'true') {
        await page.exposeBinding('__stage8ErrorArguments', (_source, value: unknown) => {
          capturedAtSource.push(value);
        });
        await page.addInitScript(() => {
          const target = window as unknown as {
            __stage8ErrorArguments: (value: unknown) => Promise<void>;
          };
          const original = console.error;
          console.error = (...args: unknown[]) => {
            try {
              const clean = (value: unknown) =>
                typeof value === 'string'
                  ? value
                      .replace(/eyJ[A-Za-z0-9_.-]+/g, '[token]')
                      .replace(/https?:\/\/[^\s"']+/g, (url) => {
                        try {
                          return new URL(url).pathname;
                        } catch {
                          return '[URL]';
                        }
                      })
                      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
                      .replace(/[A-Za-z0-9_-]{24,}/g, '[long-value]')
                      .slice(0, 500)
                  : undefined;
              const details = args
                .filter((value) => typeof value === 'object' && value !== null)
                .map((value) => {
                  const e = value as {
                    name?: unknown;
                    message?: unknown;
                    code?: unknown;
                    status?: unknown;
                    stack?: unknown;
                    constructor?: { name?: unknown };
                  };
                  return {
                    type: clean(e.constructor?.name),
                    name: clean(e.name),
                    message: clean(e.message),
                    code: clean(e.code),
                    status: typeof e.status === 'number' ? e.status : undefined,
                    stack: clean(e.stack),
                    keys: Object.keys(e).slice(0, 12),
                  };
                });
              void target.__stage8ErrorArguments(details).catch(() => {});
            } catch {
              /* Diagnostics must never change the original console behavior. */
            }
            original.apply(console, args);
          };
        });
      }
      page.on('pageerror', (error) => {
        observe('pageerror', page.url());
        records.push({
          kind: 'pageerror',
          path: '',
          classification: 'unexpected',
          diagnostic: safe(error.name + ': ' + error.message),
          stack: safe(error.stack || ''),
        });
      });
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
            /^\/api\/deliveries\/\d+\/(?:accept|status)$/.test(path) ||
            /^\/api\/driver-management\/deliveries(?:\/\d+)?$/.test(path) ||
            /^\/api\/customers\/\d+\/orders(?:\/page)?$/.test(path) ||
            (info.title.startsWith('admin ') &&
              /^\/api\/(?:admin\/accounts\/\d+\/status|admin-management\/(?:accounts\/\d+|orders))$/.test(
                path,
              ))) &&
          /ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(text);
        const ownership =
          info.title.includes('ownership') &&
          (/^\/api\/orders\/\d+$/.test(path) ||
            /^\/api\/driver-management\/deliveries\/\d+$/.test(path)) &&
          /404/.test(text);
        const adminConflict =
          info.title.startsWith('admin two tabs') &&
          /^\/api\/admin\/accounts\/\d+\/status$/.test(path) &&
          /409/.test(text);
        const record: (typeof records)[number] = {
          kind: 'console-error',
          path,
          diagnostic: safe(text),
          classification: auth
            ? 'expected-auth-401'
            : network
              ? 'expected-network-test'
              : ownership
                ? 'expected-ownership-404'
                : adminConflict
                  ? 'expected-admin-stale-409'
                  : 'unexpected',
        };
        records.push(record);
        inspections.push(
          Promise.all(
            message.args().map(async (argument) => {
              try {
                const details = await argument.evaluate((value: unknown) => {
                  if (typeof value !== 'object' || value === null) return {};
                  const error = value as {
                    name?: unknown;
                    message?: unknown;
                    code?: unknown;
                    status?: unknown;
                  };
                  return {
                    name: typeof error.name === 'string' ? error.name : undefined,
                    message: typeof error.message === 'string' ? error.message : undefined,
                    code: typeof error.code === 'string' ? error.code : undefined,
                    status: typeof error.status === 'number' ? error.status : undefined,
                  };
                });
                return {
                  ...details,
                  name: details.name && safe(details.name),
                  message: details.message && safe(details.message),
                  code: details.code && safe(details.code),
                };
              } catch {
                return { name: undefined, message: undefined, code: undefined, status: undefined };
              }
            }),
          ).then((details) => {
            record.errorArguments = details.filter(
              (value) => value.name || value.message || value.code || value.status,
            );
          }),
        );
      });
      await use();
      await Promise.allSettled(inspections);
      const directory = process.env.FOOD_E2E_DIAGNOSTIC_DIR || 'test-results/diagnostics';
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, info.testId.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json'),
        JSON.stringify(
          { test: info.title, records, capturedAtSource, failedRequests, timeline },
          null,
          2,
        ),
      );
      expect(
        records.filter((record) => record.classification === 'unexpected').length,
        'Unexpected JavaScript/browser console error',
      ).toBe(0);
    },
    { auto: true },
  ],
});
