import { expect } from '@playwright/test';
import { test } from './fixtures';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
test('guest homepage uses local responsive images and does not fetch private UI chunks', async ({
  page,
}) => {
  const requestedScripts: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('.js')) requestedScripts.push(path);
  });
  await page.goto('/');
  await expect(page.locator('.restaurant-card').first()).toBeVisible();
  await expect(page.locator('.hero-photo-frame img')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Danh mục món ăn' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: false }).first()).toBeVisible();
  await page
    .locator('.hero-photo-frame img')
    .evaluate((node) => (node as HTMLImageElement).decode());
  const scripts = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((item) => new URL(item.name).pathname)
      .filter((path) => path.endsWith('.js')),
  );
  expect(
    requestedScripts.filter((path) =>
      /Workspace-|AccountPages-|AuthPages-|AccountMenu-|ConfirmDialog-/.test(path),
    ),
  ).toEqual([]);
  const image = page.locator('.hero-photo-frame img');
  await expect(image).toHaveAttribute('srcset', /480w.*800w.*1024w/);
  expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(
    0,
  );
  await expect(page.locator('.photo-caption').first()).toHaveText('Ảnh minh họa');
  const directory = process.env.FOOD_E2E_DIAGNOSTIC_DIR || 'test-results/diagnostics';
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, 'guest-script-resources.json'),
    JSON.stringify({ scripts, requestedScripts }, null, 2),
  );
});
test('primary text contrast, sticky navigation and reduced motion work in the browser', async ({
  page,
}) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Khám phá nhà hàng', exact: true });
  const colors = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    return { text: style.color, background: style.backgroundColor };
  });
  const luminance = (value: string) => {
    const channels = (value.match(/[\d.]+/g) || [])
      .slice(0, 3)
      .map(Number)
      .map((channel) => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const a = luminance(colors.text),
    b = luminance(colors.background);
  expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
  expect(
    Math.abs(
      await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().top),
    ),
  ).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const card = page.locator('.restaurant-card').first();
  await card.hover();
  expect(await card.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
});
