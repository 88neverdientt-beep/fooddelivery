import { z } from 'zod';
import { http, session } from '@/lib/runtime';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import type { Account } from '@/types/domain';
import { apiQuery } from '@/features/public/model';
import { profileInput as restaurantInput } from '@/features/restaurant-management/model';
import {
  profileInput as driverInput,
  profileSchema as driverProfile,
} from '@/features/driver-management/model';
import {
  accountRowSchema,
  customerRowSchema,
  restaurantRowSchema,
  restaurantDetailSchema,
  driverRowSchema,
  orderRowSchema,
  deliveryRowSchema,
  deliveryDetailSchema,
  paymentRowSchema,
  reviewRowSchema,
  analyticsSchema,
  pageSchema,
  managedAccountSchema,
  id,
  type Filters,
  createProfileSchema,
  createRestaurantSchema,
  type CreateProfileInput,
} from './model';
type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
export function createAdminApi(request: Request, identity: () => Account | null) {
  function actor() {
    const value = identity();
    if (value?.role !== 'ADMIN') throw new ApiError(403, 'IDENTITY');
    return value;
  }
  async function read<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) {
    const own = actor();
    const raw = await request(path, { signal });
    if (actor().accountId !== own.accountId)
      throw new DOMException('Account changed', 'AbortError');
    const result = schema.safeParse(raw);
    if (!result.success) throw new ApiError(502, 'CONTRACT');
    return result.data;
  }
  function list<T extends z.ZodType>(module: string, item: T) {
    return (filters: Filters = {}, signal?: AbortSignal) =>
      read(
        `/admin-management/${module}?${apiQuery({ page: 0, size: 20, ...filters })}`,
        pageSchema(item),
        signal,
      );
  }
  return {
    createProfile: async (kind: 'RESTAURANT' | 'DRIVER', input: CreateProfileInput) => {
      actor();
      const value = (kind === 'RESTAURANT' ? createRestaurantSchema : createProfileSchema).parse(
        input,
      );
      if (kind === 'DRIVER' && value.name.length > 100) throw new ApiError(400, 'VALIDATION');
      const email = value.email.toLowerCase();
      const body = {
        name: value.name,
        email,
        password: value.password,
        phoneNumber: value.phoneNumber,
        address: value.address,
        ...(kind === 'RESTAURANT'
          ? { restaurantStatus: value.activity === 'true' }
          : { licensePlate: value.licensePlate, driveStatus: value.activity === 'true' }),
      };
      const raw = await request(kind === 'RESTAURANT' ? '/restaurants' : '/drivers', {
        method: 'POST',
        body,
      });
      const result = managedAccountSchema.safeParse(raw);
      if (
        !result.success ||
        result.data.role !== kind ||
        result.data.status !== 'ACTIVE' ||
        result.data.email !== email
      )
        throw new ApiError(502, 'CONTRACT');
      return result.data;
    },
    accounts: list('accounts', accountRowSchema),
    customers: list('customers', customerRowSchema),
    restaurants: list('restaurants', restaurantRowSchema),
    exportOrders: async (
      filters: Record<string, string | number | boolean | undefined> = {},
      signal?: AbortSignal,
    ) => {
      const owner = actor().accountId;
      const selected = Object.fromEntries(
        Object.entries(filters).filter(([key]) =>
          [
            'q',
            'sort',
            'status',
            'from',
            'to',
            'paymentStatus',
            'restaurantId',
            'customerId',
          ].includes(key),
        ),
      );
      const result = await request(`/admin-management/orders/export.xlsx?${apiQuery(selected)}`, {
        signal,
        responseType: 'blob',
      });
      if (actor().accountId !== owner) throw new DOMException('Account changed', 'AbortError');
      if (
        !(result instanceof Blob) ||
        !result.type.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      )
        throw new ApiError(502, 'CONTRACT');
      return result;
    },
    exportRestaurants: async (filters: Filters = {}, signal?: AbortSignal) => {
      const owner = actor();
      const selected = Object.fromEntries(
        Object.entries(filters).filter(([key]) =>
          ['q', 'sort', 'accountStatus', 'activity'].includes(key),
        ),
      );
      const result = await request(
        `/admin-management/restaurants/export.xlsx?${apiQuery(selected)}`,
        { signal, responseType: 'blob' },
      );
      if (actor().accountId !== owner.accountId)
        throw new DOMException('Account changed', 'AbortError');
      if (
        !(result instanceof Blob) ||
        !result.type.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      )
        throw new ApiError(502, 'CONTRACT');
      return result;
    },
    drivers: list('drivers', driverRowSchema),
    orders: list('orders', orderRowSchema),
    deliveries: list('deliveries', deliveryRowSchema),
    payments: list('payments', paymentRowSchema),
    reviews: list('reviews', reviewRowSchema),
    account: async (accountId: number, signal?: AbortSignal) => {
      const result = await read(
        `/admin-management/accounts/${id.parse(accountId)}`,
        accountRowSchema,
        signal,
      );
      if (result.accountId !== accountId) throw new ApiError(502, 'CONTRACT');
      return result;
    },
    restaurant: async (restaurantId: number, signal?: AbortSignal) => {
      const result = await read(
        `/admin-management/restaurants/${id.parse(restaurantId)}`,
        restaurantDetailSchema,
        signal,
      );
      if (result.restaurantId !== restaurantId) throw new ApiError(502, 'CONTRACT');
      return result;
    },
    delivery: async (deliveryId: number, signal?: AbortSignal) => {
      const result = await read(
        `/admin-management/deliveries/${id.parse(deliveryId)}`,
        deliveryDetailSchema,
        signal,
      );
      if (result.delivery.deliveryId !== deliveryId) throw new ApiError(502, 'CONTRACT');
      return result;
    },
    analytics: (filters: Filters = {}, signal?: AbortSignal) =>
      read(`/admin-management/analytics?${apiQuery(filters)}`, analyticsSchema, signal),
    status: async (
      accountId: number,
      status: 'ACTIVE' | 'DISABLED',
      expectedStatus: 'ACTIVE' | 'DISABLED',
      expectedVersion?: number,
    ) => {
      actor();
      const body = z
        .object({
          status: z.enum(['ACTIVE', 'DISABLED']),
          expectedStatus: z.enum(['ACTIVE', 'DISABLED']),
          expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
        })
        .strict()
        .parse({
          status,
          expectedStatus,
          ...(expectedVersion === undefined ? {} : { expectedVersion }),
        });
      const raw = await request(`/admin/accounts/${id.parse(accountId)}/status`, {
        method: 'PUT',
        body,
      });
      const result = managedAccountSchema.safeParse(raw);
      if (!result.success || result.data.accountId !== accountId || result.data.status !== status)
        throw new ApiError(502, 'CONTRACT');
      return result.data;
    },
    saveRestaurant: async (restaurantId: number, input: z.infer<typeof restaurantInput>) => {
      actor();
      const raw = await request(`/restaurants/${id.parse(restaurantId)}`, {
        method: 'PUT',
        body: restaurantInput.parse(input),
      });
      const schema = restaurantDetailSchema.omit({
        accountId: true,
        accountStatus: true,
        orderCount: true,
        menuCount: true,
      });
      const result = schema.safeParse(raw);
      if (!result.success || result.data.restaurantId !== restaurantId)
        throw new ApiError(502, 'CONTRACT');
      return result.data;
    },
    saveDriver: async (driverId: number, input: z.infer<typeof driverInput>) => {
      actor();
      const raw = await request(`/drivers/${id.parse(driverId)}`, {
        method: 'PUT',
        body: driverInput.parse(input),
      });
      const result = driverProfile.safeParse(raw);
      if (!result.success || result.data.driverId !== driverId) throw new ApiError(502, 'CONTRACT');
      return result.data;
    },
  };
}
export const adminApi = createAdminApi(
  (path, options) => session.request(http, path, options),
  () => session.getSnapshot().account,
);
