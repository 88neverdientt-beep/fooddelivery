import type { Order } from '@/features/orders/model';
import { cartFixture } from '@/features/cart/testFixtures';
import type { CheckoutAttempt } from './model';

export const codFixture = {
  paymentMethodId: 61,
  paymentMethodCode: 'COD',
  paymentMethodName: 'Tiền mặt khi nhận hàng',
};
export const orderFixture: Order = {
  orderId: 71,
  deliveryAddress: '12 Đường thử nghiệm, Hà Nội',
  subtotal: cartFixture.subtotal,
  shippingFee: cartFixture.shippingFee,
  totalAmount: cartFixture.totalAmount,
  orderStatus: 'PENDING',
  createdAt: '2026-11-09T10:00:00',
  customer: { customerId: 1, name: 'Khách thử nghiệm' },
  restaurant: {
    restaurantId: cartFixture.restaurant!.restaurantId,
    name: cartFixture.restaurant!.name,
  },
  orderDetails: [
    {
      orderDetailId: 81,
      foodItemName: cartFixture.cartItems[0].foodItemName,
      quantity: 1,
      unitPrice: 20000,
      subtotalItem: 20000,
      note: null,
    },
  ],
  deliveryOutputDTO: null,
  paymentResponseDTO: {
    paymentId: 91,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    amount: cartFixture.totalAmount,
    paidAt: null,
    refundedAt: null,
  },
};
export const attemptFixture: CheckoutAttempt = {
  kind: 'uncertain',
  customerId: 1,
  cart: cartFixture,
  address: orderFixture.deliveryAddress,
  baselineIds: [1, 2],
};
