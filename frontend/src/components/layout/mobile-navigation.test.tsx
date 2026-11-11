import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { PublicLayout } from './PublicLayout';

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'anonymous', account: null }),
}));

it('focuses pointer-opened navigation so Escape works on browsers that do not focus clicked buttons', () => {
  render(
    <MemoryRouter>
      <PublicLayout />
    </MemoryRouter>,
  );
  const trigger = screen.getByRole('button', { name: 'Mở điều hướng' });
  trigger.blur();
  // fireEvent deliberately models WebKit's pointer click without automatic focus.
  fireEvent.click(trigger);
  expect(screen.getByRole('navigation', { name: 'Điều hướng di động' })).toBeVisible();
  expect(trigger).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('navigation', { name: 'Điều hướng di động' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mở điều hướng' })).toHaveFocus();
});
