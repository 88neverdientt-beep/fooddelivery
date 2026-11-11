import { QueryClient } from '@tanstack/react-query';
import { createTransport, ApiError } from '@/lib/api/http';
import { createAuthGateway } from '@/features/auth/gateway';
import { Session } from '@/features/auth/session';
import { clearIdentityCaches } from '@/features/auth/query-cache';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      retry: (count, error) => count < 1 && error instanceof ApiError && error.status >= 500,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
export const http = createTransport(import.meta.env.VITE_API_BASE_URL || '/api');
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hanoifood:identity:v1') : null;
export const session = new Session(
  createAuthGateway(http),
  undefined,
  () => clearIdentityCaches(queryClient),
  (event) => channel?.postMessage(event),
);
if (channel)
  channel.onmessage = (event) => {
    if (event.data === 'changed' || event.data === 'signed-out') session.external(event.data);
  };
export const api = {
  get: <T>(path: string, signal?: AbortSignal) => session.request<T>(http, path, { signal }),
};

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    channel?.close();
    queryClient.clear();
  });
