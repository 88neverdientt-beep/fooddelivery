import { expect } from '@playwright/test';
import { test } from './fixtures';
import { randomUUID, randomBytes } from 'node:crypto';
import { fixtures, login, logout, fillSecret, assertNoStoredSecrets } from './helpers';
test('public catalog and menu are read from the real backend', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Một chút Hà Nội');
  await expect(
    page.getByRole('list', { name: 'Danh mục món ăn' }).getByText('Pho', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Tìm nhà hàng theo tên hoặc địa chỉ').fill(fixtures.catalog.name);
  await page.getByRole('button', { name: 'Khám phá nhà hàng', exact: true }).click();
  await expect(page.getByRole('heading', { name: fixtures.catalog.name })).toBeVisible();
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name: fixtures.catalog.name }) })
    .click();
  await expect(page.getByRole('heading', { name: fixtures.catalog.foodName })).toBeVisible();
  const menu = await page.request.get(`/api/restaurant-food-items/${fixtures.catalog.menuId}`);
  expect(menu.status()).toBe(200);
  const actual = (await menu.json()) as { data: { price: number } };
  await expect(
    page
      .locator('.customer-food-card')
      .filter({ has: page.getByRole('heading', { name: fixtures.catalog.foodName }) })
      .locator('.price'),
  ).toContainText(new Intl.NumberFormat('vi-VN').format(actual.data.price));
});
test('customer login, real Secure cookies, reload restore, logout and token revocation', async ({
  page,
  context,
}) => {
  let csrfProtected = false;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/login')
      csrfProtected = !!request.headers()['x-xsrf-token'];
  });
  const token = await login(page);
  expect(csrfProtected).toBe(true);
  await assertNoStoredSecrets(context, page);
  await page.reload();
  await expect(page).toHaveURL(/\/customer$/);
  await expect(page.getByRole('heading', { name: 'Hôm nay, mình ăn gì nhỉ?' })).toBeVisible();
  await logout(page);
  const result = await page.request.get('/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect(result.status()).toBe(401);
  await page.goto('/customer/orders');
  await expect(page).toHaveURL(/\/login$/);
  expect(await context.cookies().then((all) => all.some((c) => c.name === 'fd_refresh'))).toBe(
    false,
  );
});
test('customer registration through the browser sends no role or identity', async ({ page }) => {
  const email = randomUUID() + '@browser.test';
  const password = randomBytes(24).toString('base64url');
  let safePayload = false;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/register/customer') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      safePayload =
        Object.keys(payload).sort().join(',') === 'address,email,name,password,phoneNumber';
    }
  });
  await page.goto('/register');
  for (const [label, value] of [
    ['Họ và tên', 'Browser QA customer'],
    ['Số điện thoại', '0900000033'],
    ['Địa chỉ', 'Ha Noi test address'],
    ['Email', email],
    ['Mật khẩu', password],
    ['Xác nhận mật khẩu', password],
  ])
    await fillSecret(page, label, value);
  await page.getByRole('button', { name: 'Tạo tài khoản khách hàng' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status').filter({ hasText: 'Tài khoản đã được tạo' })).toBeVisible();
  expect(safePayload).toBe(true);
  await login(page, 'CUSTOMER', { email, password });
});
test('restaurant layout and frontend/backend role denial both hold', async ({ page }) => {
  const token = await login(page, 'RESTAURANT');
  await expect(page.getByRole('heading', { name: 'Chào mừng nhà hàng' })).toBeVisible();
  const denied = await page.request.get('/api/admin/accounts', {
    headers: { Authorization: 'Bearer ' + token },
  });
  expect(denied.status()).toBe(403);
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByText('Lối này dành cho vai trò khác')).toBeVisible();
});
test('driver reaches its own mobile-oriented workspace', async ({ page }) => {
  await login(page, 'DRIVER');
  await expect(page.getByRole('heading', { name: 'Chào mừng tài xế' })).toBeVisible();
  await page.goto('/driver/deliveries');
  await expect(
    page.getByRole('heading', { name: 'Chuyến giao của bạn', exact: true }),
  ).toBeVisible();
  await page.goto('/admin/accounts');
  await expect(page).toHaveURL(/\/403$/);
});
test('admin reaches management navigation without invented metrics', async ({ page }) => {
  await login(page, 'ADMIN');
  await expect(page.getByRole('heading', { name: 'Chào mừng quản trị viên' })).toBeVisible();
  await page.goto('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Sẽ hoàn thiện ở Giai đoạn 7' })).toBeVisible();
  await page.goto('/customer/cart');
  await expect(page).toHaveURL(/\/403$/);
});
test('password change revokes old session and requires the new password', async ({ page }) => {
  const user = fixtures.PASSWORD_CUSTOMER;
  const token = await login(page, 'CUSTOMER', user);
  await page.goto('/account/change-password');
  const next = randomBytes(24).toString('base64url');
  await fillSecret(page, 'Mật khẩu hiện tại', user.password);
  await fillSecret(page, 'Mật khẩu mới', next);
  await fillSecret(page, 'Xác nhận mật khẩu mới', next);
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status').filter({ hasText: 'Đã đổi mật khẩu' })).toBeVisible();
  expect(
    (
      await page.request.get('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
    ).status(),
  ).toBe(401);
  await fillSecret(page, 'Email', user.email);
  await fillSecret(page, 'Mật khẩu', user.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Email hoặc mật khẩu chưa đúng');
  await login(page, 'CUSTOMER', { email: user.email, password: next });
});
test('logout-all revokes a second browser session and clears private UI', async ({
  browser,
  page,
}) => {
  const user = fixtures.CUSTOMER_OTHER;
  await login(page, 'CUSTOMER', user);
  const second = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const other = await second.newPage();
    const token = await login(other, 'CUSTOMER', user);
    await page.goto('/account');
    await page.getByRole('button', { name: 'Đăng xuất tất cả', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Đăng xuất tất cả', exact: true })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      (
        await other.request.get('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
      ).status(),
    ).toBe(401);
    await other.goto('/account');
    await expect(other).toHaveURL(/\/login$/);
    await expect(other.locator('body')).not.toContainText(user.email);
  } finally {
    await second.close();
  }
});
test('two tabs serialize refresh rotation without revoking the shared session', async ({
  page,
  context,
}) => {
  await login(page);
  const second = await context.newPage();
  await second.goto('/customer');
  await expect(second.getByRole('heading', { name: 'Hôm nay, mình ăn gì nhỉ?' })).toBeVisible();
  await Promise.all([page.reload(), second.reload()]);
  for (const tab of [page, second]) {
    await expect(tab).toHaveURL(/\/customer$/);
    await expect(tab.getByRole('heading', { name: 'Hôm nay, mình ăn gì nhỉ?' })).toBeVisible();
  }
  await logout(page);
  await expect(second).toHaveURL(/\/login$/);
  await expect(second.locator('body')).not.toContainText(fixtures.CUSTOMER.email);
});
test('403, 404, empty catalog filtering and actual network failure have clear states', async ({
  page,
}) => {
  await page.goto('/403');
  await expect(page.getByRole('heading', { name: 'Lối này dành cho vai trò khác' })).toBeVisible();
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Có vẻ bạn đã đi lạc một chút' })).toBeVisible();
  await page.goto('/restaurants?q=unmatchable-' + randomUUID());
  await expect(page.getByRole('heading', { name: 'Chưa tìm thấy quán phù hợp' })).toBeVisible();
  await page.route('**/api/restaurants/search?*', (route) => route.abort('internetdisconnected'));
  await page.goto('/restaurants');
  await expect(page.getByRole('alert')).toContainText('Không kết nối được máy chủ');
  await page.unroute('**/api/restaurants/search?*');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.locator('.restaurant-card').first()).toBeVisible();
});
