import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { session as runtimeSession } from '@/lib/runtime';
import type { Session } from './session';
const AuthContext = createContext<Session | null>(null);
export function AuthProvider({
  children,
  session = runtimeSession,
}: {
  children: ReactNode;
  session?: Session;
}) {
  useEffect(() => {
    session.start();
    const verify = () => {
      if (document.visibilityState === 'visible') void session.verify().catch(() => {});
    };
    window.addEventListener('focus', verify);
    return () => window.removeEventListener('focus', verify);
  }, [session]);
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
export function useSession() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
export function useAuth() {
  const value = useSession();
  return useSyncExternalStore(value.subscribe, value.getSnapshot, value.getSnapshot);
}
