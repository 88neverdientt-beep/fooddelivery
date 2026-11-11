import { z } from 'zod';
import { orderSchema } from '@/features/orders/model';
import { menuSchema } from '@/types/domain';
export const positiveId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const profileSchema = z.object({
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  restaurantId: positiveId,
  name: z.string(),
  address: z.string(),
  phoneNumber: z.string(),
  restaurantStatus: z.boolean(),
  createdAt: z.string().nullable(),
});
export const profileInput = z.object({
  expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  name: z.string().trim().min(1, 'Nhập tên nhà hàng.').max(150),
  address: z.string().trim().min(1, 'Nhập địa chỉ.').max(255),
  phoneNumber: z.string().trim().min(1, 'Nhập số điện thoại.').max(15),
  restaurantStatus: z.boolean(),
});
export const priceInput = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    'Giá tối đa 10 chữ số nguyên, 2 chữ số lẻ; không dùng dấu phân cách hàng nghìn.',
  )
  .refine((value) => Number(value) > 0, 'Giá phải lớn hơn 0.');
export const menuInput = z.object({ price: priceInput, isAvailable: z.boolean() });
export const catalogSchema = z.object({
  itemId: positiveId,
  name: z.string(),
  category: z.string().nullable(),
  description: z.string().nullable(),
});
export const pageOf = <T>(item: z.ZodType<T>) =>
  z.object({
    items: z.array(item).max(50),
    page: z.number().int().nonnegative(),
    size: z.number().int().min(1).max(50),
    totalElements: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });
export const analyticsSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalOrders: z.number().int().nonnegative(),
  states: z.record(z.string(), z.number().int().nonnegative()),
  paidOrderCount: z.number().int().nonnegative(),
  paidFoodValue: z.number().nonnegative(),
  paidShipping: z.number().nonnegative(),
  activeMenuCount: z.number().int().nonnegative(),
  ratingsCount: z.number().int().nonnegative(),
  averageRating: z.number().nullable(),
  ordersByDay: z.array(z.object({ date: z.string(), count: z.number() })),
  paidFoodByDay: z.array(z.object({ date: z.string(), amount: z.number() })),
  topItems: z
    .array(
      z.object({
        restaurantFoodItemId: positiveId,
        name: z.string(),
        quantity: z.number(),
        amount: z.number(),
      }),
    )
    .max(10),
});
export const menuPageSchema = pageOf(menuSchema),
  orderPageSchema = pageOf(orderSchema),
  catalogPageSchema = pageOf(catalogSchema);
export type RestaurantProfile = z.infer<typeof profileSchema>;
export type ProfileInput = z.infer<typeof profileInput>;
export type MenuInput = z.infer<typeof menuInput>;
export type CatalogItem = z.infer<typeof catalogSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export const sameMenu = (
  a: { price: number; isAvailable: boolean | null },
  b: { price: number; isAvailable: boolean | null },
) => a.price === b.price && a.isAvailable === b.isAvailable;
export const nextRestaurantStatus = (status: string) =>
  (
    ({ PENDING: 'CONFIRMED', CONFIRMED: 'PREPARING', PREPARING: 'READY' }) as Record<string, string>
  )[status];
export function periodValid(from: string, to: string) {
  const a = Date.parse(from + 'T00:00:00Z'),
    b = Date.parse(to + 'T00:00:00Z');
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    new Date(a).toISOString().slice(0, 10) === from &&
    new Date(b).toISOString().slice(0, 10) === to &&
    b >= a &&
    (b - a) / 86400000 < 93
  );
}
