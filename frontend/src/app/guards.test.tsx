import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { AuthenticatedRoute, GuestOnlyRoute, RoleProtectedRoute, SessionGate } from './guards';
import { Session } from '@/features/auth/session';
import { account, gateway, immediateLock, anonymousSession } from '@/test/fixtures';
import { roleHome, type Role } from '@/types/domain';
it.each(['CUSTOMER', 'RESTAURANT', 'DRIVER', 'ADMIN'] as Role[])(
  'guest route redirects %s to its own dashboard',
  async (role) => {
    const session = new Session(gateway(account(role)), immediateLock);
    await session.restore();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider session={session}>
          <Routes>
            <Route element={<GuestOnlyRoute />}>
              <Route path="/login" element={<p>Login</p>} />
            </Route>
            <Route path={roleHome[role]} element={<p>Correct role</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Correct role')).toBeVisible();
  },
);
it('anonymous is directed to login', async () => {
  const { session } = anonymousSession();
  await session.restore().catch(() => {});
  render(
    <MemoryRouter initialEntries={['/private']}>
      <AuthProvider session={session}>
        <Routes>
          <Route element={<AuthenticatedRoute />}>
            <Route path="/private" element={<p>Private</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText('Login page')).toBeVisible();
});
it('wrong role sees forbidden instead of an admin layout', async () => {
  const session = new Session(gateway(), immediateLock);
  await session.restore();
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider session={session}>
        <Routes>
          <Route element={<RoleProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<p>Private admin</p>} />
          </Route>
          <Route path="/403" element={<p>Forbidden</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText('Forbidden')).toBeVisible();
  expect(screen.queryByText('Private admin')).not.toBeInTheDocument();
});
it('does not show private UI during restoration', () => {
  const g = gateway();
  g.refresh = () => new Promise(() => {});
  const session = new Session(g, immediateLock);
  render(
    <MemoryRouter>
      <AuthProvider session={session}>
        <Routes>
          <Route element={<SessionGate />}>
            <Route path="/" element={<p>Private fixture</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Đang xác minh');
  expect(screen.queryByText('Private fixture')).not.toBeInTheDocument();
});
