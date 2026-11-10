import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { request, expect, type Page } from '@playwright/test';
import { z } from 'zod';
import { test } from './fixtures';
import {
  login,
  logout,
  fixtures,
  capture,
  noHorizontalOverflow,
  assertNoStoredSecrets,
  fillSecret,
  type Credential,
} from './helpers';
import {
  ApiActor,
  freshCustomer,
  responseData,
  stage4,
  orderSchema,
  ratingSchema,
} from './customer-helpers';
import {
  analyticsSchema,
  accountRowSchema,
  customerRowSchema,
  restaurantDetailSchema,
  driverRowSchema,
  deliveryDetailSchema,
  pageSchema,
  managedAccountSchema,
} from '../src/features/admin-management/model';
import {
  profileSchema as driverProfile,
  deliveryResponseSchema,
} from '../src/features/driver-management/model';
const credential = z.object({ email: z.string(), password: z.string() });
const extra = z
  .object({
    ADMIN_OTHER: credential,
    ADMIN_BROWSER_C: credential,
    ADMIN_BROWSER_D: credential,
    ADMIN_BROWSER_E: credential,
    ADMIN_RACE_A: credential,
    ADMIN_RACE_B: credential,
    OTHER_RESTAURANT: credential,
    DRIVER_OTHER: credential,
  })
  .parse(JSON.parse(readFileSync(process.env.FOOD_E2E_CREDENTIAL_FILE!, 'utf8')));
let base: string,
  admin: ApiActor,
  otherAdmin: ApiActor,
  restaurant: ApiActor,
  driver: ApiActor,
  browserIndex = 0;
const actors: ApiActor[] = [],
  proof: object[] = [];
const browserAdmins = [
  extra.ADMIN_OTHER,
  extra.ADMIN_BROWSER_C,
  extra.ADMIN_BROWSER_D,
  extra.ADMIN_BROWSER_E,
];
async function actor(user: Credential) {
  const value = await ApiActor.login(await request.newContext({ baseURL: base }), user);
  actors.push(value);
  return value;
}
async function ui(page: Page) {
  const user = browserAdmins[browserIndex++ % browserAdmins.length];
  await login(page, 'ADMIN', user);
  return user;
}
async function customer() {
  const value = await freshCustomer(base);
  actors.push(value.actor);
  return value;
}
async function trip(ready = true) {
  const value = await customer();
  await value.actor.add(stage4.otherMenuId);
  let order = await value.actor.checkout(value.address);
  for (const state of ready ? ['CONFIRMED', 'PREPARING', 'READY'] : [])
    order = await restaurant.mutate(
      'PATCH',
      `/api/orders/${order.orderId}/status`,
      state,
      orderSchema,
    );
  return { ...value, order };
}
async function complete() {
  const value = await trip();
  const id = value.order.deliveryOutputDTO!.deliveryId;
  await driver.mutate(
    'POST',
    `/api/deliveries/${id}/accept`,
    { driverId: driver.account.driverId },
    deliveryResponseSchema,
  );
  for (const state of ['PICKED_UP', 'DELIVERING', 'DELIVERED'])
    await driver.mutate('PUT', `/api/deliveries/${id}/status`, state, deliveryResponseSchema);
  const order = await admin.order(value.order.orderId);
  expect(order.orderStatus).toBe('COMPLETED');
  expect(order.paymentResponseDTO?.paymentStatus).toBe('SUCCESS');
  return { ...value, order, deliveryId: id };
}
async function saveProfile(page: Page, path: string) {
  await page.getByRole('button', { name: 'Kiểm tra và lưu hồ sơ', exact: true }).click();
  const response = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && new URL(r.url()).pathname === path,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận lưu hồ sơ', exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
test.beforeAll(async ({ baseURL }) => {
  if (!baseURL || new URL(baseURL).hostname !== 'localhost')
    throw new Error('Isolated localhost required');
  base = baseURL;
  admin = await actor(fixtures.ADMIN);
  otherAdmin = await actor(extra.ADMIN_OTHER);
  restaurant = await actor(extra.OTHER_RESTAURANT);
  driver = await actor(extra.DRIVER_OTHER);
});
test.afterAll(async () => {
  for (const a of actors) await a.close();
  const folder = process.env.FOOD_E2E_DIAGNOSTIC_DIR || 'test-results/diagnostics';
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'phase7-admin-server-proof.json'), JSON.stringify(proof, null, 2));
});

test('admin dashboard uses full backend aggregates and clearly separates recorded payment value', async ({
  page,
}) => {
  await ui(page);
  const report = await admin.read('/api/admin-management/analytics', analyticsSchema);
  await expect(page.getByRole('heading', { name: 'Tổng quan quản trị', level: 1 })).toBeVisible();
  await expect(
    page
      .locator('.admin-count-strip > div')
      .filter({ has: page.getByText('Đơn hàng', { exact: true }) })
      .locator('dd'),
  ).toHaveText(report.allTimeCounts.orders.toLocaleString('vi-VN'));
  await expect(page.getByRole('region', { name: 'Thanh toán thành công trong kỳ' })).toContainText(
    `${report.recordedSuccessfulPayments.count} đơn hoàn thành`,
  );
  await expect(page.getByText(/không phải lợi nhuận hoặc doanh thu thực nhận/)).toBeVisible();
  await expect(page.getByText(`Giờ nghiệp vụ: ${report.timeZone}`)).toBeVisible();
  proof.push({ scenario: 'initial-admin-dashboard', report });
});
test('admin accounts search role filter server pagination and account detail use real data', async ({
  page,
}) => {
  await ui(page);
  await page.goto('/admin/accounts');
  await expect(page.getByRole('table', { name: 'Quản lý tài khoản' })).toBeVisible();
  const next = page.getByRole('button', { name: 'Trang sau' });
  await expect(next).toBeEnabled();
  const paged = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/admin-management/accounts' &&
      new URL(r.url()).searchParams.get('page') === '1',
  );
  await next.click();
  expect((await paged).status()).toBe(200);
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(fixtures.CUSTOMER.email);
  await page.getByLabel('Vai trò', { exact: true }).selectOption('CUSTOMER');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  const row = page
    .getByRole('row')
    .filter({ has: page.getByText(fixtures.CUSTOMER.email, { exact: true }) });
  await expect(row).toHaveCount(1);
  await row.getByRole('link', { name: 'Xem chi tiết' }).click();
  await expect(
    page.getByRole('heading', { name: fixtures.CUSTOMER.email, exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Khách hàng', { exact: true }).first()).toBeVisible();
  expect(await page.locator('input[type=password]').count()).toBe(0);
});
test('admin creates Restaurant and Driver through the existing secured APIs without changing its own role', async ({
  page,
}) => {
  const acting = await ui(page);
  const created: object[] = [];
  try {
    for (const kind of ['RESTAURANT', 'DRIVER'] as const) {
      const module = kind === 'RESTAURANT' ? 'restaurants' : 'drivers';
      const title = kind === 'RESTAURANT' ? 'Tạo nhà hàng' : 'Tạo tài xế';
      const user = {
        email: `create-${kind.toLowerCase()}-${randomUUID()}@phase7.test`,
        password: randomBytes(24).toString('base64url'),
      };
      const name = `QA ${kind} ${randomUUID().slice(0, 8)}`;
      await page.goto(`/admin/${module}`);
      await page.getByRole('link', { name: title, exact: true }).click();
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
      await page.getByLabel('Tên hồ sơ mới', { exact: true }).fill(name);
      await page.getByLabel('Email đăng nhập mới', { exact: true }).fill(user.email);
      await page.getByLabel('Số điện thoại mới', { exact: true }).fill('0900000077');
      await page
        .getByLabel('Địa chỉ hồ sơ mới', { exact: true })
        .fill('Synthetic Stage7 admin-created profile');
      if (kind === 'DRIVER')
        await page.getByLabel('Biển số xe mới', { exact: true }).fill('CREATE-07');
      await fillSecret(page, 'Mật khẩu tài khoản mới', user.password);
      await fillSecret(page, 'Xác nhận mật khẩu tài khoản mới', user.password);
      await page.getByRole('button', { name: 'Kiểm tra và tạo hồ sơ', exact: true }).click();
      const response = page.waitForResponse(
        (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/${module}`,
      );
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Xác nhận tạo hồ sơ', exact: true })
        .click();
      const result = await responseData(await response, managedAccountSchema, 201);
      expect(result.role).toBe(kind);
      const profileId = kind === 'RESTAURANT' ? result.restaurantId : result.driverId;
      await expect(page).toHaveURL(new RegExp(`/admin/${module}/${profileId}$`));
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await expect(page.locator('.workspace-context strong')).toHaveText(acting.email);
      const identity = await actor(user);
      expect(identity.account.role).toBe(kind);
      expect(identity.account.accountId).toBe(result.accountId);
      created.push({ accountId: result.accountId, role: kind, profileId });
    }
  } finally {
    await page.locator('input[type="password"]').evaluateAll((fields) => {
      for (const field of fields) (field as HTMLInputElement).value = '';
    });
  }
  proof.push({ scenario: 'admin-created-profiles', created });
});
test('admin customer monitoring opens allowed details without cart or order mutation controls', async ({
  page,
}) => {
  const value = await customer();
  await ui(page);
  await page.goto('/admin/customers');
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(value.user.email);
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  const row = page.getByRole('row').filter({ hasText: value.user.email });
  await row.getByRole('link', { name: 'Xem chi tiết' }).click();
  await expect(page.getByText(value.address, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Tạo đơn|Hủy đơn|Sửa giỏ/ })).toHaveCount(0);
  const response = await admin.read(
    `/api/admin-management/customers?q=${encodeURIComponent(value.user.email)}`,
    pageSchema(customerRowSchema),
  );
  expect(response.totalElements).toBe(1);
});
test('admin restaurant full-profile activity changes block new checkout and preserve existing orders', async ({
  page,
}) => {
  const before = await admin.read(
    `/api/admin-management/restaurants/${stage4.otherRestaurantId}`,
    restaurantDetailSchema,
  );
  const pending = await trip(false);
  const fresh = await customer();
  await fresh.actor.add(stage4.otherMenuId);
  await ui(page);
  await page.goto(`/admin/restaurants/${stage4.otherRestaurantId}`);
  try {
    await expect(page.getByLabel('Tên hồ sơ', { exact: true })).toHaveValue(before.name);
    await page.getByLabel('Hoạt động nhà hàng', { exact: true }).selectOption('false');
    await saveProfile(page, `/api/restaurants/${stage4.otherRestaurantId}`);
    const blocked = await fresh.actor.response(
      'POST',
      `/api/customers/${fresh.actor.account.customerId}/orders`,
      { deliveryAddress: fresh.address, paymentMethodId: stage4.codPaymentMethodId },
    );
    expect(blocked.status()).toBe(409);
    expect((await pending.actor.order(pending.order.orderId)).orderStatus).toBe('PENDING');
    expect((await fresh.actor.cart()).cartItems).toHaveLength(1);
    const closed = await admin.read(
      `/api/admin-management/restaurants/${stage4.otherRestaurantId}`,
      restaurantDetailSchema,
    );
    expect(closed.restaurantStatus).toBe(false);
    expect(closed.phoneNumber).toBe(before.phoneNumber);
  } finally {
    await admin.mutate(
      'PUT',
      `/api/restaurants/${stage4.otherRestaurantId}`,
      {
        name: before.name,
        phoneNumber: before.phoneNumber,
        address: before.address,
        restaurantStatus: before.restaurantStatus,
      },
      z.unknown(),
    );
  }
  proof.push({ scenario: 'admin-restaurant-activity', orderId: pending.order.orderId });
});
test('admin driver activity changes retain an assigned trip and its valid pickup transition', async ({
  page,
}) => {
  const ready = await trip();
  const deliveryId = ready.order.deliveryOutputDTO!.deliveryId;
  await driver.mutate(
    'POST',
    `/api/deliveries/${deliveryId}/accept`,
    { driverId: driver.account.driverId },
    deliveryResponseSchema,
  );
  const before = await admin.read(`/api/drivers/${driver.account.driverId}`, driverProfile);
  await ui(page);
  await page.goto(`/admin/drivers/${driver.account.driverId}`);
  try {
    await page.getByLabel('Hoạt động nhận chuyến', { exact: true }).selectOption('false');
    await saveProfile(page, `/api/drivers/${driver.account.driverId}`);
    expect((await driver.response('GET', '/api/driver-management/available')).status()).toBe(404);
    expect(
      (await driver.response('GET', `/api/driver-management/deliveries/${deliveryId}`)).status(),
    ).toBe(200);
    await driver.mutate(
      'PUT',
      `/api/deliveries/${deliveryId}/status`,
      'PICKED_UP',
      deliveryResponseSchema,
    );
    await page.getByRole('link', { name: 'Xem các chuyến của tài xế' }).click();
    await expect(page.getByLabel('Mã tài xế', { exact: true })).toHaveValue(
      String(driver.account.driverId),
    );
    expect(
      (
        await admin.read(
          `/api/admin-management/drivers?q=${driver.account.driverId}`,
          pageSchema(driverRowSchema),
        )
      ).items.some((v) => v.driverId === driver.account.driverId),
    ).toBe(true);
  } finally {
    await admin.mutate(
      'PUT',
      `/api/drivers/${driver.account.driverId}`,
      {
        name: before.name,
        phoneNumber: before.phoneNumber,
        address: before.address,
        licensePlate: before.licensePlate || '',
        driveStatus: before.driveStatus,
      },
      driverProfile,
    );
  }
  proof.push({
    scenario: 'admin-driver-activity',
    orderId: ready.order.orderId,
    deliveryId,
    driverId: driver.account.driverId,
  });
});
test('admin order monitoring sees the real confirm cancel race without changing lifecycle states', async ({
  page,
}) => {
  const value = await trip(false);
  await ui(page);
  await page.goto(`/admin/orders/${value.order.orderId}`);
  await expect(
    page.getByRole('heading', { name: `Giám sát đơn #${value.order.orderId}`, level: 1 }),
  ).toBeVisible();
  const results = await Promise.all([
    restaurant.response('PATCH', `/api/orders/${value.order.orderId}/status`, 'CONFIRMED'),
    value.actor.response('PATCH', `/api/orders/${value.order.orderId}/cancel`),
  ]);
  expect(results[1].status()).toBe(200);
  expect([200, 409]).toContain(results[0].status());
  const result = await admin.order(value.order.orderId);
  expect(result.orderStatus).toBe('CANCELLED');
  expect(result.paymentResponseDTO?.paymentStatus).toBe('CANCELLED');
  if (result.deliveryOutputDTO) expect(result.deliveryOutputDTO.deliveryStatus).toBe('CANCELLED');
  await page.getByRole('button', { name: 'Làm mới thông tin', exact: true }).click();
  await expect(page.getByText('Đơn hàng đã hủy', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Xác nhận đơn|Hủy đơn|Giao thành công/ }),
  ).toHaveCount(0);
  proof.push({
    scenario: 'admin-confirm-cancel-monitor',
    orderId: value.order.orderId,
    deliveryId: result.deliveryOutputDTO?.deliveryId,
  });
});
test('admin delivery and payment monitoring follow a completed real COD flow', async ({ page }) => {
  const value = await complete();
  await ui(page);
  await page.goto(`/admin/deliveries/${value.deliveryId}`);
  await expect(
    page.getByRole('heading', { name: `Giám sát chuyến #${value.deliveryId}`, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(value.address, { exact: true }).first()).toBeVisible();
  const detail = await admin.read(
    `/api/admin-management/deliveries/${value.deliveryId}`,
    deliveryDetailSchema,
  );
  expect(detail.delivery.driver?.id).toBe(driver.account.driverId);
  expect(detail.order.paymentResponseDTO?.paymentStatus).toBe('SUCCESS');
  await page.goto(`/admin/payments/orders/${value.order.orderId}`);
  await expect(page.getByText('Đã thanh toán', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Hoàn tiền|Đánh dấu đã thu|Thay đổi trạng thái/ }),
  ).toHaveCount(0);
  proof.push({
    scenario: 'admin-completed-cod-monitor',
    orderId: value.order.orderId,
    deliveryId: value.deliveryId,
    driverId: driver.account.driverId,
  });
});
test('admin reviews filter real eligible ratings and display untrusted text safely in a dialog', async ({
  page,
}) => {
  const value = await complete();
  const comment = 'QA review ' + randomUUID() + ' <script>unsafe()</script>';
  const rating = await value.actor.mutate(
    'POST',
    `/api/restaurants/${stage4.otherRestaurantId}/ratings`,
    { customerId: value.actor.account.customerId, ratingScore: 5, comment },
    ratingSchema,
    201,
  );
  await ui(page);
  await page.goto('/admin/reviews');
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(String(rating.ratingId));
  await page.getByLabel('Mã nhà hàng', { exact: true }).fill(String(stage4.otherRestaurantId));
  await page.getByLabel('Số sao', { exact: true }).selectOption('5');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  const trigger = page.getByRole('button', {
    name: `Xem đánh giá #${rating.ratingId}`,
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole('dialog').getByText(comment, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => typeof window !== 'undefined' && 'unsafe' in window)).toBe(
    false,
  );
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('button', { name: /Xóa đánh giá|Sửa đánh giá/ })).toHaveCount(0);
  proof.push({
    scenario: 'admin-review-monitor',
    orderId: value.order.orderId,
    ratingId: rating.ratingId,
  });
});
test('admin reporting date presets custom ranges and invalid boundaries use the business timezone', async ({
  page,
}) => {
  await ui(page);
  await page.goto('/admin/analytics');
  await expect(page.getByLabel('Báo cáo từ ngày', { exact: true })).toBeVisible();
  const today = await admin.read('/api/admin-management/analytics', analyticsSchema);
  const oneDay = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/admin-management/analytics' &&
      new URL(r.url()).searchParams.get('from') === today.businessToday,
  );
  await page.getByRole('button', { name: 'Hôm nay', exact: true }).click();
  expect((await responseData(await oneDay, analyticsSchema)).from).toBe(today.businessToday);
  await page.getByLabel('Báo cáo từ ngày', { exact: true }).fill('2026-01-01');
  await page.getByLabel('Báo cáo đến ngày', { exact: true }).fill('2026-04-04');
  let extraRequests = 0;
  const watch = (req: import('@playwright/test').Request) => {
    if (new URL(req.url()).pathname === '/api/admin-management/analytics') extraRequests++;
  };
  page.on('request', watch);
  await page.getByRole('button', { name: 'Áp dụng kỳ báo cáo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('tối đa 93 ngày');
  expect(extraRequests).toBe(0);
  page.off('request', watch);
  expect(
    (
      await admin.response('GET', '/api/admin-management/analytics?from=2026-02-30&to=2026-03-01')
    ).status(),
  ).toBe(400);
  await page.getByRole('button', { name: '7 ngày', exact: true }).click();
  await expect(page.getByText(`Giờ nghiệp vụ: ${today.timeZone}`)).toBeVisible();
});
test('admin security rejects other roles role injection self disable and direct lifecycle mutations', async () => {
  const c = await customer();
  const r = await actor(fixtures.RESTAURANT),
    d = await actor(fixtures.DRIVER);
  for (const value of [c.actor, r, d])
    for (const path of [
      'accounts',
      'customers',
      'restaurants',
      'drivers',
      'orders',
      'deliveries',
      'payments',
      'reviews',
      'analytics',
    ])
      expect(
        (await value.response('GET', `/api/admin-management/${path}?role=ADMIN`)).status(),
      ).toBe(403);
  const path = `/api/admin/accounts/${c.actor.account.accountId}/status`;
  expect(
    (
      await admin.response('PUT', path, {
        status: 'DISABLED',
        expectedStatus: 'ACTIVE',
        role: 'ADMIN',
      })
    ).status(),
  ).toBe(400);
  expect((await admin.response('PUT', path, { status: 'LOCKED' })).status()).toBe(400);
  expect(
    (
      await admin.response('PUT', `/api/admin/accounts/${admin.account.accountId}/status`, {
        status: 'DISABLED',
      })
    ).status(),
  ).toBe(409);
  const value = await trip(false);
  expect(
    (
      await admin.response('PATCH', `/api/orders/${value.order.orderId}/status`, 'COMPLETED')
    ).status(),
  ).toBe(403);
  expect(
    (await admin.response('PATCH', `/api/orders/${value.order.orderId}/cancel`)).status(),
  ).toBe(403);
  expect(
    (
      await admin.read(
        `/api/admin-management/accounts/${c.actor.account.accountId}`,
        accountRowSchema,
      )
    ).role,
  ).toBe('CUSTOMER');
  proof.push({ scenario: 'admin-negative-lifecycle', orderId: value.order.orderId });
});
test('admin concurrent conditional account changes commit once and cross disable keeps an active administrator', async () => {
  const value = await customer();
  const path = `/api/admin/accounts/${value.actor.account.accountId}/status`,
    payload = { status: 'DISABLED', expectedStatus: 'ACTIVE' };
  const results = await Promise.all([
    admin.response('PUT', path, payload),
    otherAdmin.response('PUT', path, payload),
  ]);
  expect(results.map((v) => v.status()).sort()).toEqual([200, 409]);
  expect((await value.actor.response('GET', '/api/auth/me')).status()).toBe(401);
  const a = await actor(extra.ADMIN_RACE_A),
    b = await actor(extra.ADMIN_RACE_B);
  const crossed = await Promise.all([
    a.response('PUT', `/api/admin/accounts/${b.account.accountId}/status`, payload),
    b.response('PUT', `/api/admin/accounts/${a.account.accountId}/status`, payload),
  ]);
  expect(crossed.map((v) => v.status()).sort()).toEqual([200, 401]);
  const accounts = await Promise.all(
    [a.account.accountId, b.account.accountId].map((id) =>
      admin.read(`/api/admin-management/accounts/${id}`, accountRowSchema),
    ),
  );
  expect(accounts.filter((v) => v.status === 'ACTIVE')).toHaveLength(1);
  proof.push({
    scenario: 'admin-status-races',
    targetAccountId: value.actor.account.accountId,
    crossedAccountIds: accounts.map((v) => ({ accountId: v.accountId, status: v.status })),
  });
});
test('admin two tabs reject a stale conditional status and then show the actual server result', async ({
  page,
  context,
}) => {
  const value = await customer();
  await ui(page);
  const path = `/admin/accounts/${value.actor.account.accountId}`;
  await page.goto(path);
  const second = await context.newPage();
  let pageErrors = 0;
  second.on('pageerror', () => pageErrors++);
  try {
    await second.goto(path);
    await expect(
      second.getByRole('button', { name: 'Vô hiệu hóa tài khoản', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Vô hiệu hóa tài khoản', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận trạng thái tài khoản', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true }),
    ).toBeVisible();
    const result = second.waitForResponse(
      (r) =>
        r.request().method() === 'PUT' &&
        new URL(r.url()).pathname === `/api/admin/accounts/${value.actor.account.accountId}/status`,
    );
    await second.getByRole('button', { name: 'Vô hiệu hóa tài khoản', exact: true }).click();
    await second
      .getByRole('button', { name: 'Xác nhận trạng thái tài khoản', exact: true })
      .click();
    expect((await result).status()).toBe(409);
    await expect(
      second.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true }),
    ).toBeVisible();
    expect(pageErrors).toBe(0);
  } finally {
    await second.close();
  }
  proof.push({ scenario: 'admin-stale-tabs', targetAccountId: value.actor.account.accountId });
});
test('admin network failure after status commit never repeats PUT and stays blocked until exact account verification', async ({
  page,
}) => {
  const value = await customer(),
    id = value.actor.account.accountId;
  await ui(page);
  await page.goto(`/admin/accounts/${id}`);
  await expect(
    page.getByRole('button', { name: 'Vô hiệu hóa tài khoản', exact: true }),
  ).toBeVisible();
  let lost = false,
    puts = 0;
  await page.route(`**/api/admin-management/accounts/${id}`, async (route) => {
    if (lost) await route.abort('internetdisconnected');
    else await route.continue();
  });
  await page.route(`**/api/admin/accounts/${id}/status`, async (route) => {
    puts++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    lost = true;
    await route.abort('internetdisconnected');
  });
  await page.getByRole('button', { name: 'Vô hiệu hóa tài khoản', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận trạng thái tài khoản', exact: true }).dblclick();
  await expect(
    page.getByRole('button', { name: 'Kiểm tra kết quả trên máy chủ', exact: true }),
  ).toBeVisible();
  expect(puts).toBe(1);
  expect((await admin.read(`/api/admin-management/accounts/${id}`, accountRowSchema)).status).toBe(
    'DISABLED',
  );
  lost = false;
  await page.getByRole('button', { name: 'Kiểm tra kết quả trên máy chủ', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kích hoạt tài khoản', exact: true }),
  ).toBeVisible();
  expect(puts).toBe(1);
  proof.push({ scenario: 'admin-status-lost-response', targetAccountId: id, putCount: puts });
});
test('admin network failure on list has explicit recovery without fabricated orders', async ({
  page,
}) => {
  await ui(page);
  await page.route('**/api/admin-management/orders?**', (route) =>
    route.abort('internetdisconnected'),
  );
  await page.goto('/admin/orders');
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.unroute('**/api/admin-management/orders?**');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Giám sát đơn hàng' })).toBeVisible();
});
test('admin session refresh logout cache cleanup account switching and frontend role guards remain correct', async ({
  page,
  context,
}) => {
  const first = browserAdmins[0],
    second = browserAdmins[1];
  await login(page, 'ADMIN', first);
  await page.goto('/admin/profile');
  await expect(page.getByRole('heading', { name: first.email, exact: true })).toBeVisible();
  const refresh = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/refresh');
  await page.reload();
  expect((await refresh).status()).toBe(200);
  await expect(page.getByRole('heading', { name: first.email, exact: true })).toBeVisible();
  await assertNoStoredSecrets(context, page);
  expect((await page.request.post('/api/auth/login', { data: {} })).status()).toBe(403);
  await logout(page);
  await login(page, 'ADMIN', second);
  await page.goto('/admin/profile');
  await expect(page.getByRole('heading', { name: second.email, exact: true })).toBeVisible();
  await expect(page.getByText(first.email, { exact: true })).toHaveCount(0);
  await logout(page);
  await login(page, 'DRIVER');
  await page.goto('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Lối này dành cho vai trò khác' })).toBeVisible();
});
for (const width of [375, 768, 1024, 1440])
  test(`admin responsive tables reports details and dialogs ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 1000 });
    const value = await complete();
    const rating = await value.actor.mutate(
      'POST',
      `/api/restaurants/${stage4.otherRestaurantId}/ratings`,
      {
        customerId: value.actor.account.customerId,
        ratingScore: 4,
        comment: 'Responsive admin QA ' + width,
      },
      ratingSchema,
      201,
    );
    const user = await ui(page);
    const cases = [
      ['dashboard', 'Tổng quan quản trị'],
      ['accounts', 'Quản lý tài khoản'],
      ['customers', 'Khách hàng'],
      ['restaurants', 'Quản lý nhà hàng'],
      ['drivers', 'Quản lý tài xế'],
      ['orders', 'Giám sát đơn hàng'],
      ['deliveries', 'Giám sát giao hàng'],
      ['payments', 'Giám sát thanh toán'],
      ['reviews', 'Đánh giá khách hàng'],
      ['analytics', 'Báo cáo hoạt động'],
      ['profile', 'Hồ sơ quản trị viên'],
      ['restaurants/new', 'Tạo nhà hàng'],
      ['drivers/new', 'Tạo tài xế'],
      [`accounts/${value.actor.account.accountId}`, `Tài khoản #${value.actor.account.accountId}`],
      [
        `customers/${value.actor.account.customerId}`,
        `Khách hàng #${value.actor.account.customerId}`,
      ],
      [`restaurants/${stage4.otherRestaurantId}`, `Nhà hàng #${stage4.otherRestaurantId}`],
      [`drivers/${driver.account.driverId}`, `Hồ sơ tài xế #${driver.account.driverId}`],
      [`orders/${value.order.orderId}`, `Giám sát đơn #${value.order.orderId}`],
      [`deliveries/${value.deliveryId}`, `Giám sát chuyến #${value.deliveryId}`],
      [`payments/orders/${value.order.orderId}`, `Thanh toán của đơn #${value.order.orderId}`],
    ];
    for (const [path, title] of cases) {
      await page.goto(`/admin/${path}`);
      await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeVisible();
      await expect(page.locator('.skeleton-card')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);
      await noHorizontalOverflow(page);
      if (width === 375) {
        for (const button of await page.locator('.admin-management > .page-header .button').all()) {
          const bounds = await button.boundingBox();
          expect(
            bounds && bounds.width >= width * 0.65,
            'Mobile header actions must remain wide enough to read and tap',
          ).toBe(true);
        }
      }
      if (process.env.FOOD_E2E_SCREENSHOT_DIR)
        await capture(
          page,
          process.env.FOOD_E2E_SCREENSHOT_DIR,
          `admin-${path.replaceAll('/', '-')}-${width}`,
        );
    }
    await page.goto(`/admin/accounts/${value.actor.account.accountId}`);
    const trigger = page.getByRole('button', { name: 'Vô hiệu hóa tài khoản', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1).toBe(true);
    if (process.env.FOOD_E2E_SCREENSHOT_DIR)
      await capture(page, process.env.FOOD_E2E_SCREENSHOT_DIR, `admin-status-dialog-${width}`, {
        fullPage: false,
      });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.goto(`/admin/reviews?q=${rating.ratingId}`);
    await page
      .getByRole('button', { name: `Xem đánh giá #${rating.ratingId}`, exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    if (process.env.FOOD_E2E_SCREENSHOT_DIR)
      await capture(page, process.env.FOOD_E2E_SCREENSHOT_DIR, `admin-review-dialog-${width}`, {
        fullPage: false,
      });
    await page.keyboard.press('Escape');
    await noHorizontalOverflow(page);
    await page.goto('/admin/profile');
    await expect(page.getByRole('heading', { name: user.email, exact: true })).toBeVisible();
    proof.push({
      scenario: 'admin-responsive',
      width,
      orderId: value.order.orderId,
      deliveryId: value.deliveryId,
      ratingId: rating.ratingId,
    });
  });
