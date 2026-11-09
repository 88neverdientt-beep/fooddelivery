import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartItemRow, CartSummary } from './CartComponents';
import { cartFixture } from './testFixtures';

it('CartItem presents only server unit/line prices and labels its illustration', () => {
  render(<CartItemRow item={cartFixture.cartItems[0]} onQuantity={() => {}} onRemove={() => {}} />);
  expect(screen.getByRole('heading', { name: 'Phở thử nghiệm' })).toBeVisible();
  expect(screen.getByAltText('Ảnh minh họa món ăn')).toBeVisible();
  expect(screen.getByText('Ảnh minh họa')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Giảm số lượng Phở thử nghiệm' })).toBeDisabled();
});
it('CartItem updates quantity only with a positive integer and exposes validation', async () => {
  const change = vi.fn();
  render(<CartItemRow item={cartFixture.cartItems[0]} onQuantity={change} onRemove={() => {}} />);
  const quantity = screen.getByRole('spinbutton', { name: 'Số lượng Phở thử nghiệm' });
  await userEvent.clear(quantity);
  await userEvent.type(quantity, '0');
  await userEvent.click(screen.getByRole('button', { name: 'Cập nhật' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Chọn ít nhất 1 phần');
  expect(quantity).toHaveAttribute('aria-invalid', 'true');
  expect(change).not.toHaveBeenCalled();
  await userEvent.clear(quantity);
  await userEvent.type(quantity, '4');
  await userEvent.click(screen.getByRole('button', { name: 'Cập nhật' }));
  expect(change).toHaveBeenCalledExactlyOnceWith(4);
});
it('CartItem disables every mutation control while another write is running', () => {
  render(
    <CartItemRow
      item={cartFixture.cartItems[0]}
      disabled
      onQuantity={() => {}}
      onRemove={() => {}}
    />,
  );
  for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  expect(screen.getByRole('spinbutton')).toBeDisabled();
});
it('CartSummary displays authoritative totals rather than recomputing prices', () => {
  render(<CartSummary cart={{ ...cartFixture, totalAmount: 98765 }} />);
  expect(screen.getByText(/98\.765/)).toBeVisible();
  expect(screen.queryByText(/35\.000/)).not.toBeInTheDocument();
  expect(screen.getByText('Phí giao hàng')).toBeVisible();
});
