import { z } from 'zod';
import { roleSchema } from '@/types/domain';
import { passwordSchema } from '@/features/auth/validation';
import {
  orderSchema,
  orderStatusSchema,
  deliveryStatusSchema,
  paymentStatusSchema,
} from '@/features/orders/model';
export const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amount = z.number().nonnegative().finite();
const time = z.string().nullable();
export const accountStatus = z.enum(['ACTIVE', 'DISABLED']);
export const ref = z.object({ id, name: z.string().nullable() });
export const managedAccountSchema = z
  .object({
    accountId: id,
    email: z.email(),
    role: roleSchema,
    status: accountStatus,
    customerId: id.nullable(),
    restaurantId: id.nullable(),
    driverId: id.nullable(),
  })
  .refine(
    (a) =>
      a.role === 'ADMIN'
        ? !a.customerId && !a.restaurantId && !a.driverId
        : a.role === 'CUSTOMER'
          ? !!a.customerId && !a.restaurantId && !a.driverId
          : a.role === 'RESTAURANT'
            ? !!a.restaurantId && !a.customerId && !a.driverId
            : !!a.driverId && !a.customerId && !a.restaurantId,
    'Invalid linked profile',
  );
export const accountRowSchema = managedAccountSchema.safeExtend({
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  createdAt: time,
  name: z.string().nullable(),
});
const linked = {
  accountId: id.nullable(),
  accountStatus: accountStatus.nullable(),
  createdAt: time,
};
export const customerRowSchema = z.object({
  customerId: id,
  name: z.string(),
  email: z.string(),
  ...linked,
  orderCount: count,
});
export const restaurantRowSchema = z.object({
  restaurantId: id,
  name: z.string(),
  address: z.string(),
  restaurantStatus: z.boolean().nullable(),
  ...linked,
  orderCount: count,
  menuCount: count,
});
export const restaurantDetailSchema = restaurantRowSchema.extend({
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  email: z.string(),
  phoneNumber: z.string(),
});
export const driverRowSchema = z.object({
  driverId: id,
  name: z.string(),
  email: z.string(),
  licensePlate: z.string().nullable(),
  driveStatus: z.boolean().nullable(),
  ...linked,
  deliveryCount: count,
  activeDeliveryCount: count,
});
export const orderRowSchema = z.object({
  orderId: id,
  customer: ref.nullable(),
  restaurant: ref.nullable(),
  createdAt: time,
  subtotal: amount.nullable(),
  shippingFee: amount.nullable(),
  totalAmount: amount.nullable(),
  orderStatus: orderStatusSchema.nullable(),
  paymentId: id.nullable(),
  paymentStatus: paymentStatusSchema.nullable(),
  deliveryId: id.nullable(),
  deliveryStatus: deliveryStatusSchema.nullable(),
});
export const deliveryRowSchema = z.object({
  deliveryId: id,
  orderId: id,
  driver: ref.nullable(),
  restaurant: ref.nullable(),
  orderStatus: orderStatusSchema.nullable(),
  deliveryStatus: deliveryStatusSchema.nullable(),
  pickupTime: time,
  deliveredTime: time,
  orderCreatedAt: time,
});
export const deliveryDetailSchema = z
  .object({
    delivery: deliveryRowSchema,
    pickupAddress: z.string().nullable(),
    deliveryAddress: z.string(),
    licensePlate: z.string().nullable(),
    order: orderSchema,
  })
  .refine(
    (v) =>
      v.delivery.orderId === v.order.orderId &&
      v.delivery.deliveryId === v.order.deliveryOutputDTO?.deliveryId &&
      v.delivery.deliveryStatus === v.order.deliveryOutputDTO?.deliveryStatus,
    'Inconsistent delivery detail',
  );
export const paymentRowSchema = z.object({
  paymentId: id,
  orderId: id,
  methodCode: z.string().nullable(),
  methodName: z.string().nullable(),
  amount,
  paymentStatus: paymentStatusSchema.nullable(),
  createdAt: time,
  paidAt: time,
  refundedAt: time,
  orderStatus: orderStatusSchema.nullable(),
});
export const reviewRowSchema = z.object({
  ratingId: id,
  score: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: time,
  customer: ref.nullable(),
  restaurant: ref.nullable(),
});
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: count,
    size: z.number().int().min(1).max(50),
    totalElements: count,
    totalPages: count,
  });
}
const orderStates = z
  .object({
    PENDING: count,
    CONFIRMED: count,
    PREPARING: count,
    READY: count,
    DELIVERING: count,
    COMPLETED: count,
    CANCELLED: count,
  })
  .catchall(count);
const deliveryStates = z
  .object({
    PENDING: count,
    PICKED_UP: count,
    DELIVERING: count,
    DELIVERED: count,
    CANCELLED: count,
  })
  .catchall(count);
const days = z.array(z.object({ date: z.string(), count }));
const ranked = z.array(z.object({ subject: ref, count, completedCount: count })).max(10);
export const analyticsSchema = z.object({
  from: z.string(),
  to: z.string(),
  businessToday: z.string(),
  timeZone: z.string(),
  allTimeCounts: z.object({
    customers: count,
    restaurants: count,
    drivers: count,
    accounts: count,
    orders: count,
  }),
  orderCohort: z.object({
    total: count,
    states: orderStates,
    nonCancelledOrderValue: amount,
    days,
  }),
  recordedSuccessfulPayments: z.object({
    count,
    foodValue: amount,
    shippingValue: amount,
    totalValue: amount,
    days: z.array(z.object({ date: z.string(), amount })),
  }),
  deliveryCohort: z.object({
    states: deliveryStates,
    terminalCount: count,
    deliveredCount: count,
    deliveredSharePercent: z.number().min(0).max(100).nullable(),
  }),
  paymentMethods: z.array(
    z.object({
      methodCode: z.string().nullable(),
      methodName: z.string().nullable(),
      count,
      successfulCount: count,
    }),
  ),
  topRestaurants: ranked,
  topDrivers: ranked,
});
export type AccountRow = z.infer<typeof accountRowSchema>;
export type CustomerRow = z.infer<typeof customerRowSchema>;
export type RestaurantRow = z.infer<typeof restaurantRowSchema>;
export type DriverRow = z.infer<typeof driverRowSchema>;
export type OrderRow = z.infer<typeof orderRowSchema>;
export type DeliveryRow = z.infer<typeof deliveryRowSchema>;
export type PaymentRow = z.infer<typeof paymentRowSchema>;
export type ReviewRow = z.infer<typeof reviewRowSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type Filters = Record<string, string | number | undefined>;
export const createProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Nhập tên hồ sơ.').max(150),
    email: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        'Email chưa đúng định dạng được hỗ trợ.',
      ),
    phoneNumber: z.string().trim().min(1, 'Nhập số liên hệ.').max(15),
    address: z.string().trim().min(1, 'Nhập địa chỉ.').max(255),
    licensePlate: z.string().trim().max(20),
    activity: z.enum(['true', 'false']),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận chưa khớp.',
  });
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export function dateValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return (
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' &&
    value <= '9998-12-31'
  );
}
export function rangeValid(from: string, to: string, maximum = 93) {
  return (
    dateValid(from) &&
    dateValid(to) &&
    to >= from &&
    (Date.parse(to) - Date.parse(from)) / 86400000 < maximum
  );
}
export function presetDates(today: string, days: number) {
  if (!dateValid(today) || ![1, 7, 30].includes(days)) throw new Error('Invalid business date');
  const start = new Date(today + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to: today };
}
