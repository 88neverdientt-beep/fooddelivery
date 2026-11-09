import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { request, expect, type Page, type Browser } from '@playwright/test';
import { z } from 'zod';
import { test } from './fixtures';
import {
  login,
  logout,
  fixtures,
  capture,
  noHorizontalOverflow,
  assertNoStoredSecrets,
  type Credential,
} from './helpers';
import {
  ApiActor,
  freshCustomer,
  responseData,
  orderSchema,
  ratingSchema,
  stage4,
} from './customer-helpers';
import {
  detailSchema,
  profileSchema,
  assignedPageSchema,
  availablePageSchema,
  analyticsSchema,
  deliveryResponseSchema,
} from '../src/features/driver-management/model';
const raw = z
  .object({
    DRIVER_OTHER: z.object({ email: z.string(), password: z.string() }),
    OTHER_RESTAURANT: z.object({ email: z.string(), password: z.string() }),
  })
  .parse(JSON.parse(readFileSync(process.env.FOOD_E2E_CREDENTIAL_FILE!, 'utf8')));
let base: string, a: ApiActor, b: ApiActor, restaurant: ApiActor, admin: ApiActor;
const actors: ApiActor[] = [],
  proof: object[] = [];
async function actor(user: Credential) {
  const value = await ApiActor.login(await request.newContext({ baseURL: base }), user);
  actors.push(value);
  return value;
}
async function prepare(ready = true) {
  const customer = await freshCustomer(base);
  actors.push(customer.actor);
  await customer.actor.add(stage4.otherMenuId);
  let order = await customer.actor.checkout(customer.address);
  for (const status of ready ? ['CONFIRMED', 'PREPARING', 'READY'] : ['CONFIRMED'])
    order = await restaurant.mutate(
      'PATCH',
      `/api/orders/${order.orderId}/status`,
      status,
      orderSchema,
    );
  return { ...customer, order, deliveryId: order.deliveryOutputDTO!.deliveryId };
}
async function accept(api: ApiActor, id: number) {
  return api.mutate(
    'POST',
    `/api/deliveries/${id}/accept`,
    { driverId: api.account.driverId },
    deliveryResponseSchema,
  );
}
async function status(api: ApiActor, id: number, value: 'PICKED_UP' | 'DELIVERING' | 'DELIVERED') {
  return api.mutate('PUT', `/api/deliveries/${id}/status`, value, deliveryResponseSchema);
}
async function confirmStep(page: Page, name: string, id: number, expected: string) {
  await page.getByRole('button', { name, exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname === `/api/deliveries/${id}/status`,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận bước giao hàng', exact: true })
    .click();
  expect((await responseData(await response, deliveryResponseSchema)).deliveryStatus).toBe(
    expected,
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function confirmRestaurant(page: Page, name: string, id: number) {
  await page.getByRole('button', { name, exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/orders/${id}/status`,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận trạng thái', exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function extraPage(browser: Browser) {
  const context = await browser.newContext({ baseURL: base });
  const page = await context.newPage();
  let errors = 0;
  page.on('pageerror', () => errors++);
  return {
    context,
    page,
    check: () => expect(errors, 'Extra role page JavaScript errors').toBe(0),
  };
}
test.beforeAll(async ({ baseURL }) => {
  if (!baseURL || new URL(baseURL).hostname !== 'localhost')
    throw new Error('Isolated localhost is required');
  base = baseURL;
  a = await actor(raw.DRIVER_OTHER);
  b = await actor(fixtures.DRIVER);
  restaurant = await actor(raw.OTHER_RESTAURANT);
  admin = await actor(fixtures.ADMIN);
});
test.afterAll(async () => {
  for (const value of actors) await value.close();
  const folder = process.env.FOOD_E2E_DIAGNOSTIC_DIR || 'test-results/diagnostics';
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'phase6-driver-server-proof.json'), JSON.stringify(proof, null, 2));
});

test('driver profile validation, real save, availability and continuing an assigned trip while inactive', async ({
  page,
}) => {
  const trip = await prepare();
  await accept(a, trip.deliveryId);
  await login(page, 'DRIVER', raw.DRIVER_OTHER);
  await page.goto('/driver/profile');
  await page.getByLabel('Họ tên tài xế', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Lưu hồ sơ tài xế', exact: true }).click();
  await expect(page.getByText('Nhập họ tên.', { exact: true })).toBeVisible();
  const name = 'Tài xế kiểm chứng ' + randomUUID().slice(0, 8);
  await page.getByLabel('Họ tên tài xế', { exact: true }).fill(name);
  await page.getByLabel('Biển số xe', { exact: true }).fill('QA-06');
  await page.getByLabel('Đang nhận chuyến mới', { exact: true }).uncheck();
  const saved = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname === `/api/drivers/${a.account.driverId}`,
  );
  await page.getByRole('button', { name: 'Lưu hồ sơ tài xế', exact: true }).click();
  expect((await responseData(await saved, profileSchema)).driveStatus).toBe(false);
  await expect(page.getByRole('button', { name: 'Lưu hồ sơ tài xế', exact: true })).toBeEnabled();
  await page.goto('/driver/available');
  await expect(
    page.getByRole('heading', { name: 'Bạn đang tạm ngừng nhận chuyến', exact: true }),
  ).toBeVisible();
  await page.goto(`/driver/deliveries/${trip.deliveryId}`);
  await confirmStep(page, 'Xác nhận đã lấy hàng', trip.deliveryId, 'PICKED_UP');
  const current = await a.read(`/api/drivers/${a.account.driverId}`, profileSchema);
  expect(current.name).toBe(name);
  await a.mutate(
    'PUT',
    `/api/drivers/${a.account.driverId}`,
    {
      name: current.name,
      phoneNumber: current.phoneNumber,
      address: current.address,
      licensePlate: current.licensePlate,
      driveStatus: true,
    },
    profileSchema,
  );
  proof.push({
    scenario: 'profile-and-drive-status',
    driverId: a.account.driverId,
    deliveryId: trip.deliveryId,
    inactiveExistingPickupAllowed: true,
  });
});

test('full customer restaurant driver customer browser flow completes COD and rating consistently', async ({
  page,
  browser,
  context,
}) => {
  const analyticsBefore = await a.read('/api/driver-management/analytics', analyticsSchema);
  const customer = await freshCustomer(base);
  actors.push(customer.actor);
  const c = await extraPage(browser),
    r = await extraPage(browser);
  try {
    await login(c.page, 'CUSTOMER', customer.user);
    await c.page.goto(`/restaurants/${stage4.otherRestaurantId}/food/${stage4.otherMenuId}`);
    const added = c.page.waitForResponse(
      (x) => x.request().method() === 'POST' && /\/cart-items$/.test(new URL(x.url()).pathname),
    );
    await c.page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
    expect((await added).status()).toBe(201);
    await c.page.goto('/customer/checkout');
    await c.page.getByLabel('Địa chỉ giao hàng', { exact: true }).fill(customer.address);
    const checked = c.page.waitForResponse(
      (x) =>
        x.request().method() === 'POST' &&
        /^\/api\/customers\/\d+\/orders$/.test(new URL(x.url()).pathname),
    );
    await c.page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true }).click();
    const order = await responseData(await checked, orderSchema, 201);
    await login(r.page, 'RESTAURANT', raw.OTHER_RESTAURANT);
    await r.page.goto(`/restaurant/orders?q=${order.orderId}`);
    await r.page.getByRole('link', { name: `Xem đơn #${order.orderId}`, exact: true }).click();
    await confirmRestaurant(r.page, 'Xác nhận đơn', order.orderId);
    await confirmRestaurant(r.page, 'Bắt đầu chuẩn bị', order.orderId);
    await confirmRestaurant(r.page, 'Sẵn sàng giao', order.orderId);
    const ready = await customer.actor.order(order.orderId),
      id = ready.deliveryOutputDTO!.deliveryId;
    await login(page, 'DRIVER', raw.DRIVER_OTHER);
    await page.goto(`/driver/available?q=${order.orderId}`);
    await expect(page.getByText(customer.address, { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: `Nhận chuyến #${id}`, exact: true }).click();
    const accepted = page.waitForResponse(
      (x) =>
        x.request().method() === 'POST' &&
        new URL(x.url()).pathname === `/api/deliveries/${id}/accept`,
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Xác nhận nhận chuyến', exact: true })
      .click();
    expect((await accepted).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/driver/deliveries/${id}$`));
    await expect(page.getByText(customer.address, { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText('Ha Noi - isolated Stage6 fixture', { exact: true }).first(),
    ).toBeVisible();
    await confirmStep(page, 'Xác nhận đã lấy hàng', id, 'PICKED_UP');
    await confirmStep(page, 'Bắt đầu giao hàng', id, 'DELIVERING');
    await c.page.goto(`/customer/orders/${order.orderId}`);
    await expect(c.page.getByText('Đang giao hàng', { exact: true }).first()).toBeVisible();
    await r.page.getByRole('button', { name: 'Làm mới đơn', exact: true }).click();
    await expect(r.page.getByText('Đang giao hàng', { exact: true }).first()).toBeVisible();
    await confirmStep(page, 'Xác nhận giao thành công', id, 'DELIVERED');
    const final = await customer.actor.order(order.orderId);
    expect(final.orderStatus).toBe('COMPLETED');
    expect(final.paymentResponseDTO!.paymentStatus).toBe('SUCCESS');
    expect(final.paymentResponseDTO!.amount).toBe(final.totalAmount);
    await c.page.goto(`/customer/orders/${order.orderId}`);
    await expect(c.page.getByText('Đã hoàn thành', { exact: true }).first()).toBeVisible();
    await r.page.getByRole('button', { name: 'Làm mới đơn', exact: true }).click();
    await expect(r.page.getByText('Đã hoàn thành', { exact: true }).first()).toBeVisible();
    await page.goto(`/driver/history?q=${id}`);
    await expect(page.getByRole('link', { name: `Xem chuyến #${id}`, exact: true })).toBeVisible();
    const comment = 'Đánh giá giao hàng thật ' + randomUUID().slice(0, 8);
    const rating = await customer.actor.mutate(
      'POST',
      `/api/restaurants/${stage4.otherRestaurantId}/ratings`,
      { customerId: customer.actor.account.customerId, ratingScore: 5, comment },
      ratingSchema,
      201,
    );
    await c.page.goto('/customer/ratings');
    await c.page.getByRole('button', { name: ready.restaurant.name, exact: true }).click();
    await expect(c.page.getByText(comment, { exact: true })).toBeVisible();
    await assertNoStoredSecrets(context, page);
    c.check();
    r.check();
    const analyticsAfter = await a.read('/api/driver-management/analytics', analyticsSchema);
    expect(analyticsAfter.completedInPeriod - analyticsBefore.completedInPeriod).toBe(1);
    expect(analyticsAfter.totalAssignedAllTime - analyticsBefore.totalAssignedAllTime).toBe(1);
    proof.push({
      scenario: 'full-three-role-browser-flow',
      driverId: a.account.driverId,
      orderId: order.orderId,
      deliveryId: id,
      ratingId: rating.ratingId,
      total: final.totalAmount,
      completed: true,
    });
  } finally {
    await c.context.close();
    await r.context.close();
  }
});

test('driver ownership and forged bodies cannot expose or mutate another assignment', async () => {
  const trip = await prepare();
  await accept(b, trip.deliveryId);
  for (const [method, path, body] of [
    ['GET', `/api/driver-management/deliveries/${trip.deliveryId}`, undefined],
    ['GET', `/api/orders/${trip.order.orderId}`, undefined],
    ['PUT', `/api/deliveries/${trip.deliveryId}/status`, 'PICKED_UP'],
    ['POST', `/api/deliveries/${trip.deliveryId}/accept`, { driverId: b.account.driverId }],
  ] as const)
    expect((await a.response(method, path, body)).status()).toBe(404);
  const assigned = await a.read(
    `/api/driver-management/deliveries?scope=all&q=${trip.deliveryId}&driverId=${b.account.driverId}`,
    assignedPageSchema,
  );
  expect(assigned.items.some((x) => x.deliveryId === trip.deliveryId)).toBe(false);
  for (const path of [
    '/deliveries',
    '/available',
    '/analytics',
    `/deliveries/${trip.deliveryId}`,
  ]) {
    expect((await trip.actor.response('GET', '/api/driver-management' + path)).status()).toBe(403);
    expect((await restaurant.response('GET', '/api/driver-management' + path)).status()).toBe(403);
    expect((await admin.response('GET', '/api/driver-management' + path)).status()).toBe(403);
  }
  for (const [path, body] of [
    [`/api/customers/${trip.actor.account.customerId}`, {}],
    [`/api/restaurants/${stage4.otherRestaurantId}`, {}],
    ['/api/admin/accounts/1/status', 'DISABLED'],
  ] as const)
    expect((await a.response('PUT', path, body)).status()).toBe(403);
  expect(
    (await a.response('PATCH', `/api/orders/${trip.order.orderId}/status`, 'COMPLETED')).status(),
  ).toBe(403);
  const waiting = await prepare();
  expect(
    (
      await a.read(
        `/api/driver-management/available?q=${waiting.order.orderId}`,
        availablePageSchema,
      )
    ).items.some((item) => item.deliveryId === waiting.deliveryId),
  ).toBe(true);
  expect(
    (
      await a.response('POST', `/api/deliveries/${waiting.deliveryId}/accept`, {
        driverId: a.account.driverId,
        orderStatus: 'COMPLETED',
      })
    ).status(),
  ).toBe(400);
  expect(
    (await a.response('GET', `/api/driver-management/deliveries/${waiting.deliveryId}`)).status(),
  ).toBe(404);
  proof.push({
    scenario: 'driver-ownership',
    protectedOrderId: trip.order.orderId,
    protectedDeliveryId: trip.deliveryId,
    deniedMutationsPreservedOwner: true,
  });
});

test('two drivers accepting the same trip have one winner and one conflict', async () => {
  const trip = await prepare();
  const results = await Promise.all(
    [a, b].map((api) =>
      api.response('POST', `/api/deliveries/${trip.deliveryId}/accept`, {
        driverId: api.account.driverId,
      }),
    ),
  );
  expect(results.map((x) => x.status()).sort()).toEqual([200, 409]);
  const winner = results[0].status() === 200 ? a : b,
    loser = winner === a ? b : a;
  expect(
    (await winner.read(`/api/driver-management/deliveries/${trip.deliveryId}`, detailSchema))
      .driverId,
  ).toBe(winner.account.driverId);
  expect(
    (await loser.response('GET', `/api/driver-management/deliveries/${trip.deliveryId}`)).status(),
  ).toBe(404);
  proof.push({
    scenario: 'accept-race',
    orderId: trip.order.orderId,
    deliveryId: trip.deliveryId,
    driverId: winner.account.driverId,
    statuses: results.map((x) => x.status()),
  });
});

test('duplicate concurrent pickup transitions commit once and preserve payment pending', async () => {
  const trip = await prepare();
  await accept(a, trip.deliveryId);
  const results = await Promise.all(
    [1, 2].map(() => a.response('PUT', `/api/deliveries/${trip.deliveryId}/status`, 'PICKED_UP')),
  );
  expect(results.map((x) => x.status()).sort()).toEqual([200, 409]);
  const state = await trip.actor.order(trip.order.orderId);
  expect(state.orderStatus).toBe('READY');
  expect(state.paymentResponseDTO!.paymentStatus).toBe('PENDING');
  proof.push({
    scenario: 'pickup-race',
    orderId: state.orderId,
    deliveryId: trip.deliveryId,
    statuses: results.map((x) => x.status()),
  });
});

test('driver acceptance racing customer cancellation leaves a consistent cancelled trip', async () => {
  const trip = await prepare(false);
  const results = await Promise.all([
    a.response('POST', `/api/deliveries/${trip.deliveryId}/accept`, {
      driverId: a.account.driverId,
    }),
    trip.actor.response('PATCH', `/api/orders/${trip.order.orderId}/cancel`),
  ]);
  expect(results.every((x) => [200, 409].includes(x.status()))).toBe(true);
  const state = await trip.actor.order(trip.order.orderId);
  expect(state.orderStatus).toBe('CANCELLED');
  expect(state.deliveryOutputDTO!.deliveryStatus).toBe('CANCELLED');
  expect(state.paymentResponseDTO!.paymentStatus).toBe('CANCELLED');
  proof.push({
    scenario: 'accept-cancel-race',
    cancelledOrderId: state.orderId,
    deliveryId: trip.deliveryId,
  });
});

test('driver cannot pick up before ready, skip states or update cancelled and unassigned trips', async () => {
  const trip = await prepare(false);
  expect(
    (await a.response('PUT', `/api/deliveries/${trip.deliveryId}/status`, 'PICKED_UP')).status(),
  ).toBe(404);
  await accept(a, trip.deliveryId);
  expect(
    (await a.response('PUT', `/api/deliveries/${trip.deliveryId}/status`, 'PICKED_UP')).status(),
  ).toBe(409);
  expect(
    (await a.response('PUT', `/api/deliveries/${trip.deliveryId}/status`, 'DELIVERED')).status(),
  ).toBe(409);
  expect(
    (await a.response('PUT', `/api/deliveries/${trip.deliveryId}/status`, 'FAILED')).status(),
  ).toBe(400);
  await trip.actor.mutate(
    'PATCH',
    `/api/orders/${trip.order.orderId}/cancel`,
    undefined,
    orderSchema,
  );
  expect(
    (await a.response('PUT', `/api/deliveries/${trip.deliveryId}/status`, 'PICKED_UP')).status(),
  ).toBe(409);
  proof.push({
    scenario: 'invalid-not-ready-cancelled',
    cancelledOrderId: trip.order.orderId,
    deliveryId: trip.deliveryId,
  });
});

test('driver two tabs refresh after a conflicting stale transition', async ({ page, context }) => {
  const trip = await prepare();
  await accept(a, trip.deliveryId);
  await login(page, 'DRIVER', raw.DRIVER_OTHER);
  await page.goto(`/driver/deliveries/${trip.deliveryId}`);
  await page.getByRole('button', { name: 'Xác nhận đã lấy hàng', exact: true }).waitFor();
  const second = await context.newPage();
  let errors = 0;
  second.on('pageerror', () => errors++);
  await second.goto(`/driver/deliveries/${trip.deliveryId}`);
  await second.getByRole('button', { name: 'Xác nhận đã lấy hàng', exact: true }).click();
  await confirmStep(page, 'Xác nhận đã lấy hàng', trip.deliveryId, 'PICKED_UP');
  const conflict = second.waitForResponse(
    (x) =>
      x.request().method() === 'PUT' &&
      new URL(x.url()).pathname === `/api/deliveries/${trip.deliveryId}/status`,
  );
  await second
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận bước giao hàng', exact: true })
    .click();
  expect((await conflict).status()).toBe(409);
  await expect(
    second.getByRole('button', { name: 'Bắt đầu giao hàng', exact: true }),
  ).toBeVisible();
  expect(errors).toBe(0);
  await second.close();
  proof.push({
    scenario: 'two-tab-transition',
    orderId: trip.order.orderId,
    deliveryId: trip.deliveryId,
    staleStatus: 409,
  });
});

test('driver network failure after delivered commit reconciles COD without repeated PUT', async ({
  page,
}) => {
  const trip = await prepare();
  await accept(a, trip.deliveryId);
  await status(a, trip.deliveryId, 'PICKED_UP');
  await status(a, trip.deliveryId, 'DELIVERING');
  await login(page, 'DRIVER', raw.DRIVER_OTHER);
  await page.goto(`/driver/deliveries/${trip.deliveryId}`);
  let writes = 0;
  await page.route(`**/api/deliveries/${trip.deliveryId}/status`, async (route) => {
    writes++;
    const response = await route.fetch({ maxRetries: 0 });
    expect(response.status()).toBe(200);
    await route.abort('internetdisconnected');
  });
  await page.getByRole('button', { name: 'Xác nhận giao thành công', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận bước giao hàng', exact: true })
    .click();
  await expect(page.getByText('Đã giao thành công', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xác nhận giao thành công', exact: true }),
  ).toHaveCount(0);
  expect(writes).toBe(1);
  const final = await trip.actor.order(trip.order.orderId);
  expect(final.orderStatus).toBe('COMPLETED');
  expect(final.paymentResponseDTO!.paymentStatus).toBe('SUCCESS');
  await page.unrouteAll({ behavior: 'wait' });
  proof.push({
    scenario: 'lost-delivered-response',
    orderId: trip.order.orderId,
    deliveryId: trip.deliveryId,
    mutationRequests: writes,
  });
});

test('driver network failure after accept commit blocks repost until own detail is verified', async ({
  page,
}) => {
  const trip = await prepare();
  await login(page, 'DRIVER', raw.DRIVER_OTHER);
  await page.goto(`/driver/available?q=${trip.order.orderId}`);
  let writes = 0,
    blocked = true;
  await page.route(`**/api/driver-management/deliveries/${trip.deliveryId}`, (route) =>
    blocked ? route.abort('internetdisconnected') : route.continue(),
  );
  await page.route(`**/api/deliveries/${trip.deliveryId}/accept`, async (route) => {
    writes++;
    const response = await route.fetch({ maxRetries: 0 });
    expect(response.status()).toBe(200);
    await route.abort('internetdisconnected');
  });
  await page.getByRole('button', { name: `Nhận chuyến #${trip.deliveryId}`, exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận nhận chuyến', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Kiểm tra kết quả nhận chuyến', exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  blocked = false;
  await page.getByRole('button', { name: 'Kiểm tra kết quả nhận chuyến', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/driver/deliveries/${trip.deliveryId}$`));
  await expect(
    page.getByRole('heading', { name: `Chuyến giao #${trip.deliveryId}`, exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await page.unrouteAll({ behavior: 'wait' });
  proof.push({
    scenario: 'lost-accept-response',
    orderId: trip.order.orderId,
    deliveryId: trip.deliveryId,
    mutationRequests: writes,
  });
});

test('driver network failure on list shows recovery without fabricated deliveries', async ({
  page,
}) => {
  await login(page, 'DRIVER', raw.DRIVER_OTHER);
  await page.route('**/api/driver-management/deliveries?**', (route) =>
    route.abort('internetdisconnected'),
  );
  await page.goto('/driver/deliveries');
  await expect(
    page.getByRole('heading', { name: 'Chưa thể tải nội dung', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Xem chuyến #/ })).toHaveCount(0);
  await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText(/chuyến trong kết quả/)).toBeVisible();
});

test('driver ownership across refresh logout and account switching with frontend role guards', async ({
  page,
  context,
}) => {
  const own = await prepare(),
    other = await prepare();
  await accept(a, own.deliveryId);
  await accept(b, other.deliveryId);
  await login(page, 'DRIVER', raw.DRIVER_OTHER);
  await page.goto(`/driver/deliveries/${own.deliveryId}`);
  await expect(page.getByText(own.address, { exact: true }).first()).toBeVisible();
  const refresh = page.waitForResponse((x) => new URL(x.url()).pathname === '/api/auth/refresh');
  await page.reload();
  expect((await refresh).status()).toBe(200);
  await expect(page.getByText(own.address, { exact: true }).first()).toBeVisible();
  await assertNoStoredSecrets(context, page);
  await logout(page);
  await login(page, 'DRIVER');
  await page.goto(`/driver/deliveries/${other.deliveryId}`);
  await expect(page.getByText(other.address, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(own.address, { exact: true })).toHaveCount(0);
  await page.goto(`/driver/deliveries/${own.deliveryId}`);
  await expect(
    page.getByRole('heading', { name: 'Không tìm thấy thông tin', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(own.address, { exact: true })).toHaveCount(0);
  await logout(page);
  await login(page, 'CUSTOMER', own.user);
  await page.goto('/driver/dashboard');
  await expect(page).toHaveURL(/\/403$/);
  await logout(page);
  await login(page, 'RESTAURANT');
  await page.goto('/driver/deliveries');
  await expect(page).toHaveURL(/\/403$/);
  proof.push({
    scenario: 'session-owner-isolation',
    driverId: a.account.driverId,
    protectedOrderId: own.order.orderId,
    protectedDeliveryId: own.deliveryId,
  });
});

for (const width of [375, 768, 1024, 1440])
  test(`driver responsive real pages and unobstructed mobile navigation ${width}px`, async ({
    page,
  }) => {
    const user = {
      email: 'driver-' + randomUUID() + '@phase6.test',
      password: randomBytes(24).toString('base64url'),
    };
    const identity = await admin.mutate(
      'POST',
      '/api/drivers',
      {
        ...user,
        name: width === 375 ? 'T'.repeat(100) : 'Tài xế QA ' + width,
        phoneNumber: '0901234567',
        address: 'QA driver fixture',
        licensePlate: 'QA-06',
        driveStatus: true,
      },
      z.object({ driverId: z.number(), role: z.literal('DRIVER') }),
      201,
    );
    const api = await actor(user),
      trip = await prepare();
    await accept(api, trip.deliveryId);
    const past = await prepare();
    await accept(api, past.deliveryId);
    for (const value of ['PICKED_UP', 'DELIVERING', 'DELIVERED'] as const)
      await status(api, past.deliveryId, value);
    await page.setViewportSize({ width, height: 1000 });
    await login(page, 'DRIVER', user);
    for (const [path, heading] of [
      ['dashboard', 'Chào mừng tài xế'],
      ['deliveries', 'Chuyến giao của bạn'],
      [`deliveries/${trip.deliveryId}`, `Chuyến giao #${trip.deliveryId}`],
      ['available', 'Chuyến có thể nhận'],
      ['history', 'Lịch sử giao hàng'],
      ['profile', 'Hồ sơ tài xế'],
      ['analytics', 'Thống kê chuyến giao'],
    ]) {
      await page.goto('/driver/' + path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('status', { name: 'Đang tải nội dung' })).toHaveCount(0);
      await noHorizontalOverflow(page);
      if (path === 'profile' && width <= 768) {
        const save = page.getByRole('button', { name: 'Lưu hồ sơ tài xế', exact: true });
        await save.scrollIntoViewIfNeeded();
        const box = await save.boundingBox(),
          nav = await page
            .getByRole('navigation', { name: 'Điều hướng nhanh tài xế' })
            .boundingBox();
        expect(box && nav && box.y + box.height <= nav.y).toBe(true);
      }
      if (width <= 768) {
        const nav = page.getByRole('navigation', { name: 'Điều hướng nhanh tài xế' });
        await expect(nav).toBeVisible();
        expect(await nav.getByRole('link').count()).toBe(4);
      }
      if (process.env.FOOD_E2E_SCREENSHOT_DIR)
        await capture(
          page,
          process.env.FOOD_E2E_SCREENSHOT_DIR,
          `driver-${path.replaceAll('/', '-')}-${width}`,
        );
    }
    await page.goto(`/driver/deliveries/${trip.deliveryId}`);
    await page.getByRole('button', { name: 'Xác nhận đã lấy hàng', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await noHorizontalOverflow(page);
    if (process.env.FOOD_E2E_SCREENSHOT_DIR)
      await capture(page, process.env.FOOD_E2E_SCREENSHOT_DIR, `driver-confirm-${width}`, {
        fullPage: false,
      });
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Xác nhận đã lấy hàng', exact: true }),
    ).toBeFocused();
    proof.push({
      scenario: 'responsive',
      width,
      driverId: identity.driverId,
      orderId: past.order.orderId,
      deliveryId: past.deliveryId,
    });
  });
