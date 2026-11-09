import { expect, type Page, type Response } from '@playwright/test';
import { test } from './fixtures';
import {
  login,
  logout,
  fillSecret,
  capture,
  noHorizontalOverflow,
  assertNoStoredSecrets,
} from './helpers';
import {
  freshCustomer,
  closeRoleActors,
  completeOrder,
  restaurantStatus,
  customerProof,
  stage4,
  responseData,
  orderSchema,
  ratingSchema,
  ratingPageSchema,
  profileSchema,
  type ApiActor,
  type RealOrder,
} from './customer-helpers';

function localBaseURL(value: string | undefined) {
  if (!value || new URL(value).hostname !== 'localhost')
    throw new Error('Customer E2E requires the isolated localhost frontend.');
  return value;
}
const foodPath = (menuId = stage4.menuId, restaurantId = stage4.restaurantId) =>
  `/restaurants/${restaurantId}/food/${menuId}`;
const isCheckout = (response: Response) =>
  response.request().method() === 'POST' &&
  /^\/api\/customers\/\d+\/orders$/.test(new URL(response.url()).pathname);
const evidence = process.env.FOOD_E2E_SCREENSHOT_DIR;
const note = (message: string) => 'Kiểm chứng Giai đoạn 4: ' + message;

async function openCart(page: Page) {
  await page.goto('/customer/cart');
  await expect(page.getByRole('heading', { name: 'Giỏ hàng của bạn', exact: true })).toBeVisible();
}
async function addThroughFoodPage(page: Page, quantity = 1) {
  await page.goto(foodPath());
  await expect(page.getByRole('heading', { name: stage4.foodName, exact: true })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Số lượng', exact: true }).fill(String(quantity));
  const added = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /^\/api\/\d+\/cart-items$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }).click();
  expect((await added).status()).toBe(201);
}
async function checkoutThroughPage(page: Page, address: string, doubleClick = false) {
  await page.goto('/customer/checkout');
  await expect(page.getByRole('heading', { name: 'Xác nhận đơn hàng', exact: true })).toBeVisible();
  await page.getByLabel('Địa chỉ giao hàng', { exact: true }).fill(address);
  await expect(page.getByRole('radio', { name: /COD/ })).toBeChecked();
  const response = page.waitForResponse(isCheckout);
  const submit = page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true });
  if (doubleClick) {
    // Two synchronous clicks exercise the mutation lock before React can disable the button.
    await submit.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
  } else await submit.click();
  const order = await responseData(await response, orderSchema, 201);
  await expect(page).toHaveURL(new RegExp(`/customer/orders/${order.orderId}$`));
  await expect(
    page.getByRole('heading', { name: `Đơn hàng #${order.orderId}`, exact: true }),
  ).toBeVisible();
  return order;
}
async function updateAddress(page: Page, address: string) {
  await page.getByRole('button', { name: 'Đổi địa chỉ', exact: true }).click();
  await page.getByLabel('Địa chỉ giao hàng mới', { exact: true }).fill(address);
  await page.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Xác nhận đổi địa chỉ', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(address, { exact: true })).toBeVisible();
}
async function assertStoredOrder(customer: ApiActor, expected: RealOrder) {
  const actual = await customer.order(expected.orderId);
  expect(actual.customer.customerId).toBe(customer.account.customerId);
  expect(actual.totalAmount).toBe(actual.subtotal + actual.shippingFee);
  expect(actual.paymentResponseDTO?.amount).toBe(actual.totalAmount);
  expect(actual.orderDetails.reduce((sum, item) => sum + item.subtotalItem, 0)).toBe(
    actual.subtotal,
  );
  expect(actual.orderId).toBe(expected.orderId);
  return actual;
}

test.afterAll(async () => {
  await closeRoleActors();
});

test('customer real COD ordering, address changes, cancellation, completion, ratings and profile remain consistent', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120000);
  const base = localBaseURL(baseURL),
    customer = await freshCustomer(base);
  try {
    await login(page, 'CUSTOMER', customer.user);
    await page.goto('/restaurants?q=' + encodeURIComponent(stage4.restaurantName));
    const restaurant = page.locator('.restaurant-card').filter({ hasText: stage4.restaurantName });
    await expect(restaurant).toHaveCount(1);
    await restaurant.click();
    await expect(
      page.getByRole('heading', { name: stage4.restaurantName, exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: `Xem món ${stage4.foodName}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(foodPath() + '$'));
    await addThroughFoodPage(page);
    await openCart(page);
    const quantity = page.getByRole('spinbutton', {
      name: `Số lượng ${stage4.foodName}`,
      exact: true,
    });
    await expect(quantity).toHaveValue('1');
    await page
      .getByRole('button', { name: `Tăng số lượng ${stage4.foodName}`, exact: true })
      .click();
    await expect(quantity).toHaveValue('2');
    expect((await customer.actor.cart()).cartItems[0].quantity).toBe(2);
    await page
      .getByRole('button', { name: `Giảm số lượng ${stage4.foodName}`, exact: true })
      .click();
    await expect(quantity).toHaveValue('1');
    expect((await customer.actor.cart()).cartItems[0].quantity).toBe(1);
    await page
      .getByRole('button', { name: `Xóa ${stage4.foodName} khỏi giỏ`, exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Giỏ hàng đang chờ một món ngon', exact: true }),
    ).toBeVisible();
    expect((await customer.actor.cart()).cartItems).toHaveLength(0);
    await addThroughFoodPage(page, 2);
    const quoted = await customer.actor.cart();
    let posts = 0;
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        /^\/api\/customers\/\d+\/orders$/.test(new URL(request.url()).pathname)
      )
        posts++;
    });
    const first = await checkoutThroughPage(page, customer.address, true);
    expect(posts).toBe(1);
    expect(first.totalAmount).toBe(quoted.totalAmount);
    expect(first.shippingFee).toBe(quoted.shippingFee);
    expect((await customer.actor.cart()).cartItems).toHaveLength(0);
    await assertStoredOrder(customer.actor, first);
    const changedAddress = note('địa chỉ mới trước xác nhận');
    await updateAddress(page, changedAddress);
    expect((await customer.actor.order(first.orderId)).deliveryAddress).toBe(changedAddress);
    await page.reload();
    await expect(page.getByText(changedAddress, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Xác nhận hủy đơn', exact: true })
      .click();
    await expect(page.getByText('Đã hủy', { exact: true }).first()).toBeVisible();
    const cancelled = await customer.actor.order(first.orderId);
    expect(cancelled.orderStatus).toBe('CANCELLED');
    expect(cancelled.paymentResponseDTO?.paymentStatus).toBe('CANCELLED');

    await addThroughFoodPage(page);
    const second = await checkoutThroughPage(page, customer.address, true);
    expect(posts).toBe(2);
    await restaurantStatus(base, second.orderId, 'CONFIRMED');
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await expect(page.getByText('Nhà hàng đã xác nhận', { exact: true }).first()).toBeVisible();
    await updateAddress(page, note('địa chỉ hợp lệ khi CONFIRMED'));
    await restaurantStatus(base, second.orderId, 'PREPARING');
    await restaurantStatus(base, second.orderId, 'READY');
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await expect(page.getByText('Sẵn sàng giao', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hủy đơn hàng', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Đổi địa chỉ', exact: true })).toHaveCount(0);
    expect(
      (await customer.actor.response('PATCH', `/api/orders/${second.orderId}/cancel`)).status(),
    ).toBe(409);
    expect(
      (
        await customer.actor.response('PUT', `/api/orders/${second.orderId}/delivery-address`, {
          deliveryAddress: note('bị khóa'),
        })
      ).status(),
    ).toBe(409);
    const completed = await completeOrder(base, customer.actor, second.orderId);
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await expect(page.getByText('Đã hoàn thành', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tiến trình đơn hàng' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: 'Viết đánh giá', exact: true })).toBeVisible();
    await page.goto('/customer/orders');
    await page.getByLabel('Lọc trạng thái đơn', { exact: true }).selectOption('COMPLETED');
    await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toHaveCount(1);
    await page.getByRole('link', { name: 'Xem chi tiết', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/customer/orders/${second.orderId}$`));
    await page.getByRole('link', { name: 'Viết đánh giá', exact: true }).click();
    const comment =
      '<img src=x onerror="window.phase4Xss=true"> ' + note('món ngon, giao đúng đơn');
    const create = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/restaurants/${stage4.restaurantId}/ratings`,
    );
    await page.getByRole('radio', { name: '4 sao', exact: true }).check();
    await page.getByLabel(/^Nhận xét của bạn/).fill(comment);
    await page.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click();
    const rating = await responseData(await create, ratingSchema, 201);
    await expect(page.getByText(comment, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => Object.hasOwn(window, 'phase4Xss'))).toBe(false);
    await expect(page.locator('.rating-comment img')).toHaveCount(0);
    const review = page.locator('.rating-card').filter({ hasText: comment });
    await review.getByRole('button', { name: 'Sửa đánh giá', exact: true }).click();
    const edit = page.locator('.rating-card').filter({
      has: page.getByRole('heading', { name: 'Chỉnh sửa đánh giá của bạn', exact: true }),
    });
    await edit.getByRole('radio', { name: '5 sao', exact: true }).check();
    const updatedComment = note('đánh giá đã chỉnh sửa');
    await edit.getByLabel(/^Nhận xét của bạn/).fill(updatedComment);
    await edit.getByRole('button', { name: 'Lưu đánh giá', exact: true }).click();
    await expect(page.getByText(updatedComment, { exact: true })).toBeVisible();
    await page.goto('/customer/ratings');
    await page.getByRole('button', { name: stage4.restaurantName, exact: true }).click();
    const own = page.getByRole('region', { name: 'Đánh giá của tôi theo nhà hàng', exact: true });
    await expect(own.getByText(updatedComment, { exact: true })).toBeVisible();
    const deleted = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname ===
          `/api/ratings/${rating.ratingId}/customers/${customer.actor.account.customerId}`,
    );
    await own.getByRole('button', { name: 'Xóa đánh giá', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Xác nhận xóa đánh giá', exact: true })
      .click();
    expect((await deleted).status()).toBe(200);
    await expect(own.getByText(updatedComment, { exact: true })).toHaveCount(0);
    const ownRatings = await customer.actor.read(
      `/api/restaurants/${stage4.restaurantId}/ratings/page?mine=true&size=50`,
      ratingPageSchema,
    );
    expect(ownRatings.items.some((value) => value.ratingId === rating.ratingId)).toBe(false);

    await page.goto('/customer/profile');
    await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }).click();
    await page.getByLabel('Họ và tên', { exact: true }).fill('Khách hàng đã cập nhật');
    await page.getByLabel('Số điện thoại', { exact: true }).fill('0900000099');
    await page.getByLabel('Địa chỉ', { exact: true }).fill(note('hồ sơ mới'));
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        new URL(response.url()).pathname === `/api/customers/${customer.actor.account.customerId}`,
    );
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    const profileResponse = await saved;
    expect(profileResponse.status()).toBe(200);
    expect(
      Object.keys(profileResponse.request().postDataJSON() as Record<string, unknown>).sort(),
    ).toEqual(['address', 'name', 'phoneNumber']);
    const profile = await customer.actor.read(
      `/api/customers/${customer.actor.account.customerId}`,
      profileSchema,
    );
    expect(profile.name).toBe('Khách hàng đã cập nhật');
    expect(profile.address).toBe(note('hồ sơ mới'));
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Khách hàng đã cập nhật', exact: true }),
    ).toBeVisible();
    await assertNoStoredSecrets(context, page);
    await logout(page);
    await expect(page.locator('body')).not.toContainText(note('hồ sơ mới'));
    const another = await freshCustomer(base);
    try {
      await login(page, 'CUSTOMER', another.user);
      await openCart(page);
      await expect(
        page.getByRole('heading', { name: 'Giỏ hàng đang chờ một món ngon', exact: true }),
      ).toBeVisible();
      await page.goto('/customer/orders');
      await expect(
        page.getByRole('heading', { name: 'Bạn chưa có đơn hàng', exact: true }),
      ).toBeVisible();
      await expect(page.locator('body')).not.toContainText(`ĐƠN HÀNG #${second.orderId}`);
      await logout(page);
    } finally {
      await another.actor.close();
    }
    customerProof('main-customer-lifecycle', {
      orderId: completed.orderId,
      cancelledOrderId: cancelled.orderId,
      ratingId: rating.ratingId,
      checkoutRequests: posts,
      orderStatus: completed.orderStatus,
      deliveryStatus: completed.deliveryOutputDTO!.deliveryStatus,
      paymentStatus: completed.paymentResponseDTO!.paymentStatus,
      amount: completed.totalAmount,
      profileVerified: true,
    });
  } finally {
    await customer.actor.close();
  }
});

test('customer ownership is enforced by real APIs and URL changes without cross-account cache leaks', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  const base = localBaseURL(baseURL),
    a = await freshCustomer(base),
    b = await freshCustomer(base);
  try {
    await b.actor.add(stage4.menuId);
    const order = await b.actor.checkout(b.address);
    await completeOrder(base, b.actor, order.orderId);
    const rating = await b.actor.mutate(
      'POST',
      `/api/restaurants/${stage4.restaurantId}/ratings`,
      {
        customerId: b.actor.account.customerId,
        ratingScore: 5,
        comment: note('đánh giá sở hữu của khách B'),
      },
      ratingSchema,
      201,
    );
    const item = await b.actor.add(stage4.menuId);
    const beforeCart = await b.actor.cart();
    const beforeOrder = await b.actor.order(order.orderId);
    await login(page, 'CUSTOMER', a.user);
    const denied = [
      ['GET', `/api/cart/${b.actor.account.customerId}`, undefined],
      [
        'POST',
        `/api/${b.actor.account.customerId}/cart-items`,
        { restaurantFoodItemId: stage4.menuId, quantity: 1 },
      ],
      ['PUT', `/api/cart-items/${item.cartItemId}`, { quantity: 9 }],
      ['DELETE', `/api/cart-items/${item.cartItemId}`, undefined],
      ['GET', `/api/orders/${order.orderId}`, undefined],
      ['GET', `/api/customers/${b.actor.account.customerId}/orders/page`, undefined],
      ['PATCH', `/api/orders/${order.orderId}/cancel`, undefined],
      [
        'PUT',
        `/api/orders/${order.orderId}/delivery-address`,
        { deliveryAddress: note('không được ghi') },
      ],
      [
        'PUT',
        `/api/ratings/${rating.ratingId}/customers/${a.actor.account.customerId}`,
        { ratingScore: 1, comment: 'forbidden' },
      ],
      [
        'DELETE',
        `/api/ratings/${rating.ratingId}/customers/${a.actor.account.customerId}`,
        undefined,
      ],
    ] as const;
    for (const [method, path, payload] of denied)
      expect((await a.actor.response(method, path, payload)).status()).toBe(404);
    expect(
      (
        await a.actor.response('PATCH', `/api/orders/${order.orderId}/status`, 'CONFIRMED')
      ).status(),
    ).toBe(403);
    expect(
      (
        await a.actor.response('POST', `/api/${a.actor.account.customerId}/cart-items`, {
          restaurantFoodItemId: stage4.menuId,
          quantity: 1,
          unitPrice: 1,
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await a.actor.response('POST', `/api/customers/${a.actor.account.customerId}/orders`, {
          deliveryAddress: a.address,
          paymentMethodId: stage4.codPaymentMethodId,
          accountId: b.actor.account.accountId,
          totalAmount: 1,
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await a.actor.response('POST', '/api/auth/login', {
          email: a.user.email,
          password: a.user.password,
        })
      ).status(),
    ).toBe(403);
    const mine = await a.actor.read(
      `/api/restaurants/${stage4.restaurantId}/ratings/page?mine=true&customerId=${b.actor.account.customerId}`,
      ratingPageSchema,
    );
    expect(mine.items).toHaveLength(0);
    expect(await b.actor.cart()).toEqual(beforeCart);
    expect(await b.actor.order(order.orderId)).toEqual(beforeOrder);
    await page.goto(`/customer/orders/${order.orderId}`);
    await expect(
      page.getByRole('heading', { name: 'Không tìm thấy thông tin', exact: true }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText(b.address);
    await logout(page);
    await login(page, 'CUSTOMER', b.user);
    await openCart(page);
    await expect(
      page.getByRole('spinbutton', { name: `Số lượng ${stage4.foodName}`, exact: true }),
    ).toHaveValue('1');
    await logout(page);
    customerProof('ownership-and-tamper', {
      protectedOrderId: order.orderId,
      protectedCartItemId: item.cartItemId,
      protectedRatingId: rating.ratingId,
      deniedOwnershipRequests: denied.length,
      forgedPriceRejected: true,
      forgedIdentityRejected: true,
      missingCsrfRejected: true,
      persistentStateUnchanged: true,
    });
  } finally {
    await a.actor.close();
    await b.actor.close();
  }
});

test('customer menu availability, single-restaurant cart and guest login return follow real rules', async ({
  page,
  baseURL,
}) => {
  const base = localBaseURL(baseURL),
    customer = await freshCustomer(base);
  try {
    await page.goto(foodPath());
    await page.getByRole('link', { name: 'Đăng nhập để thêm món', exact: true }).click();
    await fillSecret(page, 'Email', customer.user.email);
    await fillSecret(page, 'Mật khẩu', customer.user.password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(foodPath() + '$'));
    await addThroughFoodPage(page);
    const cart = await customer.actor.cart();
    await page.goto(foodPath(stage4.otherMenuId, stage4.otherRestaurantId));
    await expect(page.getByRole('link', { name: 'Xem giỏ hiện tại', exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }),
    ).toBeDisabled();
    expect(await customer.actor.cart()).toEqual(cart);
    for (const [menu, expected] of [
      [stage4.unavailableMenuId, 409],
      [stage4.closedMenuId, 409],
      [stage4.otherMenuId, 400],
    ] as const)
      expect(
        (
          await customer.actor.response(
            'POST',
            `/api/${customer.actor.account.customerId}/cart-items`,
            { restaurantFoodItemId: menu, quantity: 1 },
          )
        ).status(),
      ).toBe(expected);
    for (const quantity of [0, -1, 2147483648])
      expect(
        (
          await customer.actor.response(
            'POST',
            `/api/${customer.actor.account.customerId}/cart-items`,
            { restaurantFoodItemId: stage4.menuId, quantity },
          )
        ).status(),
      ).toBe(400);
    await page.goto(foodPath(stage4.unavailableMenuId));
    await expect(
      page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }),
    ).toBeDisabled();
    expect(await customer.actor.cart()).toEqual(cart);
    await logout(page);
    customerProof('availability-and-restaurant-scope', {
      restaurantId: stage4.restaurantId,
      mixedRestaurantRejected: true,
      unavailableRejected: true,
      closedRestaurantRejected: true,
      invalidQuantitiesRejected: true,
      cartPreserved: true,
      loginReturnVerified: true,
    });
  } finally {
    await customer.actor.close();
  }
});

test('customer checkout network failure after real server commit reconciles without reposting', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  const base = localBaseURL(baseURL),
    customer = await freshCustomer(base);
  let committedOrderId = 0,
    posts = 0,
    blockReconciliation = false;
  try {
    await customer.actor.add(stage4.menuId);
    await login(page, 'CUSTOMER', customer.user);
    const orderPath = `/api/customers/${customer.actor.account.customerId}/orders`;
    await page.route('**' + orderPath + '/page**', async (route) => {
      if (blockReconciliation) await route.abort('internetdisconnected');
      else await route.continue();
    });
    await page.route('**' + orderPath, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      posts++;
      const response = await route.fetch({ maxRetries: 0 });
      const order = await responseData(response, orderSchema, 201);
      committedOrderId = order.orderId;
      blockReconciliation = true;
      await route.abort('internetdisconnected');
    });
    await page.goto('/customer/checkout');
    await page.getByLabel('Địa chỉ giao hàng', { exact: true }).fill(customer.address);
    await page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true }).click();
    await expect(
      page.getByText('Kết quả đặt hàng đang được xác minh', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Xác nhận đặt hàng COD', exact: true }),
    ).toHaveCount(0);
    expect(committedOrderId).toBeGreaterThan(0);
    expect((await customer.actor.orders()).items).toHaveLength(1);
    expect((await customer.actor.cart()).cartItems).toHaveLength(0);
    blockReconciliation = false;
    const recover = page.getByRole('button', { name: 'Kiểm tra trên máy chủ', exact: true });
    await expect(recover).toBeEnabled();
    await recover.click();
    await expect(page).toHaveURL(new RegExp(`/customer/orders/${committedOrderId}$`));
    await page.reload();
    await expect(
      page.getByRole('heading', { name: `Đơn hàng #${committedOrderId}`, exact: true }),
    ).toBeVisible();
    expect(posts).toBe(1);
    expect((await customer.actor.orders()).totalElements).toBe(1);
    await logout(page);
    customerProof('committed-checkout-response-loss', {
      orderId: committedOrderId,
      checkoutPostCount: posts,
      persistedOrders: 1,
      realServerCommitConfirmed: true,
      automaticPostRetryAbsent: true,
      manualReadRecoveryVerified: true,
    });
  } finally {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await customer.actor.close();
  }
});

for (const width of [375, 768, 1024, 1440])
  test(`customer complete ordering screens remain usable at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120000);
    const base = localBaseURL(baseURL),
      customer = await freshCustomer(base);
    try {
      await customer.actor.add(stage4.menuId, 2);
      await page.setViewportSize({ width, height: 1000 });
      await login(page, 'CUSTOMER', customer.user);
      const screenshot = async (name: string) => {
        await noHorizontalOverflow(page);
        if (evidence) await capture(page, evidence, `phase4-${width}-${name}`);
      };
      await page.goto('/');
      await expect(page.locator('.restaurant-card').first()).toBeVisible();
      await screenshot('home');
      await page.goto('/restaurants?q=' + encodeURIComponent(stage4.restaurantName));
      await expect(page.locator('.restaurant-card')).toHaveCount(1);
      await screenshot('restaurants');
      await page.goto(`/restaurants/${stage4.restaurantId}`);
      await expect(page.getByRole('heading', { name: stage4.foodName, exact: true })).toBeVisible();
      await screenshot('restaurant-detail');
      await page.goto(foodPath());
      await expect(
        page.getByRole('button', { name: 'Thêm vào giỏ hàng', exact: true }),
      ).toBeEnabled();
      await screenshot('food-detail');
      await openCart(page);
      await expect(
        page.getByRole('spinbutton', { name: `Số lượng ${stage4.foodName}`, exact: true }),
      ).toHaveValue('2');
      await screenshot('cart');
      await page.goto('/customer/checkout');
      await expect(page.getByLabel('Địa chỉ giao hàng', { exact: true })).toHaveValue(
        customer.address,
      );
      await expect(page.getByRole('radio', { name: /COD/ })).toBeChecked();
      await screenshot('checkout');
      const order = await checkoutThroughPage(page, customer.address);
      const complete = await completeOrder(base, customer.actor, order.orderId);
      await page.goto('/customer/orders');
      await expect(page.getByRole('link', { name: 'Xem chi tiết', exact: true })).toHaveCount(1);
      await screenshot('orders');
      await page.getByRole('link', { name: 'Xem chi tiết', exact: true }).click();
      await expect(page.getByRole('link', { name: 'Viết đánh giá', exact: true })).toBeVisible();
      await screenshot('order-detail');
      await page.getByRole('link', { name: 'Viết đánh giá', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Gửi đánh giá', exact: true })).toBeVisible();
      await screenshot('rating');
      await page.goto('/customer/profile');
      await expect(
        page.getByRole('button', { name: 'Chỉnh sửa hồ sơ', exact: true }),
      ).toBeVisible();
      await screenshot('profile');
      await logout(page);
      customerProof('responsive-' + width, {
        orderId: complete.orderId,
        width,
        requiredScreens: 10,
        orderStatus: complete.orderStatus,
        deliveryStatus: complete.deliveryOutputDTO!.deliveryStatus,
        paymentStatus: complete.paymentResponseDTO!.paymentStatus,
        noHorizontalOverflow: true,
      });
    } finally {
      await customer.actor.close();
    }
  });
