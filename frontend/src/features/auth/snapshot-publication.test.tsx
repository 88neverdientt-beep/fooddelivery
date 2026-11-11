import { act, render, screen } from '@testing-library/react';
import { flushSync } from 'react-dom';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';
import type { Session, SessionState } from './session';
import { account } from '@/test/fixtures';
import { AuthenticatedRoute, RoleProtectedRoute } from '@/app/guards';

afterEach(() => vi.restoreAllMocks());

it.each(['logout', 'switch-role'] as const)(
  'publishes %s atomically to route guards and protected children',
  async (event) => {
    let state: SessionState = {
      status: 'authenticated',
      account: account('ADMIN'),
      accessToken: 'fixture-memory-only',
      refreshing: false,
      generation: 1,
      error: null,
    };
    const listeners = new Set<() => void>();
    const store = {
      start: () => {},
      verify: async () => {},
      getSnapshot: () => state,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    } as unknown as Session;
    function ProtectedChild() {
      if (useAuth().account?.role !== 'ADMIN')
        throw new Error('Protected child observed invalid identity');
      return <p>Private admin fixture</p>;
    }
    const router = createMemoryRouter(
      [
        {
          element: <AuthenticatedRoute />,
          errorElement: <p>Unexpected route crash</p>,
          children: [
            {
              element: <RoleProtectedRoute role="ADMIN" />,
              children: [{ path: '/admin', element: <ProtectedChild /> }],
            },
          ],
        },
        { path: '/login', element: <p>Login destination</p> },
        { path: '/403', element: <p>Forbidden destination</p> },
      ],
      { initialEntries: ['/admin'] },
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AuthProvider session={store}>
        <RouterProvider router={router} />
      </AuthProvider>,
    );
    expect(await screen.findByText('Private admin fixture')).toBeVisible();
    await act(async () => {
      state = {
        ...state,
        generation: 2,
        status: event === 'logout' ? 'anonymous' : 'authenticated',
        account: event === 'logout' ? null : account('CUSTOMER', 2),
      };
      // External-store notifications may flush synchronously between subscribers.
      // The protected subtree must never see a different snapshot than its guards.
      listeners.forEach((listener) => flushSync(listener));
    });
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.queryByText('Private admin fixture')).not.toBeInTheDocument();
    expect(screen.queryByText('Unexpected route crash')).not.toBeInTheDocument();
    expect(
      await screen.findByText(event === 'logout' ? 'Login destination' : 'Forbidden destination'),
    ).toBeVisible();
  },
);
