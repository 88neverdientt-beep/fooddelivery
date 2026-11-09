import { z } from 'zod';
import { http, session } from '@/lib/runtime';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import type { Account } from '@/types/domain';
import { apiQuery } from '@/features/public/model';
import {
  idSchema,
  profileSchema,
  profileInput,
  assignedPageSchema,
  availablePageSchema,
  detailSchema,
  analyticsSchema,
  deliveryResponseSchema,
  type ProfileInput,
} from './model';
type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
type Filters = Record<string, string | number | undefined>;
export const driverKey = (accountId: number, driverId: number) =>
  ['driver-management', accountId, driverId] as const;
export function createDriverApi(request: Request, identity: () => Account | null) {
  const own = () => {
    const actor = identity();
    if (actor?.role !== 'DRIVER' || !actor.driverId) throw new ApiError(403, 'IDENTITY');
    return actor.driverId;
  };
  const parse = <T>(schema: z.ZodType<T>, value: unknown) => {
    const result = schema.safeParse(value);
    if (!result.success) throw new ApiError(502, 'CONTRACT');
    return result.data;
  };
  const read = async <T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) => {
    own();
    return parse(schema, await request(path, { signal }));
  };
  const profileOwner = (value: z.infer<typeof profileSchema>, expected: number) => {
    if (value.driverId !== expected) throw new ApiError(502, 'CONTRACT');
    return value;
  };
  return {
    profile: async (signal?: AbortSignal) =>
      profileOwner(await read(`/drivers/${own()}`, profileSchema, signal), own()),
    updateProfile: async (value: ProfileInput) => {
      const id = own();
      return profileOwner(
        parse(
          profileSchema,
          await request(`/drivers/${id}`, { method: 'PUT', body: profileInput.parse(value) }),
        ),
        id,
      );
    },
    deliveries: async (filters: Filters = {}, signal?: AbortSignal) => {
      const id = own();
      const value = await read(
        `/driver-management/deliveries?${apiQuery({ page: 0, size: 12, ...filters })}`,
        assignedPageSchema,
        signal,
      );
      if (value.items.some((item) => item.driverId !== id)) throw new ApiError(502, 'CONTRACT');
      return value;
    },
    detail: async (id: number, signal?: AbortSignal) => {
      const value = await read(
        `/driver-management/deliveries/${idSchema.parse(id)}`,
        detailSchema,
        signal,
      );
      if (
        value.deliveryId !== id ||
        value.driverId !== own() ||
        value.order.deliveryOutputDTO?.deliveryId !== id ||
        value.order.deliveryOutputDTO.deliveryStatus !== value.deliveryStatus ||
        value.order.restaurant.restaurantId !== value.pickup.restaurantId
      )
        throw new ApiError(502, 'CONTRACT');
      return value;
    },
    available: (filters: Filters = {}, signal?: AbortSignal) =>
      read(
        `/driver-management/available?${apiQuery({ page: 0, size: 12, ...filters })}`,
        availablePageSchema,
        signal,
      ),
    analytics: (filters: Filters = {}, signal?: AbortSignal) =>
      read(`/driver-management/analytics?${apiQuery(filters)}`, analyticsSchema, signal),
    accept: async (id: number) => {
      const value = parse(
        deliveryResponseSchema,
        await request(`/deliveries/${idSchema.parse(id)}/accept`, {
          method: 'POST',
          body: { driverId: own() },
        }),
      );
      if (value.deliveryId !== id || value.driver?.driverId !== own())
        throw new ApiError(502, 'CONTRACT');
      return value;
    },
    transition: async (id: number, status: 'PICKED_UP' | 'DELIVERING' | 'DELIVERED') => {
      own();
      const value = parse(
        deliveryResponseSchema,
        await request(`/deliveries/${idSchema.parse(id)}/status`, { method: 'PUT', body: status }),
      );
      if (
        value.deliveryId !== id ||
        value.driver?.driverId !== own() ||
        value.deliveryStatus !== status
      )
        throw new ApiError(502, 'CONTRACT');
      return value;
    },
  };
}
export const driverApi = createDriverApi(
  (path, options) => session.request(http, path, options),
  () => session.getSnapshot().account,
);
