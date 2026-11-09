import { z } from 'zod';
import { http, session } from '@/lib/runtime';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import type { Account, MenuItem } from '@/types/domain';
import { menuSchema } from '@/types/domain';
import { apiQuery } from '@/features/public/model';
import { orderSchema, type Order } from '@/features/orders/model';
import { ratingPageSchema } from '@/features/ratings/model';
import {
  profileSchema,
  profileInput,
  menuInput,
  menuPageSchema,
  catalogPageSchema,
  orderPageSchema,
  analyticsSchema,
  positiveId,
  type ProfileInput,
  type MenuInput,
} from './model';
type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
type Filters = Record<string, string | number | boolean | undefined>;
export const managementKey = (accountId: number, restaurantId: number) =>
  ['restaurant-management', accountId, restaurantId] as const;
export function createRestaurantApi(request: Request, identity: () => Account | null) {
  const own = () => {
    const actor = identity();
    if (actor?.role !== 'RESTAURANT' || !actor.restaurantId) throw new ApiError(403, 'IDENTITY');
    return actor.restaurantId;
  };
  const parse = <T>(schema: z.ZodType<T>, data: unknown) => {
    const result = schema.safeParse(data);
    if (!result.success) throw new ApiError(502, 'CONTRACT');
    return result.data;
  };
  const read = async <T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) => {
    own();
    return parse(schema, await request(path, { signal }));
  };
  const menuOwner = (item: MenuItem) => {
    if (item.restaurant.restaurantId !== own()) throw new ApiError(404, '404');
    return item;
  };
  const orderOwner = (order: Order) => {
    if (order.restaurant.restaurantId !== own()) throw new ApiError(404, '404');
    return order;
  };
  return {
    profile: async (signal?: AbortSignal) => {
      const result = await read('/restaurant-management/profile', profileSchema, signal);
      if (result.restaurantId !== own()) throw new ApiError(502, 'CONTRACT');
      return result;
    },
    updateProfile: async (input: ProfileInput) => {
      const id = own();
      const result = parse(
        profileSchema,
        await request(`/restaurants/${id}`, { method: 'PUT', body: profileInput.parse(input) }),
      );
      if (result.restaurantId !== id) throw new ApiError(502, 'CONTRACT');
      return result;
    },
    menu: async (filters: Filters = {}, signal?: AbortSignal) => {
      const id = own();
      const result = await read(
        `/restaurants/${id}/menu?${apiQuery({ page: 0, size: 12, ...filters })}`,
        menuPageSchema,
        signal,
      );
      result.items.forEach(menuOwner);
      return result;
    },
    menuItem: async (id: number, signal?: AbortSignal) =>
      menuOwner(await read(`/restaurant-food-items/${positiveId.parse(id)}`, menuSchema, signal)),
    catalog: (filters: Filters = {}, signal?: AbortSignal) =>
      read(
        `/restaurant-management/catalog?${apiQuery({ page: 0, size: 12, ...filters })}`,
        catalogPageSchema,
        signal,
      ),
    add: async (foodItemId: number, input: MenuInput) => {
      const value = menuInput.parse(input);
      return menuOwner(
        parse(
          menuSchema,
          await request('/restaurant-food-items', {
            method: 'POST',
            body: {
              restaurantId: own(),
              foodItemId: positiveId.parse(foodItemId),
              price: Number(value.price),
              isAvailable: value.isAvailable,
            },
          }),
        ),
      );
    },
    update: async (item: MenuItem, input: MenuInput) => {
      menuOwner(item);
      const value = menuInput.parse(input);
      return menuOwner(
        parse(
          menuSchema,
          await request(`/restaurant-food-items/${item.restaurantFoodItemId}`, {
            method: 'PUT',
            body: {
              price: Number(value.price),
              isAvailable: value.isAvailable,
              expectedPrice: item.price,
              expectedIsAvailable: item.isAvailable,
            },
          }),
        ),
      );
    },
    remove: async (item: MenuItem) => {
      menuOwner(item);
      await request(`/restaurant-food-items/${item.restaurantFoodItemId}`, { method: 'DELETE' });
      return true;
    },
    orders: (filters: Filters = {}, signal?: AbortSignal) =>
      read(
        `/restaurant-management/orders?${apiQuery({ page: 0, size: 12, ...filters })}`,
        orderPageSchema,
        signal,
      ).then((result) => {
        result.items.forEach(orderOwner);
        return result;
      }),
    order: async (id: number, signal?: AbortSignal) =>
      orderOwner(await read(`/orders/${positiveId.parse(id)}`, orderSchema, signal)),
    transition: async (order: Order, status: string) => {
      orderOwner(order);
      return orderOwner(
        parse(
          orderSchema,
          await request(`/orders/${order.orderId}/status`, { method: 'PATCH', body: status }),
        ),
      );
    },
    cancel: async (order: Order) => {
      orderOwner(order);
      return orderOwner(
        parse(orderSchema, await request(`/orders/${order.orderId}/cancel`, { method: 'PATCH' })),
      );
    },
    reviews: (page = 0, signal?: AbortSignal) =>
      read(`/restaurants/${own()}/ratings/page?page=${page}&size=12`, ratingPageSchema, signal),
    analytics: (filters: Filters = {}, signal?: AbortSignal) =>
      read(`/restaurant-management/analytics?${apiQuery(filters)}`, analyticsSchema, signal),
  };
}
export const restaurantApi = createRestaurantApi(
  (path, options) => session.request(http, path, options),
  () => session.getSnapshot().account,
);
