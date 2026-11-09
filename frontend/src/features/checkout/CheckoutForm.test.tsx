import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutForm } from './CheckoutForm';
import { codFixture } from './testFixtures';

it('CheckoutForm exposes linked address validation and submits the selected real method', async () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  render(<CheckoutForm methods={[codFixture]} onSubmit={submit} />);
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng COD' }));
  const address = screen.getByLabelText('Địa chỉ giao hàng');
  expect(address).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('Vui lòng nhập địa chỉ giao hàng.')).toBeVisible();
  expect(submit).not.toHaveBeenCalled();
  await userEvent.type(address, '12 Hà Nội');
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng COD' }));
  expect(submit.mock.calls[0][0]).toEqual({ deliveryAddress: '12 Hà Nội', paymentMethodId: 61 });
});
it('CheckoutForm preloads one profile address without an invented saved-address book', () => {
  render(
    <CheckoutForm
      initialAddress="Địa chỉ từ hồ sơ"
      methods={[codFixture]}
      onSubmit={async () => {}}
    />,
  );
  expect(screen.getByLabelText('Địa chỉ giao hàng')).toHaveValue('Địa chỉ từ hồ sơ');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
it('CheckoutForm disables unsafe repeat submit while pending and rejects empty methods', () => {
  const view = render(<CheckoutForm methods={[codFixture]} busy onSubmit={async () => {}} />);
  expect(screen.getByRole('button', { name: 'Xác nhận đặt hàng COD' })).toBeDisabled();
  expect(screen.getByLabelText('Địa chỉ giao hàng')).toBeDisabled();
  view.rerender(<CheckoutForm methods={[]} onSubmit={async () => {}} />);
  expect(screen.getByRole('button', { name: 'Xác nhận đặt hàng COD' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('chưa có phương thức COD');
});
