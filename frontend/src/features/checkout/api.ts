import { z } from 'zod';
import { http, session } from '@/lib/runtime';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import { orderSchema } from '@/features/orders/model';
import { checkoutSchema, type CheckoutInput } from './model';

export const paymentMethodSchema = z.object({
  paymentMethodId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  paymentMethodCode: z.string(),
  paymentMethodName: z.string(),
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(502, 'CONTRACT');
  return result.data;
}
export function createCheckoutApi(request: Request, customerId: () => number | null) {
  return {
    paymentMethods: async (signal?: AbortSignal) =>
      parse(z.array(paymentMethodSchema), await request('/payment-methods', { signal })).filter(
        (method) => method.paymentMethodCode === 'COD',
      ),
    create: async (input: CheckoutInput) => {
      const id = customerId();
      if (!id || !Number.isSafeInteger(id) || id <= 0) throw new ApiError(403, 'IDENTITY');
      const order = parse(
        orderSchema,
        await request(`/customers/${id}/orders`, {
          method: 'POST',
          body: checkoutSchema.parse(input),
        }),
      );
      if (order.customer.customerId !== id) throw new ApiError(502, 'CONTRACT');
      return order;
    },
  };
}
export const checkoutApi = createCheckoutApi(
  (path, options) => session.request(http, path, options),
  () => {
    const account = session.getSnapshot().account;
    return account?.role === 'CUSTOMER' ? account.customerId : null;
  },
);
