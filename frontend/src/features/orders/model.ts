import { z } from 'zod';

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const amount = z.number().nonnegative().finite();
const timestamp = z.string().min(1);
export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
]);
export const deliveryStatusSchema = z.enum([
  'PENDING',
  'PICKED_UP',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
]);
export const paymentStatusSchema = z.enum(['PENDING', 'SUCCESS', 'CANCELLED', 'REFUNDED']);
export const paymentSchema = z.object({
  paymentId: id,
  paymentMethod: z.string().nullable(),
  paymentStatus: paymentStatusSchema,
  amount,
  paidAt: timestamp.nullable(),
  refundedAt: timestamp.nullable(),
});
export const orderSchema = z.object({
  orderId: id,
  deliveryAddress: z.string(),
  subtotal: amount,
  shippingFee: amount,
  totalAmount: amount,
  orderStatus: orderStatusSchema,
  createdAt: timestamp,
  customer: z.object({ customerId: id, name: z.string() }),
  restaurant: z.object({ restaurantId: id, name: z.string() }),
  orderDetails: z.array(
    z.object({
      orderDetailId: id,
      foodItemName: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: amount,
      subtotalItem: amount,
      note: z.string().nullable(),
    }),
  ),
  deliveryOutputDTO: z
    .object({
      deliveryId: id,
      deliveryStatus: deliveryStatusSchema,
      pickupTime: timestamp.nullable(),
      deliveredTime: timestamp.nullable(),
    })
    .nullable()
    .optional(),
  paymentResponseDTO: paymentSchema.nullable(),
});
export type Order = z.infer<typeof orderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export const orderPageSchema = z.object({
  items: z.array(orderSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().min(1).max(50),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type OrderPage = z.infer<typeof orderPageSchema>;
export const orderLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ nhà hàng xác nhận',
  CONFIRMED: 'Nhà hàng đã xác nhận',
  PREPARING: 'Đang chuẩn bị món',
  READY: 'Sẵn sàng giao',
  DELIVERING: 'Đang giao hàng',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};
export const deliveryLabels: Record<DeliveryStatus, string> = {
  PENDING: 'Chờ tài xế nhận / lấy món',
  PICKED_UP: 'Tài xế đã lấy món',
  DELIVERING: 'Tài xế đang giao',
  DELIVERED: 'Đã giao đến khách hàng',
  CANCELLED: 'Chuyến giao đã hủy',
};
export const paymentLabels: Record<Payment['paymentStatus'], string> = {
  PENDING: 'Chờ thanh toán',
  SUCCESS: 'Đã thanh toán',
  CANCELLED: 'Đã hủy thanh toán',
  REFUNDED: 'Đã hoàn tiền',
};
export const addressSchema = z.object({
  deliveryAddress: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ giao hàng.')
    .max(255, 'Địa chỉ tối đa 255 ký tự.'),
});
export const terminalOrder = (status: OrderStatus) =>
  status === 'COMPLETED' || status === 'CANCELLED';
export const canEditAddress = (order: Order) =>
  order.orderStatus === 'PENDING' || order.orderStatus === 'CONFIRMED';
export const canCancelOrder = (order: Order) =>
  canEditAddress(order) &&
  (!order.deliveryOutputDTO || order.deliveryOutputDTO.deliveryStatus === 'PENDING') &&
  order.paymentResponseDTO?.paymentStatus !== 'SUCCESS';
export function parseOrderId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}
export function formatOrderDate(value: string | null | undefined) {
  if (!value) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : date.toLocaleString('vi-VN');
}
export const orderSteps: Exclude<OrderStatus, 'CANCELLED'>[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERING',
  'COMPLETED',
];
