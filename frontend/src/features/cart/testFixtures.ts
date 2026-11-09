import type { Cart } from './api';

export const cartFixture: Cart = {
  cartId: 11,
  restaurant: { restaurantId: 21, name: 'Quán thử nghiệm' },
  cartItems: [
    {
      cartItemId: 31,
      restaurantFoodItemId: 41,
      foodItemName: 'Phở thử nghiệm',
      quantity: 1,
      note: null,
      unitPrice: 20000,
      subtotal: 20000,
    },
  ],
  totalItems: 1,
  subtotal: 20000,
  shippingFee: 15000,
  totalAmount: 35000,
};
export const emptyCartFixture: Cart = {
  cartId: null,
  restaurant: null,
  cartItems: [],
  totalItems: 0,
  subtotal: 0,
  shippingFee: 0,
  totalAmount: 0,
};
