import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { session as runtimeSession } from '@/lib/runtime';
import type { Session, SessionState } from './session';
const AuthContext = createContext<Session | null>(null);
const AuthSnapshotContext = createContext<SessionState | null>(null);
export function AuthProvider({
  children,
  session = runtimeSession,
}: {
  children: ReactNode;
  session?: Session;
}) {
  // Publish once at the provider boundary. Independent synchronous subscriptions
  // let a protected child observe logout before its parent guard could unmount it.
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  useEffect(() => {
    session.start();
    const verify = () => {
      if (document.visibilityState === 'visible') void session.verify().catch(() => {});
    };
    window.addEventListener('focus', verify);
    return () => window.removeEventListener('focus', verify);
  }, [session]);
  return (
    <AuthContext.Provider value={session}>
      <AuthSnapshotContext.Provider value={snapshot}>{children}</AuthSnapshotContext.Provider>
    </AuthContext.Provider>
  );
}
export function useSession() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
export function useAuth() {
  const value = useContext(AuthSnapshotContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
