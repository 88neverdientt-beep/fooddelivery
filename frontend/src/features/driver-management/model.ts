import { z } from 'zod';
import { orderSchema } from '@/features/orders/model';
export const idSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const deliveryStatusSchema = z.enum([
  'PENDING',
  'PICKED_UP',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
]);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export const deliveryLabels: Record<DeliveryStatus, string> = {
  PENDING: 'Chờ lấy hàng',
  PICKED_UP: 'Đã lấy hàng',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao thành công',
  CANCELLED: 'Đã hủy',
};
export const profileSchema = z.object({
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  driverId: idSchema,
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  address: z.string(),
  licensePlate: z.string().nullable(),
  driveStatus: z.boolean().nullable(),
  createdAt: z.string().nullable(),
});
export const profileInput = z.object({
  expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  name: z.string().trim().min(1, 'Nhập họ tên.').max(100),
  phoneNumber: z.string().trim().min(1, 'Nhập số điện thoại.').max(15),
  address: z.string().trim().min(1, 'Nhập địa chỉ.').max(255),
  licensePlate: z.string().trim().max(20),
  driveStatus: z.boolean(),
});
export const pickupSchema = z.object({
  restaurantId: idSchema,
  name: z.string(),
  address: z.string(),
});
const times = { pickupTime: z.string().nullable(), deliveredTime: z.string().nullable() };
export const assignedSchema = z.object({
  deliveryId: idSchema,
  orderId: idSchema,
  driverId: idSchema,
  deliveryStatus: deliveryStatusSchema,
  orderStatus: orderSchema.shape.orderStatus,
  orderCreatedAt: z.string(),
  ...times,
  pickup: pickupSchema,
  deliveryAddress: z.string(),
  totalAmount: z.number().nonnegative(),
  paymentMethod: z.string().nullable(),
  paymentStatus: z.string().nullable(),
});
export const detailSchema = z.object({
  deliveryId: idSchema,
  driverId: idSchema,
  deliveryStatus: deliveryStatusSchema,
  ...times,
  pickup: pickupSchema,
  order: orderSchema,
});
export const availableSchema = z.object({
  deliveryId: idSchema,
  orderId: idSchema,
  restaurantId: idSchema,
  restaurantName: z.string(),
  restaurantAddress: z.string(),
});
export const deliveryResponseSchema = z.object({
  deliveryId: idSchema,
  deliveryStatus: deliveryStatusSchema,
  ...times,
  order: z.object({ orderId: idSchema, deliveryAddress: z.string() }),
  driver: z
    .object({
      driverId: idSchema,
      name: z.string(),
      phoneNumber: z.string(),
      licensePlate: z.string().nullable(),
    })
    .nullable(),
});
export const pageOf = <T>(item: z.ZodType<T>) =>
  z.object({
    items: z.array(item).max(50),
    page: z.number().int().nonnegative(),
    size: z.number().int().min(1).max(50),
    totalElements: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });
export const assignedPageSchema = pageOf(assignedSchema),
  availablePageSchema = pageOf(availableSchema);
const day = z.object({ date: z.string(), count: z.number().int().nonnegative() });
export const analyticsSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalAssignedAllTime: z.number().int().nonnegative(),
  activeNow: z.number().int().nonnegative(),
  statesAllTime: z.record(deliveryStatusSchema, z.number().int().nonnegative()),
  completedInPeriod: z.number().int().nonnegative(),
  pickedUpInPeriod: z.number().int().nonnegative(),
  completedByDay: z.array(day),
  pickedUpByDay: z.array(day),
  averagePickupToDeliveredMinutes: z.number().nonnegative().nullable(),
});
export type DriverProfile = z.infer<typeof profileSchema>;
export type ProfileInput = z.infer<typeof profileInput>;
export type AssignedDelivery = z.infer<typeof assignedSchema>;
export type AvailableDelivery = z.infer<typeof availableSchema>;
export type DeliveryDetail = z.infer<typeof detailSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export const terminal = (status: DeliveryStatus) =>
  status === 'DELIVERED' || status === 'CANCELLED';
export function nextDeliveryStatus(detail: Pick<DeliveryDetail, 'deliveryStatus' | 'order'>) {
  if (detail.deliveryStatus === 'PENDING' && detail.order.orderStatus === 'READY')
    return 'PICKED_UP';
  if (detail.deliveryStatus === 'PICKED_UP' && detail.order.orderStatus === 'READY')
    return 'DELIVERING';
  if (detail.deliveryStatus === 'DELIVERING' && detail.order.orderStatus === 'DELIVERING')
    return 'DELIVERED';
  return undefined;
}
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
