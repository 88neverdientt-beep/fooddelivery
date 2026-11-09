import { z } from 'zod';
import { ApiError } from '@/lib/api/http';
import type { Cart } from '@/features/cart/api';
import type { Order } from '@/features/orders/model';

export const checkoutSchema = z.object({
  deliveryAddress: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ giao hàng.')
    .max(255, 'Địa chỉ tối đa 255 ký tự.'),
  paymentMethodId: z
    .number()
    .int()
    .positive('Vui lòng chọn phương thức thanh toán.')
    .max(Number.MAX_SAFE_INTEGER),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutAttempt = {
  kind: 'sending' | 'uncertain';
  customerId: number;
  cart: Cart;
  address: string;
  baselineIds: number[];
};
export const checkoutAttemptKey = (accountId: number) => ['checkout-attempt', accountId] as const;

export function cartFingerprint(cart: Cart): string {
  return JSON.stringify({
    restaurant: cart.restaurant?.restaurantId,
    subtotal: cart.subtotal,
    shipping: cart.shippingFee,
    total: cart.totalAmount,
    items: [...cart.cartItems]
      .sort((a, b) => a.cartItemId - b.cartItemId)
      .map((item) => ({
        id: item.cartItemId,
        menu: item.restaurantFoodItemId,
        quantity: item.quantity,
        price: item.unitPrice,
        subtotal: item.subtotal,
        note: item.note,
      })),
  });
}

function lines(
  value: { name: string; quantity: number; price: number; subtotal: number; note: string | null }[],
) {
  return JSON.stringify(value.map((item) => JSON.stringify(item)).sort());
}
export function matchingCheckoutOrders(attempt: CheckoutAttempt, orders: Order[]): Order[] {
  const expected = lines(
    attempt.cart.cartItems.map((item) => ({
      name: item.foodItemName,
      quantity: item.quantity,
      price: item.unitPrice,
      subtotal: item.subtotal,
      note: item.note,
    })),
  );
  return orders.filter(
    (order) =>
      !attempt.baselineIds.includes(order.orderId) &&
      order.customer.customerId === attempt.customerId &&
      order.paymentResponseDTO?.paymentMethod === 'COD' &&
      order.restaurant.restaurantId === attempt.cart.restaurant?.restaurantId &&
      order.deliveryAddress === attempt.address &&
      order.subtotal === attempt.cart.subtotal &&
      order.shippingFee === attempt.cart.shippingFee &&
      order.totalAmount === attempt.cart.totalAmount &&
      lines(
        order.orderDetails.map((item) => ({
          name: item.foodItemName,
          quantity: item.quantity,
          price: item.unitPrice,
          subtotal: item.subtotalItem,
          note: item.note,
        })),
      ) === expected,
  );
}
export const isDefiniteCheckoutRejection = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408;
