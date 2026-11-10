import { z } from 'zod';
import { http, session } from '@/lib/runtime';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import { accountSchema, type Account } from '@/types/domain';
import { customerSchema } from '@/features/customer/api';
import { profileSchema as driverSchema } from '@/features/driver-management/model';
import { orderSchema, paymentSchema } from '@/features/orders/model';

type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
export const adminKey = (accountId: number) => ['admin-management', accountId] as const;
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export function createAdminExistingApi(request: Request, identity: () => Account | null) {
  async function read<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) {
    const actor = identity();
    if (actor?.role !== 'ADMIN') throw new ApiError(403, 'IDENTITY');
    const value = await request(path, { signal });
    if (identity()?.accountId !== actor.accountId || identity()?.role !== 'ADMIN')
      throw new DOMException('Account changed', 'AbortError');
    const result = schema.safeParse(value);
    if (!result.success) throw new ApiError(502, 'CONTRACT');
    return result.data;
  }
  return {
    me: async (signal?: AbortSignal) => {
      const value = await read('/auth/me', accountSchema, signal);
      if (value.accountId !== identity()?.accountId || value.role !== 'ADMIN')
        throw new ApiError(502, 'CONTRACT');
      return value;
    },
    customer: async (customerId: number, signal?: AbortSignal) => {
      const value = await read(`/customers/${id.parse(customerId)}`, customerSchema, signal);
      if (value.customerId !== customerId) throw new ApiError(502, 'CONTRACT');
      return value;
    },
    driver: async (driverId: number, signal?: AbortSignal) => {
      const value = await read(`/drivers/${id.parse(driverId)}`, driverSchema, signal);
      if (value.driverId !== driverId) throw new ApiError(502, 'CONTRACT');
      return value;
    },
    order: async (orderId: number, signal?: AbortSignal) => {
      const value = await read(`/orders/${id.parse(orderId)}`, orderSchema, signal);
      if (value.orderId !== orderId) throw new ApiError(502, 'CONTRACT');
      return value;
    },
    payment: (orderId: number, signal?: AbortSignal) =>
      read(`/payments/orders/${id.parse(orderId)}`, paymentSchema, signal),
  };
}
export const adminExistingApi = createAdminExistingApi(
  (path, options) => session.request(http, path, options),
  () => session.getSnapshot().account,
);
