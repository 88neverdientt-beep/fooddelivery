import { z } from 'zod';
import { accountSchema, tokensSchema, type Account, type Tokens } from '@/types/domain';
import { ApiError, type Transport } from '@/lib/api/http';
import type { LoginInput, RegisterInput } from './validation';
export interface AuthGateway {
  login(input: LoginInput): Promise<Tokens>;
  refresh(): Promise<Tokens>;
  me(token: string): Promise<Account>;
  register(input: Omit<RegisterInput, 'confirmPassword'>): Promise<Account>;
  logout(token?: string, all?: boolean): Promise<void>;
  changePassword(
    token: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void>;
}
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(502, 'CONTRACT');
  return result.data;
}
export function createAuthGateway(http: Transport): AuthGateway {
  const post = async <T>(path: string, body?: unknown, token?: string): Promise<T> => {
    const csrf = parse(
      z.object({ headerName: z.literal('X-XSRF-TOKEN'), token: z.string().min(1) }),
      await http('/auth/csrf'),
    );
    return http<T>(path, {
      method: 'POST',
      body,
      token,
      headers: { [csrf.headerName]: csrf.token },
    });
  };
  return {
    login: async (input) => parse(tokensSchema, await post('/auth/login', input)),
    refresh: async () => parse(tokensSchema, await post('/auth/refresh')),
    me: async (token) => parse(accountSchema, await http('/auth/me', { token })),
    register: async (input) => parse(accountSchema, await post('/auth/register/customer', input)),
    logout: async (token, all) => {
      await post(all ? '/auth/logout-all' : '/auth/logout', undefined, all ? token : undefined);
    },
    changePassword: async (token, input) => {
      await post('/auth/change-password', input, token);
    },
  };
}
