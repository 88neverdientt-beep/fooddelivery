import { z } from 'zod';
import { ApiError, type RequestOptions } from '@/lib/api/http';
import { http, session } from '@/lib/runtime';
import type { Account } from '@/types/domain';

export const customerProfileInput = z.object({
  expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  name: z.string().trim().min(1, 'Vui lòng nhập họ và tên.').max(100, 'Họ tên tối đa 100 ký tự.'),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại.')
    .max(15, 'Số điện thoại tối đa 15 ký tự.'),
  address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ.').max(255, 'Địa chỉ tối đa 255 ký tự.'),
});
export const customerSchema = z.object({
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  customerId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  address: z.string(),
  createdAt: z.string().nullable().optional(),
});
export type CustomerProfileInput = z.infer<typeof customerProfileInput>;
export type CustomerProfile = z.infer<typeof customerSchema>;
type Request = (path: string, options?: RequestOptions) => Promise<unknown>;
export function createCustomerApi(request: Request, identity: () => Account | null) {
  function current(expectedAccountId?: number) {
    const account = identity();
    if (!account || account.role !== 'CUSTOMER' || !account.customerId)
      throw new ApiError(403, 'IDENTITY');
    if (expectedAccountId !== undefined && expectedAccountId !== account.accountId)
      throw new DOMException('Account changed', 'AbortError');
    return account;
  }
  function response(value: unknown, customerId: number) {
    const parsed = customerSchema.safeParse(value);
    if (!parsed.success || parsed.data.customerId !== customerId)
      throw new ApiError(502, 'CONTRACT');
    return parsed.data;
  }
  return {
    read: async (signal?: AbortSignal) => {
      const account = current();
      return response(
        await request(`/customers/${account.customerId}`, { signal }),
        account.customerId!,
      );
    },
    update: async (input: CustomerProfileInput, expectedAccountId: number) => {
      const account = current(expectedAccountId);
      const body = customerProfileInput.parse(input);
      return response(
        await request(`/customers/${account.customerId}`, { method: 'PUT', body }),
        account.customerId!,
      );
    },
  };
}
export const customerApi = createCustomerApi(
  (path, options) => session.request(http, path, options),
  () => session.getSnapshot().account,
);
