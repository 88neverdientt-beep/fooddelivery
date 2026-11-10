import { readFileSync } from 'node:fs';
import { expect, type Page, type BrowserContext } from '@playwright/test';
import { z } from 'zod';
const path = process.env.FOOD_E2E_CREDENTIAL_FILE;
if (!path)
  throw new Error('Set FOOD_E2E_CREDENTIAL_FILE to an external isolated-test credential file.');
const credential = z.object({ email: z.string(), password: z.string() });
export const fixtures = z
  .object({
    CUSTOMER: credential,
    CUSTOMER_OTHER: credential,
    PASSWORD_CUSTOMER: credential,
    RESTAURANT: credential,
    DRIVER: credential,
    ADMIN: credential,
    catalog: z.object({
      restaurantId: z.number(),
      name: z.string(),
      foodName: z.string(),
      menuId: z.number(),
    }),
  })
  .parse(JSON.parse(readFileSync(path, 'utf8')));
export type Credential = z.infer<typeof credential>;
export const homes = {
  CUSTOMER: '/customer',
  RESTAURANT: '/restaurant/dashboard',
  DRIVER: '/driver/dashboard',
  ADMIN: '/admin/dashboard',
} as const;
export async function fillSecret(page: Page, label: string, value: string) {
  try {
    await page.getByLabel(label, { exact: true }).fill(value);
  } catch {
    throw new Error('Unable to fill protected form field; values suppressed.');
  }
}
export async function login(
  page: Page,
  role: keyof typeof homes = 'CUSTOMER',
  user: Credential = fixtures[role],
) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).waitFor();
  await fillSecret(page, 'Email', user.email);
  await fillSecret(page, 'Mật khẩu', user.password);
  const responsePromise = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/auth/login' && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const json = (await response.json()) as { data: { accessToken: string } };
  await expect(page).toHaveURL(new RegExp(homes[role] + '$'));
  const title =
    role === 'CUSTOMER'
      ? 'Hôm nay, mình ăn gì nhỉ?'
      : role === 'RESTAURANT'
        ? 'Chào mừng nhà hàng'
        : role === 'DRIVER'
          ? 'Chào mừng tài xế'
          : 'Tổng quan quản trị';
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  return json.data.accessToken;
}
export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}
export async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
export async function assertNoStoredSecrets(context: BrowserContext, page: Page) {
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
  const cookie = (await context.cookies()).find((c) => c.name === 'fd_refresh');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.sameSite).toBe('Strict');
  expect(cookie?.path).toBe('/api/auth');
  expect(await page.evaluate(() => document.cookie.includes('fd_refresh'))).toBe(false);
}

export async function capture(
  page: Page,
  directory: string,
  name: string,
  options: { fullPage?: boolean } = {},
) {
  const { mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  mkdirSync(directory, { recursive: true });
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((element) => (element as HTMLImageElement).decode());
  }
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await page.screenshot({
    path: join(directory, name + '.png'),
    fullPage: options.fullPage ?? true,
    animations: 'disabled',
  });
}
