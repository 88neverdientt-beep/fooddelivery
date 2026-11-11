import { z } from 'zod';
import { http } from '@/lib/runtime';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import { menuSchema, restaurantSchema } from '@/types/domain';
import { apiQuery, type RestaurantFilters } from './model';
const parse = <T>(schema: z.ZodType<T>, value: unknown) => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(502, 'CONTRACT');
  return result.data;
};
export const categoriesFrom = (items: { category: string | null }[]) => {
  const unique = new Map<string, string>();
  for (const item of items) {
    const label = item.category?.trim();
    if (label && !unique.has(label.toLocaleLowerCase('vi')))
      unique.set(label.toLocaleLowerCase('vi'), label);
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'vi'));
};
const pageOf = <T>(item: z.ZodType<T>) =>
  z.object({
    items: z.array(item).max(50),
    page: z.number().int().min(0).max(10000),
    size: z.number().int().min(1).max(50),
    totalElements: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    totalPages: z.number().int().nonnegative(),
  });
export type MenuFilters = {
  q?: string;
  category?: string;
  available?: boolean;
  page?: number;
  size?: number;
  sort?: 'name' | 'price-asc' | 'price-desc';
};
export function createPublicApi(
  request: (path: string, options?: RequestOptions) => Promise<unknown>,
) {
  const restaurantPage = async (filters: Partial<RestaurantFilters> = {}, signal?: AbortSignal) =>
    parse(
      pageOf(restaurantSchema),
      await request(`/restaurants/search?${apiQuery({ page: 0, size: 12, ...filters })}`, {
        signal,
      }),
    );
  return {
    restaurantPage,
    restaurants: async (signal?: AbortSignal) => (await restaurantPage({ size: 3 }, signal)).items,
    categoryPage: async (page = 0, signal?: AbortSignal) =>
      parse(pageOf(z.string()), await request(`/food-categories?page=${page}&size=12`, { signal })),
    categories: async (signal?: AbortSignal) =>
      parse(pageOf(z.string()), await request('/food-categories?page=0&size=12', { signal })).items,
    restaurant: async (id: string, signal?: AbortSignal) =>
      parse(restaurantSchema, await request(`/restaurants/${id}`, { signal })),
    menuPage: async (restaurantId: string, filters: MenuFilters = {}, signal?: AbortSignal) =>
      parse(
        pageOf(menuSchema),
        await request(
          `/restaurants/${restaurantId}/menu?${apiQuery({ page: 0, size: 12, ...filters })}`,
          {
            signal,
          },
        ),
      ),
    menuItem: async (id: string, signal?: AbortSignal) =>
      parse(menuSchema, await request(`/restaurant-food-items/${id}`, { signal })),
  };
}
export const publicApi = createPublicApi(http);
export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
