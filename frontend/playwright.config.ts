import { defineConfig } from '@playwright/test';
const browser = process.env.FOOD_E2E_BROWSER || 'chromium';
if (browser !== 'chromium' && browser !== 'firefox' && browser !== 'webkit')
  throw new Error('Unsupported test browser');
const localTls = process.env.FOOD_E2E_LOCAL_TLS === 'true';
if (localTls && process.env.FOOD_E2E_BASE_URL !== 'https://localhost:18443')
  throw new Error('TLS test exception is restricted to the isolated staging origin');
export default defineConfig({
  testDir: './e2e',
  // Strict-precondition cases have a separate mandatory config/backend mode.
  testIgnore: '**/phase8.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.FOOD_E2E_RESULTS_FILE || 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.FOOD_E2E_BASE_URL || 'http://localhost:5173',
    browserName: browser,
    ignoreHTTPSErrors: localTls,
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    viewport: { width: 1440, height: 1000 },
  },
  outputDir: process.env.FOOD_E2E_OUTPUT_DIR || 'test-results',
});
