import { z } from 'zod';
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const roleSchema = z.enum(['CUSTOMER', 'RESTAURANT', 'DRIVER', 'ADMIN']);
export type Role = z.infer<typeof roleSchema>;
export const accountSchema = z
  .object({
    accountId: id,
    email: z.email(),
    role: roleSchema,
    status: z.enum(['ACTIVE', 'DISABLED']),
    customerId: id.nullable(),
    restaurantId: id.nullable(),
    driverId: id.nullable(),
  })
  .refine(
    (a) =>
      a.status === 'ACTIVE' &&
      (a.role === 'ADMIN'
        ? a.customerId === null && a.restaurantId === null && a.driverId === null
        : a.role === 'CUSTOMER'
          ? a.customerId !== null && a.restaurantId === null && a.driverId === null
          : a.role === 'RESTAURANT'
            ? a.restaurantId !== null && a.customerId === null && a.driverId === null
            : a.driverId !== null && a.customerId === null && a.restaurantId === null),
    'Invalid account identity',
  );
export type Account = z.infer<typeof accountSchema>;
export const tokensSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().positive(),
  account: accountSchema,
});
export type Tokens = z.infer<typeof tokensSchema>;
export const restaurantSchema = z.object({
  restaurantId: id,
  name: z.string(),
  address: z.string(),
  restaurantStatus: z.boolean().nullable(),
});
export type Restaurant = z.infer<typeof restaurantSchema>;
export const menuSchema = z.object({
  restaurantFoodItemId: id,
  price: z.number().nonnegative(),
  isAvailable: z.boolean().nullable(),
  restaurant: z.object({ restaurantId: id, name: z.string(), address: z.string() }),
  foodItem: z.object({
    itemId: id,
    name: z.string(),
    category: z.string().nullable(),
    description: z.string().nullable(),
  }),
});
export type MenuItem = z.infer<typeof menuSchema>;
export const profileSchema = z.object({
  name: z.string(),
  address: z.string(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
});
export type Profile = z.infer<typeof profileSchema>;
export const roleName: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  RESTAURANT: 'Nhà hàng',
  DRIVER: 'Tài xế',
  ADMIN: 'Quản trị viên',
};
export const roleHome: Record<Role, string> = {
  CUSTOMER: '/customer',
  RESTAURANT: '/restaurant/dashboard',
  DRIVER: '/driver/dashboard',
  ADMIN: '/admin/dashboard',
};
