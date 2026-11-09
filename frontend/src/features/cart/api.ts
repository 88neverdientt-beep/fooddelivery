import { z } from 'zod';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import { http, session } from '@/lib/runtime';
import type { Account } from '@/types/domain';

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const amount = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const MAX_CART_QUANTITY = 2147483647;
export const quantitySchema = z.coerce
  .number()
  .int('Số lượng phải là số nguyên.')
  .min(1, 'Chọn ít nhất 1 phần.')
  .max(MAX_CART_QUANTITY, 'Số lượng vượt giới hạn máy chủ.');
export const cartItemSchema = z.object({
  cartItemId: id,
  restaurantFoodItemId: id,
  foodItemName: z.string(),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
  note: z.string().nullable(),
  unitPrice: amount,
  subtotal: amount,
});
export const cartSchema = z.object({
  cartId: id.nullable(),
  restaurant: z.object({ restaurantId: id, name: z.string() }).nullable(),
  cartItems: z.array(cartItemSchema),
  totalItems: z.number().int().nonnegative(),
  subtotal: amount,
  shippingFee: amount,
  totalAmount: amount,
});
export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
export const cartQueryKey = (accountId: number, customerId: number) =>
  ['cart', accountId, customerId] as const;

type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(502, 'CONTRACT');
  return result.data;
}
export function createCartApi(request: Request, identity: () => Account | null) {
  const customer = () => {
    const account = identity();
    if (
      !account ||
      account.status !== 'ACTIVE' ||
      account.role !== 'CUSTOMER' ||
      !account.customerId
    )
      throw new ApiError(403, 'IDENTITY');
    return account.customerId;
  };
  return {
    read: async (signal?: AbortSignal) =>
      parse(cartSchema, await request(`/cart/${customer()}`, { signal })),
    add: async (input: { restaurantFoodItemId: number; quantity: number }) => {
      const body = {
        restaurantFoodItemId: id.parse(input.restaurantFoodItemId),
        quantity: quantitySchema.parse(input.quantity),
      };
      return parse(
        cartItemSchema,
        await request(`/${customer()}/cart-items`, { method: 'POST', body }),
      );
    },
    update: async (cartItemId: number, quantity: number) => {
      customer();
      return parse(
        cartItemSchema,
        await request(`/cart-items/${id.parse(cartItemId)}`, {
          method: 'PUT',
          body: { quantity: quantitySchema.parse(quantity) },
        }),
      );
    },
    remove: async (cartItemId: number) => {
      customer();
      await request(`/cart-items/${id.parse(cartItemId)}`, { method: 'DELETE' });
    },
  };
}
export const cartApi = createCartApi(
  (path, options) => session.request(http, path, options),
  () => session.getSnapshot().account,
);
