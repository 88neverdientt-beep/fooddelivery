import { test, expect } from '@playwright/test';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { ApiActor, freshCustomer, responseData, stage4, orderSchema } from './customer-helpers';
import { login, assertNoStoredSecrets, capture, fixtures } from './helpers';

const profile = z.object({
  customerId: z.number(),
  name: z.string(),
  phoneNumber: z.string(),
  address: z.string(),
  version: z.number().int().nonnegative(),
});

test('full audit fractional menu cart and checkout display the exact server amounts', async ({
  page,
  request,
  baseURL,
}) => {
  const admin = await ApiActor.login(request, fixtures.ADMIN);
  const customer = await freshCustomer(baseURL!);
  const suffix = randomUUID();
  try {
    const browserErrors: string[] = [];
    page.on('pageerror', () => browserErrors.push('pageerror'));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      let path = '';
      try {
        path = new URL(message.location().url).pathname;
      } catch {
        /* No sensitive text retained. */
      }
      if (!(path === '/api/auth/refresh' && /401/.test(message.text())))
        browserErrors.push('unexpected-console');
    });
    const restaurant = await admin.mutate(
      'POST',
      '/api/restaurants',
      {
        name: `Fractional audit ${suffix}`,
        email: `money-${suffix}@full-audit.test`,
        password: randomUUID() + '-audit-test',
        phoneNumber: '0900000044',
        address: 'Isolated fractional checkout fixture',
        restaurantStatus: true,
      },
      z.object({ restaurantId: z.number().int().positive() }),
      201,
    );
    const food = await admin.mutate(
      'POST',
      '/api/food-items',
      { name: `Fractional food ${suffix}`, category: 'Audit', description: 'Decimal fixture' },
      z.object({ itemId: z.number().int().positive() }),
      201,
    );
    const menu = await admin.mutate(
      'POST',
      '/api/restaurant-food-items',
      {
        restaurantId: restaurant.restaurantId,
        foodItemId: food.itemId,
        price: 25000.25,
        isAvailable: true,
      },
      z.object({ restaurantFoodItemId: z.number().int().positive() }),
      201,
    );
    await login(page, 'CUSTOMER', customer.user);
    await page.goto(`/restaurants/${restaurant.restaurantId}/food/${menu.restaurantFoodItemId}`);
    await expect(page.locator('.customer-food-detail-price')).toHaveText(/25\.000,25/);
    await customer.actor.add(menu.restaurantFoodItemId, 3);
    await page.goto('/customer/cart');
    await expect(
      page.getByRole('heading', { name: 'Giỏ hàng của bạn', exact: true }),
    ).toBeVisible();
    await expect(page.locator('dd').filter({ hasText: '75.000,75' })).toHaveCount(1);
    await expect(page.locator('dd').filter({ hasText: '90.000,75' })).toHaveCount(1);
    if (process.env.FOOD_E2E_SCREENSHOT_DIR)
      await capture(page, process.env.FOOD_E2E_SCREENSHOT_DIR, 'fractional-cart-amounts');
    await page.goto('/customer/checkout');
    await page.getByLabel('Địa chỉ giao hàng', { exact: true }).fill('Fractional audit delivery');
    await expect(page.getByRole('radio', { name: /COD/ })).toBeChecked();
    const submitted = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname ===
          `/api/customers/${customer.actor.account.customerId}/orders`,
    );
    await page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true }).click();
    const order = await responseData(await submitted, orderSchema, 201);
    expect(order.subtotal).toBe(75000.75);
    expect(order.shippingFee).toBe(15000);
    expect(order.totalAmount).toBe(90000.75);
    expect(order.paymentResponseDTO?.amount).toBe(90000.75);
    expect(order.orderDetails[0].unitPrice).toBe(25000.25);
    expect(order.orderDetails[0].subtotalItem).toBe(75000.75);
    await expect(
      page.getByRole('heading', { name: `Đơn hàng #${order.orderId}`, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/90\.000,75/).first()).toBeVisible();
    expect((await customer.actor.order(order.orderId)).totalAmount).toBe(90000.75);
    expect((await customer.actor.cart()).cartItems).toHaveLength(0);
    expect(browserErrors).toEqual([]);
  } finally {
    await customer.actor.close();
  }
});

test('phase8 concurrent cart additions preserve both quantities and one menu row', async ({
  baseURL,
}) => {
  const customer = await freshCustomer(baseURL!);
  try {
    const path = `/api/${customer.actor.account.customerId}/cart-items`;
    const responses = await Promise.all([
      customer.actor.response('POST', path, { restaurantFoodItemId: stage4.menuId, quantity: 1 }),
      customer.actor.response('POST', path, { restaurantFoodItemId: stage4.menuId, quantity: 1 }),
    ]);
    expect(responses.map((response) => response.status())).toEqual([201, 201]);
    const cart = await customer.actor.cart();
    expect(cart.cartItems).toHaveLength(1);
    expect(cart.cartItems[0].quantity).toBe(2);
    expect(cart.subtotal).toBe(cart.cartItems[0].unitPrice * 2);
    expect(cart.totalAmount).toBe(cart.subtotal + cart.shippingFee);
  } finally {
    await customer.actor.close();
  }
});

test('phase8 strict profile preconditions reject missing and stale revisions without writes', async ({
  baseURL,
}) => {
  const customer = await freshCustomer(baseURL!);
  try {
    const path = `/api/customers/${customer.actor.account.customerId}`;
    const original = await customer.actor.read(path, profile);
    const body = {
      name: original.name,
      address: original.address,
      phoneNumber: original.phoneNumber,
    };
    expect((await customer.actor.response('PUT', path, body)).status()).toBe(428);
    expect(
      (await customer.actor.response('PUT', path, { ...body, expectedVersion: -1 })).status(),
    ).toBe(400);
    expect(await customer.actor.read(path, profile)).toEqual(original);
    const saved = await responseData(
      await customer.actor.response('PUT', path, {
        ...body,
        address: 'Stage8 committed revision change',
        expectedVersion: original.version,
      }),
      profile,
    );
    expect(saved.version).toBe(original.version + 1);
    expect(
      (
        await customer.actor.response('PUT', path, { ...body, expectedVersion: original.version })
      ).status(),
    ).toBe(409);
    expect(await customer.actor.read(path, profile)).toEqual(saved);
  } finally {
    await customer.actor.close();
  }
});

test('phase8 browser preserves a stale customer draft after actual ABA and never retries PUT', async ({
  page,
  context,
  baseURL,
}) => {
  const customer = await freshCustomer(baseURL!);
  try {
    const browserErrors: string[] = [];
    page.on('pageerror', () => browserErrors.push('pageerror'));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      let path = '';
      try {
        path = new URL(message.location().url).pathname;
      } catch {
        /* No sensitive text retained. */
      }
      const expectedAuth = path === '/api/auth/refresh' && /401/.test(message.text());
      const expectedConflict =
        path === `/api/customers/${customer.actor.account.customerId}` &&
        /409/.test(message.text());
      if (!expectedAuth && !expectedConflict) browserErrors.push('unexpected-console');
    });
    await login(page, 'CUSTOMER', customer.user);
    await page.goto('/customer/profile');
    await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).click();
    await page.getByLabel('Địa chỉ', { exact: true }).fill('Stage8 unsaved stale draft');
    const path = `/api/customers/${customer.actor.account.customerId}`;
    const a = await customer.actor.read(path, profile);
    const body = { name: a.name, phoneNumber: a.phoneNumber, address: a.address };
    const b = await responseData(
      await customer.actor.response('PUT', path, {
        ...body,
        address: 'Stage8 intermediate B',
        expectedVersion: a.version,
      }),
      profile,
    );
    const again = await responseData(
      await customer.actor.response('PUT', path, { ...body, expectedVersion: b.version }),
      profile,
    );
    expect(again.version).toBe(a.version + 2);
    let requests = 0;
    page.on('request', (request) => {
      if (request.method() === 'PUT' && new URL(request.url()).pathname === path) requests++;
    });
    const rejected = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' && new URL(response.url()).pathname === path,
    );
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    expect((await rejected).status()).toBe(409);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Địa chỉ', { exact: true })).toHaveValue(
      'Stage8 unsaved stale draft',
    );
    expect(await customer.actor.read(path, profile)).toEqual(again);
    await assertNoStoredSecrets(context, page);
    if (process.env.FOOD_E2E_SCREENSHOT_DIR)
      await capture(page, process.env.FOOD_E2E_SCREENSHOT_DIR, 'phase8-stale-aba-draft');
    await page.reload();
    await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).click();
    await expect(page.getByLabel('Địa chỉ', { exact: true })).toHaveValue(a.address);
    expect(requests).toBe(1);
    expect(browserErrors).toEqual([]);
  } finally {
    await customer.actor.close();
  }
});

test('phase8 malformed HTTP requests preserve 400 405 406 415 without invoking business writers', async ({
  request,
  baseURL,
}) => {
  const customer = await freshCustomer(baseURL!);
  try {
    const path = `/api/cart/${customer.actor.account.customerId}`;
    expect((await customer.actor.response('PUT', path, {})).status()).toBe(405);
    const unsupported = await customer.actor.response('PUT', path, {});
    expect(unsupported.headers().allow).toContain('GET');
    const csrfResponse = await request.get('/api/auth/csrf');
    const csrf = z
      .object({ headerName: z.string(), token: z.string() })
      .parse(await csrfResponse.json());
    const badType = await request.post('/api/auth/login', {
      data: 'private-input',
      headers: { [csrf.headerName]: csrf.token, 'Content-Type': 'text/plain' },
    });
    expect(badType.status()).toBe(415);
    expect(await badType.text()).not.toContain('private-input');
    expect((await request.get('/api/restaurants/search?size=51')).status()).toBe(400);
    expect(
      (
        await request.get('/api/restaurants/search', { headers: { Accept: 'application/xml' } })
      ).status(),
    ).toBe(406);
    expect((await customer.actor.cart()).cartItems).toHaveLength(0);
  } finally {
    await customer.actor.close();
  }
});
