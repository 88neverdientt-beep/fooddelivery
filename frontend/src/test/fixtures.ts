import { vi } from 'vitest';
import type { Account, Tokens, Role } from '@/types/domain';
import type { AuthGateway } from '@/features/auth/gateway';
import { ApiError } from '@/lib/api/http';
import { Session, type CookieLock } from '@/features/auth/session';
export const account = (role: Role = 'CUSTOMER', id = 1): Account => ({
  accountId: id,
  email: `user${id}@test.example`,
  role,
  status: 'ACTIVE',
  customerId: role === 'CUSTOMER' ? id : null,
  restaurantId: role === 'RESTAURANT' ? id : null,
  driverId: role === 'DRIVER' ? id : null,
});
export const tokens = (a = account()): Tokens => ({
  accessToken: 'test-access-memory-only',
  tokenType: 'Bearer',
  expiresIn: 600,
  account: a,
});
export function gateway(a = account()): AuthGateway {
  return {
    login: vi.fn().mockResolvedValue(tokens(a)),
    refresh: vi.fn().mockResolvedValue(tokens(a)),
    me: vi.fn().mockResolvedValue(a),
    register: vi.fn().mockResolvedValue(a),
    logout: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue(undefined),
  };
}
export const immediateLock: CookieLock = async (work) => await work();
export const anonymousSession = () => {
  const api = gateway();
  api.refresh = vi.fn().mockRejectedValue(new ApiError(401, '401'));
  return { api, session: new Session(api, immediateLock) };
};
