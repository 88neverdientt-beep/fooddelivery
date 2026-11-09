import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
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
} from './helpers';
import {
  ApiActor,
  freshCustomer,
  responseData,
  orderSchema,
  ratingSchema,
  stage4,
} from './customer-helpers';

const credentials = z
  .object({ OTHER_RESTAURANT: z.object({ email: z.string(), password: z.string() }) })
  .parse(JSON.parse(readFileSync(process.env.FOOD_E2E_CREDENTIAL_FILE!, 'utf8')));
const menuSchema = z.object({
  restaurantFoodItemId: z.number(),
  price: z.number(),
  isAvailable: z.boolean(),
  foodItem: z.object({ itemId: z.number(), name: z.string() }),
  restaurant: z.object({ restaurantId: z.number() }),
});
const profileSchema = z.object({
  restaurantId: z.number(),
  name: z.string(),
  address: z.string(),
  phoneNumber: z.string(),
  restaurantStatus: z.boolean(),
});
const analyticsSchema = z.object({
  totalOrders: z.number(),
  paidOrderCount: z.number(),
  paidFoodValue: z.number(),
  paidShipping: z.number(),
  ratingsCount: z.number(),
});
let restaurant: ApiActor, other: ApiActor, admin: ApiActor, driver: ApiActor;
let base: string, catalog: { itemId: number; name: string };
const proof: object[] = [];
const customerActors: ApiActor[] = [];
async function createFood() {
  return admin.mutate(
    'POST',
    '/api/food-items',
    {
      name: 'Stage5 QA ' + randomUUID().slice(0, 8),
      category: 'Com',
      description: 'Isolated restaurant acceptance fixture',
    },
    z.object({ itemId: z.number(), name: z.string() }),
    201,
  );
}
async function newMenu(price = 25000) {
  const food = await createFood();
  return restaurant.mutate(
    'POST',
    '/api/restaurant-food-items',
    {
      restaurantId: restaurant.account.restaurantId,
      foodItemId: food.itemId,
      price,
      isAvailable: true,
    },
    menuSchema,
    201,
  );
}
async function customerOrder(menuId: number) {
  const customer = await freshCustomer(base);
  customerActors.push(customer.actor);
  await customer.actor.add(menuId);
  return { ...customer, order: await customer.actor.checkout(customer.address) };
}
async function saveMenu(page: Page, id: number, price: string) {
  await page.getByLabel('Giá bán (VND)', { exact: true }).fill(price);
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname === `/api/restaurant-food-items/${id}`,
  );
  await page.getByRole('button', { name: 'Lưu thay đổi món', exact: true }).click();
  return responseData(await response, menuSchema);
}
async function transition(page: Page, label: string, orderId: number, state: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'PATCH' &&
      new URL(r.url()).pathname === `/api/orders/${orderId}/status`,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận trạng thái', exact: true })
    .click();
  expect((await responseData(await response, orderSchema)).orderStatus).toBe(state);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
test.beforeAll(async ({ baseURL }) => {
  if (!baseURL || new URL(baseURL).hostname !== 'localhost')
    throw new Error('Isolated localhost target required');
  base = baseURL;
  const actor = async (user: typeof fixtures.CUSTOMER) =>
    ApiActor.login(await request.newContext({ baseURL: base }), user);
  restaurant = await actor(credentials.OTHER_RESTAURANT);
  other = await actor(fixtures.RESTAURANT);
  admin = await actor(fixtures.ADMIN);
  driver = await actor(fixtures.DRIVER);
  expect(restaurant.account.restaurantId).toBe(stage4.otherRestaurantId);
  catalog = await createFood();
});
test.afterAll(async () => {
  for (const actor of [restaurant, other, admin, driver, ...customerActors])
    if (actor) await actor.close();
  const directory = process.env.FOOD_E2E_DIAGNOSTIC_DIR || 'test-results/diagnostics';
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'phase5-server-proof.json'), JSON.stringify(proof, null, 2));
});

test('restaurant profile validation, real save and account cache isolation', async ({
  page,
  context,
}) => {
  await login(page, 'RESTAURANT', credentials.OTHER_RESTAURANT);
  await page.goto('/restaurant/profile');
  await page.getByLabel('Tên nhà hàng', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Lưu thông tin nhà hàng', exact: true }).click();
  await expect(page.getByText('Nhập tên nhà hàng.', { exact: true })).toBeVisible();
  const name = 'Nhà hàng kiểm chứng ' + randomUUID().slice(0, 8);
  await page.getByLabel('Tên nhà hàng', { exact: true }).fill(name);
  await page.getByLabel('Số điện thoại nhà hàng', { exact: true }).fill('0901234567');
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname === `/api/restaurants/${restaurant.account.restaurantId}`,
  );
  await page.getByRole('button', { name: 'Lưu thông tin nhà hàng', exact: true }).click();
  expect((await responseData(await response, profileSchema)).name).toBe(name);
  await expect(
    page.getByRole('button', { name: 'Lưu thông tin nhà hàng', exact: true }),
  ).toBeEnabled();
  await assertNoStoredSecrets(context, page);
  expect(
    (await restaurant.read('/api/restaurant-management/profile', profileSchema)).phoneNumber,
  ).toBe('0901234567');
  await logout(page);
  await login(page, 'RESTAURANT');
  await page.goto('/restaurant/profile');
  await expect(page.getByLabel('Tên nhà hàng', { exact: true })).toHaveValue(stage4.restaurantName);
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  proof.push({
    scenario: 'profile-and-cache',
    restaurantId: restaurant.account.restaurantId,
    privateDataAbsentAfterAccountSwitch: true,
  });
});

test('restaurant catalog add, validation, availability, edit and delete through UI', async ({
  page,
}) => {
  await login(page, 'RESTAURANT', credentials.OTHER_RESTAURANT);
  await page.goto('/restaurant/menu/new');
  await page.getByLabel('Tìm trong catalog', { exact: true }).fill(catalog.name);
  await page.getByRole('button', { name: 'Tìm catalog', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn ' + catalog.name, exact: true }).click();
  await page.getByLabel('Giá bán (VND)', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Thêm món vào thực đơn', exact: true }).click();
  await expect(page.getByText(/Giá tối đa 10 chữ số nguyên/)).toBeVisible();
  await page.getByLabel('Giá bán (VND)', { exact: true }).fill('25000.50');
  const added = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/restaurant-food-items',
  );
  await page.getByRole('button', { name: 'Thêm món vào thực đơn', exact: true }).click();
  const item = await responseData(await added, menuSchema, 201);
  expect(item.price).toBe(25000.5);
  expect(item.restaurant.restaurantId).toBe(restaurant.account.restaurantId);
  await expect(
    page.getByText(new RegExp('Đã lưu món #' + item.restaurantFoodItemId)),
  ).toBeVisible();
  await page.goto(`/restaurant/menu/${item.restaurantFoodItemId}/edit`);
  expect((await saveMenu(page, item.restaurantFoodItemId, '28000.75')).price).toBe(28000.75);
  await expect(
    page.getByText(new RegExp('Đã lưu món #' + item.restaurantFoodItemId)),
  ).toBeVisible();
  await page.goto('/restaurant/menu?q=' + encodeURIComponent(catalog.name));
  const toggled = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname === `/api/restaurant-food-items/${item.restaurantFoodItemId}`,
  );
  await page.getByRole('button', { name: 'Ngừng bán ' + catalog.name, exact: true }).click();
  expect((await responseData(await toggled, menuSchema)).isAvailable).toBe(false);
  await expect(
    page.getByRole('button', { name: 'Bật bán ' + catalog.name, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Xóa ' + catalog.name, exact: true }).click();
  const removed = page.waitForResponse(
    (r) =>
      r.request().method() === 'DELETE' &&
      new URL(r.url()).pathname === `/api/restaurant-food-items/${item.restaurantFoodItemId}`,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận xóa món', exact: true })
    .click();
  expect((await removed).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Chưa có món phù hợp', exact: true }),
  ).toBeVisible();
  proof.push({
    scenario: 'menu-crud-real-http',
    menuId: item.restaurantFoodItemId,
    deletedUnreferencedMenuOnly: true,
  });
});

test('restaurant order lifecycle, customer synchronization, reviews and exact analytics', async ({
  page,
}) => {
  const item = await newMenu();
  const customer = await customerOrder(item.restaurantFoodItemId);
  const before = await restaurant.read('/api/restaurant-management/analytics', analyticsSchema);
  await login(page, 'RESTAURANT', credentials.OTHER_RESTAURANT);
  await page.goto(`/restaurant/orders/${customer.order.orderId}`);
  await expect(
    page.getByRole('heading', { name: `Đơn hàng #${customer.order.orderId}`, exact: true }),
  ).toBeVisible();
  await transition(page, 'Xác nhận đơn', customer.order.orderId, 'CONFIRMED');
  expect((await customer.actor.order(customer.order.orderId)).orderStatus).toBe('CONFIRMED');
  await transition(page, 'Bắt đầu chuẩn bị', customer.order.orderId, 'PREPARING');
  await transition(page, 'Sẵn sàng giao', customer.order.orderId, 'READY');
  const ready = await customer.actor.order(customer.order.orderId);
  const deliveryId = ready.deliveryOutputDTO!.deliveryId;
  await driver.mutate(
    'POST',
    `/api/deliveries/${deliveryId}/accept`,
    { driverId: driver.account.driverId },
    z.object({ deliveryId: z.number() }),
  );
  for (const state of ['PICKED_UP', 'DELIVERING', 'DELIVERED'])
    await driver.mutate(
      'PUT',
      `/api/deliveries/${deliveryId}/status`,
      state,
      z.object({ deliveryStatus: z.literal(state) }),
    );
  const completed = await customer.actor.order(ready.orderId);
  expect(completed.orderStatus).toBe('COMPLETED');
  expect(completed.paymentResponseDTO!.paymentStatus).toBe('SUCCESS');
  const comment = 'Đánh giá thật Stage5 ' + randomUUID().slice(0, 8);
  await customer.actor.mutate(
    'POST',
    `/api/restaurants/${restaurant.account.restaurantId}/ratings`,
    { customerId: customer.actor.account.customerId, ratingScore: 5, comment },
    ratingSchema,
    201,
  );
  await page.goto('/restaurant/reviews');
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  expect(await page.getByRole('button', { name: /Sửa đánh giá|Xóa đánh giá/ }).count()).toBe(0);
  const after = await restaurant.read('/api/restaurant-management/analytics', analyticsSchema);
  expect(after.paidFoodValue - before.paidFoodValue).toBe(completed.subtotal);
  expect(after.paidShipping - before.paidShipping).toBe(completed.shippingFee);
  expect(after.paidOrderCount - before.paidOrderCount).toBe(1);
  expect(after.ratingsCount - before.ratingsCount).toBe(1);
  await page.goto('/restaurant/analytics');
  await expect(page.getByText(/Chưa đối soát, không phải tiền thực nhận/)).toBeVisible();
  const changed = await restaurant.mutate(
    'PUT',
    `/api/restaurant-food-items/${item.restaurantFoodItemId}`,
    { price: 29000, isAvailable: true, expectedPrice: item.price, expectedIsAvailable: true },
    menuSchema,
  );
  expect(changed.price).toBe(29000);
  expect((await customer.actor.order(ready.orderId)).orderDetails[0].unitPrice).toBe(25000);
  expect(
    (
      await restaurant.response('DELETE', `/api/restaurant-food-items/${item.restaurantFoodItemId}`)
    ).status(),
  ).toBe(409);
  const rejected = await customerOrder(item.restaurantFoodItemId);
  await page.goto('/restaurant/orders?q=' + rejected.order.orderId);
  await expect(
    page.getByRole('link', { name: `Xem đơn #${rejected.order.orderId}`, exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: `Xem đơn #${rejected.order.orderId}`, exact: true }).click();
  await page.getByRole('button', { name: 'Từ chối / hủy đơn', exact: true }).click();
  const rejectResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'PATCH' &&
      new URL(r.url()).pathname === `/api/orders/${rejected.order.orderId}/cancel`,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận hủy của nhà hàng', exact: true })
    .click();
  expect((await responseData(await rejectResponse, orderSchema)).orderStatus).toBe('CANCELLED');
  expect(
    (await rejected.actor.order(rejected.order.orderId)).paymentResponseDTO!.paymentStatus,
  ).toBe('CANCELLED');
  proof.push({
    scenario: 'completed-cod-and-analytics',
    orderId: ready.orderId,
    menuId: item.restaurantFoodItemId,
    subtotal: completed.subtotal,
    shipping: completed.shippingFee,
    foodDelta: after.paidFoodValue - before.paidFoodValue,
    oldOrderPrice: 25000,
    restaurantCancelledOrderId: rejected.order.orderId,
  });
});

test('restaurant ownership, simultaneous updates, confirmations and cancellation races', async () => {
  const item = await newMenu();
  const order = await customerOrder(item.restaurantFoodItemId);
  for (const [method, path, body] of [
    ['GET', `/api/orders/${order.order.orderId}`, undefined],
    ['PATCH', `/api/orders/${order.order.orderId}/status`, 'CONFIRMED'],
    [
      'PUT',
      `/api/restaurant-food-items/${item.restaurantFoodItemId}`,
      { price: 1, isAvailable: true },
    ],
    [
      'PUT',
      `/api/restaurants/${restaurant.account.restaurantId}`,
      { name: 'forged', address: 'forged', phoneNumber: '0', restaurantStatus: true },
    ],
  ] as const)
    expect((await other.response(method, path, body)).status()).toBe(404);
  expect(
    (await restaurant.response('POST', '/api/food-items', { name: 'forbidden' })).status(),
  ).toBe(403);
  expect(
    (
      await restaurant.response('POST', '/api/restaurant-food-items', {
        restaurantId: other.account.restaurantId,
        foodItemId: item.foodItem.itemId,
        price: 1,
        isAvailable: true,
      })
    ).status(),
  ).toBe(404);
  for (const path of ['/profile', '/catalog', '/orders', '/analytics'])
    expect((await order.actor.response('GET', '/api/restaurant-management' + path)).status()).toBe(
      403,
    );
  const body = { price: 26000, isAvailable: true, expectedPrice: 25000, expectedIsAvailable: true };
  const updates = await Promise.all([
    restaurant.response('PUT', `/api/restaurant-food-items/${item.restaurantFoodItemId}`, body),
    restaurant.response('PUT', `/api/restaurant-food-items/${item.restaurantFoodItemId}`, {
      ...body,
      price: 27000,
    }),
  ]);
  expect(updates.map((r) => r.status()).sort()).toEqual([200, 409]);
  const confirmations = await Promise.all(
    [1, 2].map(() =>
      restaurant.response('PATCH', `/api/orders/${order.order.orderId}/status`, 'CONFIRMED'),
    ),
  );
  expect(confirmations.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect(
    (
      await restaurant.response('PATCH', `/api/orders/${order.order.orderId}/status`, 'COMPLETED')
    ).status(),
  ).toBe(409);
  const race = await customerOrder(item.restaurantFoodItemId);
  const results = await Promise.all([
    restaurant.response('PATCH', `/api/orders/${race.order.orderId}/status`, 'CONFIRMED'),
    race.actor.response('PATCH', `/api/orders/${race.order.orderId}/cancel`),
  ]);
  expect(results.every((r) => [200, 409].includes(r.status()))).toBe(true);
  const cancelled = await race.actor.order(race.order.orderId);
  expect(cancelled.orderStatus).toBe('CANCELLED');
  expect(cancelled.paymentResponseDTO!.paymentStatus).toBe('CANCELLED');
  const pending = await freshCustomer(base);
  customerActors.push(pending.actor);
  await pending.actor.add(item.restaurantFoodItemId);
  const latest = await restaurant.read(
    `/api/restaurant-food-items/${item.restaurantFoodItemId}`,
    menuSchema,
  );
  const pricing = await Promise.all([
    restaurant.response('PUT', `/api/restaurant-food-items/${item.restaurantFoodItemId}`, {
      price: 30000,
      isAvailable: true,
      expectedPrice: latest.price,
      expectedIsAvailable: true,
    }),
    pending.actor.response('POST', `/api/customers/${pending.actor.account.customerId}/orders`, {
      deliveryAddress: pending.address,
      paymentMethodId: stage4.codPaymentMethodId,
    }),
  ]);
  expect(pricing.map((r) => r.status())).toEqual([200, 201]);
  const pricedOrder = await responseData(pricing[1], orderSchema, 201);
  expect([latest.price, 30000]).toContain(pricedOrder.orderDetails[0].unitPrice);
  expect(pricedOrder.subtotal).toBe(pricedOrder.orderDetails[0].unitPrice);
  expect(pricedOrder.totalAmount).toBe(pricedOrder.subtotal + pricedOrder.shippingFee);
  await pending.actor.add(item.restaurantFoodItemId);
  await restaurant.mutate(
    'PUT',
    `/api/restaurant-food-items/${item.restaurantFoodItemId}`,
    { price: 30000, isAvailable: false, expectedPrice: 30000, expectedIsAvailable: true },
    menuSchema,
  );
  expect(
    (
      await pending.actor.response(
        'POST',
        `/api/customers/${pending.actor.account.customerId}/orders`,
        { deliveryAddress: pending.address, paymentMethodId: stage4.codPaymentMethodId },
      )
    ).status(),
  ).toBe(409);
  expect((await pending.actor.cart()).cartItems).toHaveLength(1);
  proof.push({
    scenario: 'ownership-and-concurrency',
    menuId: item.restaurantFoodItemId,
    updateStatuses: updates.map((r) => r.status()),
    confirmationStatuses: confirmations.map((r) => r.status()),
    cancelledOrderId: race.order.orderId,
    checkoutUnavailable: 409,
    concurrentPricingOrderId: pricedOrder.orderId,
  });
});

test('restaurant two tabs preserve stale drafts until explicit rebase', async ({
  page,
  context,
}) => {
  const item = await newMenu();
  await login(page, 'RESTAURANT', credentials.OTHER_RESTAURANT);
  await page.goto(`/restaurant/menu/${item.restaurantFoodItemId}/edit`);
  await expect(page.getByLabel('Giá bán (VND)', { exact: true })).toHaveValue('25000');
  const second = await context.newPage();
  await second.goto(`/restaurant/menu/${item.restaurantFoodItemId}/edit`);
  await second.getByLabel('Giá bán (VND)', { exact: true }).fill('28000');
  await saveMenu(page, item.restaurantFoodItemId, '27000');
  // The stale write must be rejected, then recovery refetches the committed value.
  await second.bringToFront();
  const conflict = second.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname === `/api/restaurant-food-items/${item.restaurantFoodItemId}`,
  );
  await second.getByRole('button', { name: 'Lưu thay đổi món', exact: true }).click();
  expect((await conflict).status()).toBe(409);
  await expect(second.getByText(/Dữ liệu máy chủ đã thay đổi/)).toBeVisible();
  await expect(second.getByLabel('Giá bán (VND)', { exact: true })).toHaveValue('28000');
  await expect(
    second.getByRole('button', { name: 'Lưu thay đổi món', exact: true }),
  ).toBeDisabled();
  await second.getByRole('button', { name: 'Dùng bản mới', exact: true }).click();
  await second
    .getByRole('dialog')
    .getByRole('button', { name: 'Dùng bản mới', exact: true })
    .click();
  await expect(second.getByLabel('Giá bán (VND)', { exact: true })).toHaveValue('27000');
  await second.close();
  proof.push({
    scenario: 'two-tab-stale-draft',
    menuId: item.restaurantFoodItemId,
    overwritten: false,
  });
});

test('restaurant network failure after commit refetches without repeating mutation', async ({
  page,
}) => {
  const item = await newMenu();
  await login(page, 'RESTAURANT', credentials.OTHER_RESTAURANT);
  await page.goto(`/restaurant/menu/${item.restaurantFoodItemId}/edit`);
  await expect(page.getByLabel('Giá bán (VND)', { exact: true })).toHaveValue('25000');
  let writes = 0;
  await page.route(`**/api/restaurant-food-items/${item.restaurantFoodItemId}`, async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    writes++;
    const response = await route.fetch({ maxRetries: 0 });
    expect(response.status()).toBe(200);
    await route.abort('internetdisconnected');
  });
  await page.getByLabel('Giá bán (VND)', { exact: true }).fill('31000');
  await page.getByRole('button', { name: 'Lưu thay đổi món', exact: true }).click();
  await expect(page.getByText(/Dữ liệu máy chủ đã thay đổi/)).toBeVisible();
  expect(
    (await restaurant.read(`/api/restaurant-food-items/${item.restaurantFoodItemId}`, menuSchema))
      .price,
  ).toBe(31000);
  expect(writes).toBe(1);
  await page.unrouteAll({ behavior: 'wait' });
  proof.push({
    scenario: 'lost-response-after-commit',
    menuId: item.restaurantFoodItemId,
    price: 31000,
    mutationRequests: writes,
  });
});

for (const width of [375, 768, 1024, 1440])
  test(`restaurant responsive real pages ${width}px`, async ({ page }) => {
    const item = await newMenu();
    const order = await customerOrder(item.restaurantFoodItemId);
    await page.setViewportSize({ width, height: 1000 });
    await login(page, 'RESTAURANT', credentials.OTHER_RESTAURANT);
    const routes = [
      ['dashboard', 'Chào mừng nhà hàng'],
      ['profile', 'Thông tin nhà hàng'],
      ['menu', 'Thực đơn nhà hàng'],
      ['menu/new', 'Thêm món từ catalog'],
      [`menu/${item.restaurantFoodItemId}/edit`, 'Chỉnh sửa món ăn'],
      ['orders', 'Đơn hàng nhà hàng'],
      [`orders/${order.order.orderId}`, `Đơn hàng #${order.order.orderId}`],
      ['reviews', 'Đánh giá của khách hàng'],
      ['analytics', 'Thống kê nhà hàng'],
    ];
    for (const [path, heading] of routes) {
      await page.goto('/restaurant/' + path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.locator('.skeleton:visible')).toHaveCount(0);
      await noHorizontalOverflow(page);
      if (process.env.FOOD_E2E_SCREENSHOT_DIR)
        await capture(
          page,
          process.env.FOOD_E2E_SCREENSHOT_DIR,
          `restaurant-${path.replaceAll('/', '-')}-${width}`,
        );
    }
  });
