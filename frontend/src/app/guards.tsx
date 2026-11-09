import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { ErrorState, Spinner } from '@/components/feedback';
import { roleHome, type Role } from '@/types/domain';
import { customerReturnTo } from '@/features/auth/returnTo';
export function SessionGate() {
  const auth = useAuth();
  const session = useSession();
  if (auth.status === 'booting') return <Spinner label="Đang xác minh phiên đăng nhập…" />;
  if (auth.status === 'unavailable')
    return (
      <ErrorState
        error={auth.error}
        onRetry={() => {
          void session.restore().catch(() => {});
        }}
      />
    );
  return <Outlet />;
}
export function GuestOnlyRoute() {
  const auth = useAuth();
  const location = useLocation();
  return auth.account ? (
    <Navigate
      to={
        auth.account.role === 'CUSTOMER'
          ? customerReturnTo(location.state?.from) || roleHome.CUSTOMER
          : roleHome[auth.account.role]
      }
      replace
    />
  ) : (
    <Outlet />
  );
}
export function AuthenticatedRoute() {
  const auth = useAuth();
  const location = useLocation();
  return auth.status === 'authenticated' ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
export function RoleProtectedRoute({ role }: { role: Role }) {
  const auth = useAuth();
  return auth.account?.role === role ? <Outlet /> : <Navigate to="/403" replace />;
}
