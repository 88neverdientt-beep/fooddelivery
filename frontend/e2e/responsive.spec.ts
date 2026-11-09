import { expect } from '@playwright/test';
import { test } from './fixtures';
import { login, logout, noHorizontalOverflow, homes, fixtures, capture } from './helpers';
const evidence = process.env.FOOD_E2E_SCREENSHOT_DIR;
const future = {
  CUSTOMER: '/customer/cart',
  RESTAURANT: '/restaurant/menu',
  DRIVER: '/driver/deliveries',
  ADMIN: '/admin/accounts',
};
for (const width of [375, 768, 1024, 1440])
  test(`responsive public, forms, account and four workspaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const publicPages = [
      { path: '/', name: 'home', ready: 'Một chút Hà Nội' },
      {
        path: '/restaurants?q=' + encodeURIComponent(fixtures.catalog.name),
        name: 'restaurants',
        ready: 'Một thành phố, nhiều vị ngon',
      },
      {
        path: '/restaurants/' + fixtures.catalog.restaurantId,
        name: 'restaurant-detail',
        ready: fixtures.catalog.name,
      },
      { path: '/login', name: 'login', ready: 'Chào mừng bạn trở lại' },
      { path: '/register', name: 'register', ready: 'Bắt đầu hành trình ngon' },
      { path: '/403', name: 'forbidden', ready: 'Lối này dành cho vai trò khác' },
      { path: '/404', name: 'not-found', ready: 'Có vẻ bạn đã đi lạc một chút' },
    ];
    for (const item of publicPages) {
      await page.goto(item.path);
      await expect(
        page.getByRole('heading', {
          name: item.name === 'home' ? new RegExp(item.ready) : item.ready,
          exact: item.name !== 'home',
        }),
      ).toBeVisible();
      if (item.name === 'home') {
        await expect(page.locator('.restaurant-card').first()).toBeVisible();
        await expect(page.getByRole('list', { name: 'Danh mục món ăn' })).toBeVisible();
      }
      if (item.name === 'restaurant-detail')
        await expect(page.getByRole('heading', { name: fixtures.catalog.foodName })).toBeVisible();
      await noHorizontalOverflow(page);
      if (evidence) await capture(page, evidence, `${width}-${item.name}`);
    }
    if (width <= 768) {
      await page.getByRole('button', { name: 'Mở điều hướng', exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Điều hướng di động' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Mở điều hướng', exact: true })).toBeFocused();
    }
    for (const role of Object.keys(homes) as (keyof typeof homes)[]) {
      await login(page, role);
      await noHorizontalOverflow(page);
      if (evidence) await capture(page, evidence, `${width}-${role}`);
      if (width <= 768) {
        const trigger = page.getByRole('button', { name: 'Mở điều hướng vai trò' });
        await trigger.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
      }
      if (role === 'DRIVER' && width <= 768)
        await expect(
          page.getByRole('navigation', { name: 'Điều hướng nhanh tài xế' }),
        ).toBeVisible();
      await page.goto(future[role]);
      if (role === 'CUSTOMER')
        await expect(
          page.getByRole('heading', { name: 'Giỏ hàng của bạn', exact: true }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole('heading', { name: /Sẽ hoàn thiện ở Giai đoạn/ }),
        ).toBeVisible();
      await noHorizontalOverflow(page);
      if (evidence) await capture(page, evidence, `${width}-${role}-feature`);
      await page.goto('/account');
      await expect(
        page.getByRole('heading', { name: 'Thông tin tài khoản', exact: true }),
      ).toBeVisible();
      await expect(page.locator('.profile-details')).toBeVisible();
      await expect(page.getByText('Đang tải hồ sơ…', { exact: true })).toHaveCount(0);
      await noHorizontalOverflow(page);
      if (evidence) await capture(page, evidence, `${width}-${role}-account`);
      if (role === 'CUSTOMER') {
        await page.getByRole('button', { name: 'Đăng xuất tất cả', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await noHorizontalOverflow(page);
        if (evidence) await capture(page, evidence, `${width}-confirm-dialog`, { fullPage: false });
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Menu tài khoản' }).click();
        await expect(page.getByRole('menu')).toBeVisible();
        if (evidence)
          await capture(page, evidence, `${width}-account-dropdown`, { fullPage: false });
        await page.keyboard.press('Escape');
        await page.goto('/account/change-password');
        await expect(page.getByLabel('Mật khẩu hiện tại', { exact: true })).toBeVisible();
        await noHorizontalOverflow(page);
        if (evidence) await capture(page, evidence, `${width}-change-password`);
      }
      await logout(page);
    }
  });
