import { ApiError, normalizeError, type RequestOptions, type Transport } from '@/lib/api/http';
import type { Account, Tokens } from '@/types/domain';
import type { AuthGateway } from './gateway';
import type { LoginInput, RegisterInput } from './validation';
export interface SessionState {
  status: 'booting' | 'authenticated' | 'anonymous' | 'unavailable';
  account: Account | null;
  accessToken: string | null;
  refreshing: boolean;
  generation: number;
  error: ApiError | null;
}
export type CookieLock = <T>(work: () => Promise<T>) => Promise<T>;
export const browserCookieLock: CookieLock = async (work) => {
  if (!navigator.locks) throw new ApiError(0, 'UNSUPPORTED');
  return await navigator.locks.request('hanoifood:auth-cookie:v1', work);
};
export class Session {
  private state: SessionState = {
    status: 'booting',
    account: null,
    accessToken: null,
    refreshing: false,
    generation: 0,
    error: null,
  };
  private listeners = new Set<() => void>();
  private flight: Promise<void> | null = null;
  private started = false;
  private flightGeneration = -1;
  constructor(
    private gateway: AuthGateway,
    private lock: CookieLock = browserCookieLock,
    private identityChanged: () => void = () => {},
    private broadcast: (event: 'changed' | 'signed-out') => void = () => {},
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private clear(status: SessionState['status'] = 'anonymous', error: ApiError | null = null) {
    this.identityChanged();
    this.set({
      status,
      account: null,
      accessToken: null,
      refreshing: false,
      generation: this.state.generation + 1,
      error,
    });
  }
  private accept(tokens: Tokens, account: Account) {
    const changed = this.state.account?.accountId !== account.accountId;
    if (changed) this.identityChanged();
    this.set({
      status: 'authenticated',
      account,
      accessToken: tokens.accessToken,
      error: null,
      refreshing: false,
      generation: this.state.generation + (changed ? 1 : 0),
    });
  }
  start() {
    if (this.started) return;
    this.started = true;
    void this.restore().catch(() => {
      /* State exposes recoverable startup failure. */
    });
  }
  restore = (): Promise<void> => this.refresh();
  refresh = (): Promise<void> => {
    if (this.flight && this.flightGeneration === this.state.generation) return this.flight;
    const generation = this.state.generation;
    this.set({ refreshing: true });
    const work: Promise<void> = this.lock(async () => {
      if (generation !== this.state.generation) return;
      const tokens = await this.gateway.refresh();
      const account = await this.gateway.me(tokens.accessToken);
      if (generation === this.state.generation) this.accept(tokens, account);
    })
      .catch((error: unknown) => {
        if (generation !== this.state.generation) return;
        const normalized = normalizeError(error);
        this.clear(
          normalized.status === 401 ? 'anonymous' : 'unavailable',
          normalized.status === 401 ? null : normalized,
        );
        throw normalized;
      })
      .finally(() => {
        if (this.flight === work) {
          this.flight = null;
          this.set({ refreshing: false });
        }
      });
    this.flight = work;
    this.flightGeneration = generation;
    return work;
  };
  async login(input: LoginInput) {
    await this.lock(async () => {
      const result = await this.gateway.login(input);
      const account = await this.gateway.me(result.accessToken);
      this.clear('booting');
      this.accept(result, account);
      this.broadcast('changed');
    });
  }
  async register(input: Omit<RegisterInput, 'confirmPassword'>) {
    return this.lock(() => this.gateway.register(input));
  }
  private async activeToken(): Promise<string> {
    const before = this.state;
    if (!before.accessToken || !before.account) throw new ApiError(401, '401');
    try {
      await this.gateway.me(before.accessToken);
    } catch (error) {
      if (normalizeError(error).status !== 401) throw error;
      await this.refresh();
    }
    if (this.state.account?.accountId !== before.account.accountId || !this.state.accessToken)
      throw new ApiError(401, '401');
    return this.state.accessToken;
  }
  async logout(all = false) {
    if (all) await this.activeToken();
    await this.lock(() => this.gateway.logout(this.state.accessToken || undefined, all));
    this.clear();
    this.broadcast('signed-out');
  }
  async changePassword(input: { currentPassword: string; newPassword: string }) {
    const token = await this.activeToken();
    await this.lock(() => this.gateway.changePassword(token, input));
    this.clear();
    this.broadcast('signed-out');
  }
  external(event: 'changed' | 'signed-out') {
    this.clear(event === 'changed' ? 'booting' : 'anonymous');
    if (event === 'changed') void this.restore().catch(() => {});
  }
  async verify() {
    if (this.state.status !== 'authenticated') return;
    const generation = this.state.generation;
    try {
      const account = await this.gateway.me(this.state.accessToken!);
      if (generation === this.state.generation) this.set({ account });
    } catch (error) {
      if (generation !== this.state.generation) return;
      if (normalizeError(error).status === 401) await this.refresh();
      else this.clear('unavailable', normalizeError(error));
    }
  }
  async request<T>(http: Transport, path: string, options: RequestOptions = {}): Promise<T> {
    const before = this.state;
    if (before.status !== 'authenticated' || !before.accessToken) throw new ApiError(401, '401');
    try {
      const result = await http<T>(path, { ...options, token: before.accessToken });
      if (before.generation !== this.state.generation)
        throw new DOMException('Account changed', 'AbortError');
      return result;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      if (before.generation !== this.state.generation || options.signal?.aborted)
        throw new DOMException('Request cancelled', 'AbortError');
      await this.refresh();
      if (this.state.account?.accountId !== before.account?.accountId)
        throw new ApiError(401, '401');
      if (options.method && options.method !== 'GET')
        throw new ApiError(
          401,
          'REAUTH',
          'Phiên vừa được cập nhật. Hãy kiểm tra kết quả thao tác trước khi thử lại.',
        );
      const retryGeneration = this.state.generation;
      let result: T;
      try {
        result = await http<T>(path, { ...options, token: this.state.accessToken! });
      } catch (error) {
        if (retryGeneration !== this.state.generation || options.signal?.aborted)
          throw new DOMException('Request cancelled', 'AbortError');
        if (error instanceof ApiError && error.status === 401) this.clear();
        throw error;
      }
      if (retryGeneration !== this.state.generation)
        throw new DOMException('Account changed', 'AbortError');
      return result;
    }
  }
}
