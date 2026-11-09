import { z } from 'zod';
import { ApiError, type Transport } from '@/lib/api/http';
import { http, session } from '@/lib/runtime';
import { ratingInputSchema, ratingPageSchema, ratingSchema, type RatingInput } from './model';
const read = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(502, 'CONTRACT');
  return result.data;
};
export const ratingKeys = {
  public: (restaurantId: number) => ['public', 'ratings', restaurantId] as const,
  mine: (accountId: number) => ['customer', accountId, 'ratings'] as const,
  page: (restaurantId: number, page: number, accountId?: number) =>
    accountId
      ? ([...ratingKeys.mine(accountId), restaurantId, 'page', page] as const)
      : ([...ratingKeys.public(restaurantId), 'page', page] as const),
  average: (restaurantId: number) => [...ratingKeys.public(restaurantId), 'average'] as const,
};
export function createRatingsApi(publicTransport: Transport, protectedTransport: Transport) {
  return {
    page: async (
      restaurantId: number,
      options: { page: number; size: number; mine?: boolean },
      signal?: AbortSignal,
    ) => {
      const query = new URLSearchParams({ page: String(options.page), size: String(options.size) });
      if (options.mine) query.set('mine', 'true');
      return read(
        ratingPageSchema,
        await (options.mine ? protectedTransport : publicTransport)(
          `/restaurants/${restaurantId}/ratings/page?${query}`,
          { signal },
        ),
      );
    },
    average: async (restaurantId: number, signal?: AbortSignal) =>
      read(
        z.number().min(0).max(5),
        await publicTransport(`/restaurants/${restaurantId}/ratings/average`, { signal }),
      ),
    create: async (restaurantId: number, customerId: number, input: RatingInput) =>
      read(
        ratingSchema,
        await protectedTransport(`/restaurants/${restaurantId}/ratings`, {
          method: 'POST',
          body: { ...ratingInputSchema.parse(input), customerId },
        }),
      ),
    update: async (ratingId: number, customerId: number, input: RatingInput) =>
      read(
        ratingSchema,
        await protectedTransport(`/ratings/${ratingId}/customers/${customerId}`, {
          method: 'PUT',
          body: ratingInputSchema.parse(input),
        }),
      ),
    remove: async (ratingId: number, customerId: number) =>
      read(
        z.string(),
        await protectedTransport(`/ratings/${ratingId}/customers/${customerId}`, {
          method: 'DELETE',
        }),
      ),
  };
}
export const ratingsApi = createRatingsApi(http, (path, options) =>
  session.request(http, path, options),
);
