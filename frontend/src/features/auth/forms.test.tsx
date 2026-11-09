import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { LoginPage, RegisterPage } from './AuthPages';
import { anonymousSession } from '@/test/fixtures';
import { ApiError } from '@/lib/api/http';
function mount(register = false) {
  const fixture = anonymousSession();
  render(
    <MemoryRouter initialEntries={[register ? '/register' : '/login']}>
      <AuthProvider session={fixture.session}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/customer" element={<h1>Customer fixture</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return fixture;
}
it('login shows linked validation errors before submitting', async () => {
  const { api } = mount();
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByText('Vui lòng nhập mật khẩu.')).toBeVisible();
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  expect(api.login).not.toHaveBeenCalled();
});
it('password visibility is keyboard-accessible and preserves the value', async () => {
  mount();
  const input = screen.getByLabelText('Mật khẩu', { exact: true });
  await userEvent.type(input, 'Private fixture');
  await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveValue('Private fixture');
  await userEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
  expect(input).toHaveAttribute('type', 'password');
});
it('login redirects by server account role', async () => {
  const { api } = mount();
  await userEvent.type(screen.getByLabelText('Email'), 'user1@test.example');
  await userEvent.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'Fixture long password');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByRole('heading', { name: 'Customer fixture' })).toBeVisible();
  expect(api.login).toHaveBeenCalledTimes(1);
});
it('failed login uses Vietnamese generic errors without SQL detail', async () => {
  const { api } = mount();
  api.login = vi.fn().mockRejectedValue(new ApiError(401, '401'));
  await userEvent.type(screen.getByLabelText('Email'), 'user1@test.example');
  await userEvent.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'wrong fixture');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu chưa đúng');
});
it('disables submit while login is pending', async () => {
  const { api } = mount();
  api.login = vi.fn(() => new Promise<never>(() => {}));
  await userEvent.type(screen.getByLabelText('Email'), 'user1@test.example');
  await userEvent.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'Fixture long password');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled());
});
it('register validates matching passwords and backend-required fields', async () => {
  const { api } = mount(true);
  await userEvent.type(
    screen.getByLabelText('Mật khẩu', { exact: true }),
    'A long fixture password',
  );
  await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu'), 'Other password');
  await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản khách hàng' }));
  expect(await screen.findByText('Mật khẩu xác nhận chưa khớp.')).toBeVisible();
  expect(api.register).not.toHaveBeenCalled();
});
it('register sends only Customer DTO fields and handles duplicate email', async () => {
  const { api } = mount(true);
  api.register = vi.fn().mockRejectedValue(new ApiError(409, '409'));
  for (const [label, value] of [
    ['Họ và tên', 'Nguyễn An'],
    ['Email', 'new@test.example'],
    ['Số điện thoại', '0900000011'],
    ['Địa chỉ', 'Hà Nội'],
    ['Mật khẩu', 'A long fixture password'],
    ['Xác nhận mật khẩu', 'A long fixture password'],
  ])
    await userEvent.type(screen.getByLabelText(label, { exact: true }), value);
  await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản khách hàng' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email này đã được sử dụng');
  expect(api.register).toHaveBeenCalledWith({
    name: 'Nguyễn An',
    email: 'new@test.example',
    phoneNumber: '0900000011',
    address: 'Hà Nội',
    password: 'A long fixture password',
  });
});
