import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
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
    browserName: 'chromium',
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    viewport: { width: 1440, height: 1000 },
  },
  outputDir: 'test-results',
});
