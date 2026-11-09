import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { request, expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { z } from 'zod';
import { fixtures, type Credential } from './helpers';

const id = z.number().int().positive().safe();
const stage4Schema = z.object({
  restaurantId: id,
  otherRestaurantId: id,
  closedRestaurantId: id,
  menuId: id,
  secondMenuId: id,
  unavailableMenuId: id,
  otherMenuId: id,
  closedMenuId: id,
  codPaymentMethodId: id,
  restaurantName: z.string(),
  foodName: z.string(),
  secondFoodName: z.string(),
  customerId: id,
  otherCustomerId: id,
});
const fixturePath = process.env.FOOD_E2E_CREDENTIAL_FILE;
if (!fixturePath) throw new Error('External isolated-test credentials are required.');
export const stage4 = stage4Schema.parse(
  (JSON.parse(readFileSync(fixturePath, 'utf8')) as { stage4: unknown }).stage4,
);
const accountSchema = z.object({
  accountId: id,
  role: z.enum(['CUSTOMER', 'RESTAURANT', 'DRIVER', 'ADMIN']),
  status: z.literal('ACTIVE'),
  customerId: id.nullable(),
  restaurantId: id.nullable(),
  driverId: id.nullable(),
});
const cartItemSchema = z.object({
  cartItemId: id,
  restaurantFoodItemId: id,
  foodItemName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});
export const cartSchema = z.object({
  restaurant: z.object({ restaurantId: id, name: z.string() }).nullable().optional(),
  cartItems: z.array(cartItemSchema),
  subtotal: z.number().nonnegative(),
  shippingFee: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
});
export const orderSchema = z.object({
  orderId: id,
  orderStatus: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'DELIVERING',
    'COMPLETED',
    'CANCELLED',
  ]),
  deliveryAddress: z.string(),
  subtotal: z.number().nonnegative(),
  shippingFee: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  createdAt: z.string(),
  customer: z.object({ customerId: id, name: z.string() }),
  restaurant: z.object({ restaurantId: id, name: z.string() }),
  orderDetails: z.array(
    z.object({
      quantity: z.number().int().positive(),
      unitPrice: z.number(),
      subtotalItem: z.number(),
    }),
  ),
  deliveryOutputDTO: z
    .object({
      deliveryId: id,
      deliveryStatus: z.string(),
      pickupTime: z.string().nullable(),
      deliveredTime: z.string().nullable(),
    })
    .nullable()
    .optional(),
  paymentResponseDTO: z
    .object({
      paymentId: id,
      paymentMethod: z.string(),
      paymentStatus: z.string(),
      amount: z.number(),
      paidAt: z.string().nullable(),
    })
    .nullable(),
});
export type RealOrder = z.infer<typeof orderSchema>;
export const ratingSchema = z.object({
  ratingId: id,
  ratingScore: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  customerOutputDTO: z.object({ customerId: id, name: z.string() }),
});
export const methodsSchema = z.array(
  z.object({
    paymentMethodId: id,
    paymentMethodCode: z.literal('COD'),
    paymentMethodName: z.string(),
  }),
);
export const profileSchema = z.object({
  customerId: id,
  name: z.string(),
  phoneNumber: z.string(),
  address: z.string(),
});
const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    size: z.number().int(),
    totalElements: z.number().int(),
    totalPages: z.number().int(),
  });
export const orderPageSchema = pageOf(orderSchema);
export const ratingPageSchema = pageOf(ratingSchema);

function checked<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Error('Unexpected real API response shape; sensitive payload suppressed.');
  return result.data;
}
export async function responseData<T>(
  response: Pick<APIResponse, 'status' | 'json'>,
  schema: z.ZodType<T>,
  status = 200,
): Promise<T> {
  expect(response.status(), 'Real backend HTTP status').toBe(status);
  return checked(z.object({ data: schema }), (await response.json()) as unknown).data;
}

export class ApiActor {
  private constructor(
    private context: APIRequestContext,
    private token: string,
    readonly account: z.infer<typeof accountSchema>,
  ) {}
  static async login(context: APIRequestContext, user: Credential) {
    const csrfResponse = await context.get('/api/auth/csrf');
    expect(csrfResponse.status()).toBe(200);
    const csrf = checked(
      z.object({ headerName: z.literal('X-XSRF-TOKEN'), token: z.string() }),
      (await csrfResponse.json()) as unknown,
    );
    const response = await context.post('/api/auth/login', {
      data: JSON.stringify(user),
      headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
    });
    const auth = await responseData(
      response,
      z.object({ accessToken: z.string(), account: accountSchema }),
    );
    const actor = new ApiActor(context, auth.accessToken, auth.account);
    const verified = await actor.read('/api/auth/me', accountSchema);
    expect(verified.accountId).toBe(auth.account.accountId);
    return actor;
  }
  async response(method: string, path: string, body?: unknown) {
    return this.context.fetch(path, {
      method,
      headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { data: JSON.stringify(body) }),
      maxRetries: 0,
    });
  }
  async read<T>(path: string, schema: z.ZodType<T>) {
    return responseData(await this.response('GET', path), schema);
  }
  async mutate<T>(method: string, path: string, body: unknown, schema: z.ZodType<T>, status = 200) {
    return responseData(await this.response(method, path, body), schema, status);
  }
  async cart() {
    return this.read(`/api/cart/${this.account.customerId}`, cartSchema);
  }
  async orders() {
    return this.read(
      `/api/customers/${this.account.customerId}/orders/page?size=50`,
      orderPageSchema,
    );
  }
  async order(orderId: number) {
    return this.read(`/api/orders/${orderId}`, orderSchema);
  }
  async add(menuId: number, quantity = 1) {
    return this.mutate(
      'POST',
      `/api/${this.account.customerId}/cart-items`,
      { restaurantFoodItemId: menuId, quantity },
      cartItemSchema,
      201,
    );
  }
  async checkout(address: string) {
    const methods = await this.read('/api/payment-methods', methodsSchema);
    expect(methods.length).toBe(1);
    return this.mutate(
      'POST',
      `/api/customers/${this.account.customerId}/orders`,
      { deliveryAddress: address, paymentMethodId: methods[0].paymentMethodId },
      orderSchema,
      201,
    );
  }
  async close() {
    await this.context.dispose();
  }
}

export async function freshCustomer(baseURL: string) {
  const context = await request.newContext({ baseURL });
  const user = {
    email: randomUUID() + '@phase4-browser.test',
    password: randomBytes(24).toString('base64url'),
  };
  const name = 'Khách hàng kiểm thử ' + randomUUID().slice(0, 8);
  const address = 'Địa chỉ thử nghiệm độc lập ' + randomUUID().slice(0, 8);
  try {
    const csrf = checked(
      z.object({ headerName: z.literal('X-XSRF-TOKEN'), token: z.string() }),
      (await (await context.get('/api/auth/csrf')).json()) as unknown,
    );
    await responseData(
      await context.post('/api/auth/register/customer', {
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        data: JSON.stringify({ ...user, name, address, phoneNumber: '0900000044' }),
      }),
      accountSchema,
      201,
    );
    const actor = await ApiActor.login(context, user);
    expect(actor.account.role).toBe('CUSTOMER');
    expect((await actor.cart()).cartItems).toHaveLength(0);
    return { actor, user, name, address };
  } catch (error) {
    await context.dispose();
    throw error;
  }
}

const actors = new Map<string, Promise<ApiActor>>();
export async function roleActor(baseURL: string, role: 'RESTAURANT' | 'DRIVER') {
  if (!actors.has(role))
    actors.set(
      role,
      (async () => {
        const context = await request.newContext({ baseURL });
        try {
          const actor = await ApiActor.login(context, fixtures[role]);
          expect(actor.account.role).toBe(role);
          return actor;
        } catch (error) {
          await context.dispose();
          throw error;
        }
      })(),
    );
  return actors.get(role)!;
}
export async function closeRoleActors() {
  for (const actor of actors.values()) await (await actor).close();
  actors.clear();
}
export async function restaurantStatus(
  baseURL: string,
  orderId: number,
  status: 'CONFIRMED' | 'PREPARING' | 'READY',
) {
  const actor = await roleActor(baseURL, 'RESTAURANT');
  expect(actor.account.restaurantId).toBe(stage4.restaurantId);
  return actor.mutate('PATCH', `/api/orders/${orderId}/status`, status, orderSchema);
}
export async function completeOrder(baseURL: string, customer: ApiActor, orderId: number) {
  let order = await customer.order(orderId);
  if (order.orderStatus === 'PENDING')
    order = await restaurantStatus(baseURL, orderId, 'CONFIRMED');
  if (order.orderStatus === 'CONFIRMED')
    order = await restaurantStatus(baseURL, orderId, 'PREPARING');
  if (order.orderStatus === 'PREPARING') order = await restaurantStatus(baseURL, orderId, 'READY');
  expect(order.orderStatus).toBe('READY');
  const deliveryId = order.deliveryOutputDTO?.deliveryId;
  expect(deliveryId).toBeTruthy();
  const driver = await roleActor(baseURL, 'DRIVER');
  expect(driver.account.driverId).not.toBeNull();
  await driver.mutate(
    'POST',
    `/api/deliveries/${deliveryId}/accept`,
    { driverId: driver.account.driverId },
    z.object({ deliveryId: id }),
  );
  for (const state of ['PICKED_UP', 'DELIVERING', 'DELIVERED'])
    await driver.mutate(
      'PUT',
      `/api/deliveries/${deliveryId}/status`,
      state,
      z.object({ deliveryStatus: z.literal(state) }),
    );
  const result = await customer.order(orderId);
  expect(result.orderStatus).toBe('COMPLETED');
  expect(result.deliveryOutputDTO?.deliveryStatus).toBe('DELIVERED');
  expect(result.paymentResponseDTO?.paymentStatus).toBe('SUCCESS');
  expect(result.paymentResponseDTO?.amount).toBe(result.totalAmount);
  expect(result.deliveryOutputDTO?.pickupTime).toBeTruthy();
  expect(result.deliveryOutputDTO?.deliveredTime).toBeTruthy();
  expect(result.paymentResponseDTO?.paidAt).toBeTruthy();
  return result;
}

export function customerProof(name: string, value: { [key: string]: number | string | boolean }) {
  const directory = process.env.FOOD_E2E_DIAGNOSTIC_DIR || 'test-results/diagnostics';
  mkdirSync(directory, { recursive: true });
  const path = join(directory, 'phase4-customer-server-proof.json');
  const records = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as unknown[]) : [];
  records.push({ scenario: name, ...value });
  writeFileSync(path, JSON.stringify(records, null, 2));
}
