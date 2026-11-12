import { z } from 'zod';
import { ApiError } from '@/lib/api/http';
import type { Order } from '@/features/orders/model';
import type { CheckoutAttempt } from './model';
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const markerSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal('uncertain'),
    customerId: id,
    signature: z.string().regex(/^[a-f0-9]{64}$/),
    baselineIds: z.array(id).max(50),
  })
  .strict();
export type PendingMarker = z.infer<typeof markerSchema>;
export type PendingCheckout =
  CheckoutAttempt | PendingMarker | { kind: 'unavailable'; customerId: number };
export const pendingStorageKey = (accountId: number) =>
  `hanoifood:checkout-pending:v1:${accountId}`;
function payload(
  customerId: number,
  restaurantId: number | undefined,
  address: string,
  subtotal: number,
  shipping: number,
  total: number,
  lines: { name: string; quantity: number; price: number; subtotal: number; note: string | null }[],
) {
  return JSON.stringify([
    customerId,
    restaurantId,
    address,
    subtotal,
    shipping,
    total,
    lines.map((x) => JSON.stringify(x)).sort(),
  ]);
}
async function digest(value: string) {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(result)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export async function rememberPending(accountId: number, attempt: CheckoutAttempt) {
  const c = attempt.cart;
  const signature = await digest(
    payload(
      attempt.customerId,
      c.restaurant?.restaurantId,
      attempt.address,
      c.subtotal,
      c.shippingFee,
      c.totalAmount,
      c.cartItems.map((x) => ({
        name: x.foodItemName,
        quantity: x.quantity,
        price: x.unitPrice,
        subtotal: x.subtotal,
        note: x.note,
      })),
    ),
  );
  const marker: PendingMarker = {
    version: 1,
    kind: 'uncertain',
    customerId: attempt.customerId,
    baselineIds: attempt.baselineIds,
    signature,
  };
  try {
    const value = JSON.stringify(marker);
    sessionStorage.setItem(pendingStorageKey(accountId), value);
    if (sessionStorage.getItem(pendingStorageKey(accountId)) !== value) throw new Error();
  } catch {
    throw new ApiError(
      409,
      'STORAGE',
      'Không lưu được trạng thái chống đặt trùng. Chưa gửi đơn hàng; hãy kiểm tra quyền lưu trữ của trình duyệt.',
    );
  }
}
export function restorePending(accountId: number, customerId: number): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(pendingStorageKey(accountId));
    if (raw === null) return null;
    const marker = markerSchema.parse(JSON.parse(raw));
    if (marker.customerId !== customerId) throw new Error();
    return marker;
  } catch {
    return { kind: 'unavailable', customerId };
  }
}
export function forgetPending(accountId: number) {
  // If removal fails, retain the conservative marker; never unlock a possibly unverified POST.
  try {
    sessionStorage.removeItem(pendingStorageKey(accountId));
  } catch {
    /* Reconciliation remains available after reload. */
  }
}
export async function restoredMatches(marker: PendingMarker, orders: Order[]) {
  const matches: Order[] = [];
  for (const o of orders) {
    if (
      o.customer.customerId !== marker.customerId ||
      marker.baselineIds.includes(o.orderId) ||
      o.paymentResponseDTO?.paymentMethod !== 'COD'
    )
      continue;
    const signature = await digest(
      payload(
        o.customer.customerId,
        o.restaurant.restaurantId,
        o.deliveryAddress,
        o.subtotal,
        o.shippingFee,
        o.totalAmount,
        o.orderDetails.map((x) => ({
          name: x.foodItemName,
          quantity: x.quantity,
          price: x.unitPrice,
          subtotal: x.subtotalItem,
          note: x.note,
        })),
      ),
    );
    if (signature === marker.signature) matches.push(o);
  }
  return matches;
}
