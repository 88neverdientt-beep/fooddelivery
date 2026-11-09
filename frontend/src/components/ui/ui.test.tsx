import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Button, Tabs, Checkbox } from './index';
import { ErrorBoundary, StatusPage, EmptyState } from '@/components/feedback';
it('dialog handles focus, Escape and returns focus to its trigger', async () => {
  render(
    <ConfirmDialog
      trigger={<Button>Open</Button>}
      title="Confirm action"
      description="Dialog fixture"
      confirm="Confirm"
      onConfirm={async () => {}}
    />,
  );
  const trigger = screen.getByRole('button', { name: 'Open' });
  await userEvent.click(trigger);
  expect(screen.getByRole('dialog')).toBeVisible();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
it('tabs support arrow keys and expose selection', async () => {
  const change = vi.fn();
  render(
    <Tabs
      label="Fixture tabs"
      value="one"
      onChange={change}
      items={[
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two' },
      ]}
    />,
  );
  screen.getByRole('tab', { name: 'One' }).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(change).toHaveBeenCalledWith('two');
  expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus();
});
it('native checkbox has an accessible label', async () => {
  render(<Checkbox>Fixture consent</Checkbox>);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Fixture consent' }));
  expect(screen.getByRole('checkbox')).toBeChecked();
});
it('error boundary hides implementation details', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): never {
    throw new Error('Internal private fixture');
  }
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('alert')).not.toHaveTextContent('Internal private fixture');
});
it('renders explicit forbidden, not found and empty states', () => {
  const view = render(
    <MemoryRouter>
      <StatusPage forbidden />
    </MemoryRouter>,
  );
  expect(screen.getByText('403')).toBeVisible();
  view.rerender(
    <MemoryRouter>
      <StatusPage />
    </MemoryRouter>,
  );
  expect(screen.getByText('404')).toBeVisible();
  view.rerender(<EmptyState title="No fixture" description="Nothing available" />);
  expect(screen.getByText('Nothing available')).toBeVisible();
});
