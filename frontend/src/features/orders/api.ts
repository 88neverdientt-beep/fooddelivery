import { z } from 'zod';
import { ApiError, type Transport } from '@/lib/api/http';
import { http, session } from '@/lib/runtime';
import {
  addressSchema,
  orderPageSchema,
  orderSchema,
  paymentSchema,
  type OrderStatus,
} from './model';

const read = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(502, 'CONTRACT');
  return result.data;
};
export const orderKeys = {
  all: (accountId: number) => ['customer', accountId, 'orders'] as const,
  list: (accountId: number) => [...orderKeys.all(accountId), 'list'] as const,
  page: (accountId: number, page: number, status: string) =>
    [...orderKeys.list(accountId), page, status] as const,
  detail: (accountId: number, orderId: number | null) =>
    [...orderKeys.all(accountId), 'detail', orderId] as const,
};
export function createOrdersApi(transport: Transport) {
  const page = async (
    customerId: number,
    options: { page: number; size: number; status?: OrderStatus },
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams({ page: String(options.page), size: String(options.size) });
    if (options.status) query.set('status', options.status);
    return read(
      orderPageSchema,
      await transport(`/customers/${customerId}/orders/page?${query}`, { signal }),
    );
  };
  const latest = async (customerId: number, signal?: AbortSignal) =>
    (await page(customerId, { page: 0, size: 50 }, signal)).items;
  return {
    page,
    latest,
    // Kept as a bounded latest-page adapter for checkout reconciliation, never an all-orders fetch.
    list: latest,
    detail: async (orderId: number, signal?: AbortSignal) =>
      read(orderSchema, await transport(`/orders/${orderId}`, { signal })),
    cancel: async (orderId: number) =>
      read(orderSchema, await transport(`/orders/${orderId}/cancel`, { method: 'PATCH' })),
    updateAddress: async (orderId: number, deliveryAddress: string) =>
      read(
        orderSchema,
        await transport(`/orders/${orderId}/delivery-address`, {
          method: 'PUT',
          body: addressSchema.parse({ deliveryAddress }),
        }),
      ),
    payment: async (orderId: number, signal?: AbortSignal) =>
      read(paymentSchema, await transport(`/payments/orders/${orderId}`, { signal })),
  };
}
export const ordersApi = createOrdersApi((path, options) => session.request(http, path, options));
