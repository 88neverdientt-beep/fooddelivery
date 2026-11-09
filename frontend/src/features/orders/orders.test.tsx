import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { account, gateway, immediateLock } from '@/test/fixtures';
import { ApiError, type Transport } from '@/lib/api/http';
import { ordersApi, createOrdersApi, orderKeys } from './api';
import { OrderCard, OrderContents, OrderPaymentDelivery, OrderTimeline } from './OrderComponents';
import { OrderDetailPage, OrdersPage, DeliveryAddressForm } from './OrderPages';
import {
  addressSchema,
  canCancelOrder,
  canEditAddress,
  formatOrderDate,
  orderSchema,
  orderStatusSchema,
  parseOrderId,
  terminalOrder,
  type Order,
} from './model';

export const sampleOrder = (patch: Partial<Order> = {}): Order => ({
  orderId: 17,
  deliveryAddress: '12 Phố Huế, Hà Nội',
  subtotal: 90000,
  shippingFee: 15000,
  totalAmount: 105000,
  orderStatus: 'PENDING',
  createdAt: '2026-11-09T12:30:00',
  customer: { customerId: 1, name: 'Customer test' },
  restaurant: { restaurantId: 8, name: 'Bếp Hà Nội' },
  orderDetails: [
    {
      orderDetailId: 20,
      foodItemName: 'Phở bò',
      quantity: 2,
      unitPrice: 45000,
      subtotalItem: 90000,
      note: null,
    },
  ],
  deliveryOutputDTO: null,
  paymentResponseDTO: {
    paymentId: 31,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    amount: 105000,
    paidAt: null,
    refundedAt: null,
  },
  ...patch,
});
const pageOf = (orders: Order[]) => ({
  items: orders,
  page: 0,
  size: 12,
  totalElements: orders.length,
  totalPages: orders.length ? 1 : 0,
});
describe('order rules and DTOs', () => {
  it('accepts every actual enum and rejects invented delivered OrderStatus', () => {
    for (const value of [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'DELIVERING',
      'COMPLETED',
      'CANCELLED',
    ])
      expect(orderStatusSchema.safeParse(value).success).toBe(true);
    expect(orderStatusSchema.safeParse('DELIVERED').success).toBe(false);
  });
  it('keeps order, delivery and payment statuses independent', () => {
    const order = sampleOrder({
      orderStatus: 'CONFIRMED',
      deliveryOutputDTO: {
        deliveryId: 1,
        deliveryStatus: 'PENDING',
        pickupTime: null,
        deliveredTime: null,
      },
    });
    expect(orderSchema.parse(order).paymentResponseDTO?.paymentStatus).toBe('PENDING');
    expect(canCancelOrder(order)).toBe(true);
  });
  it('does not cancel a paid or already picked-up order', () => {
    const order = sampleOrder();
    expect(
      canCancelOrder({
        ...order,
        paymentResponseDTO: { ...order.paymentResponseDTO!, paymentStatus: 'SUCCESS' },
      }),
    ).toBe(false);
    expect(
      canCancelOrder({
        ...order,
        orderStatus: 'CONFIRMED',
        deliveryOutputDTO: {
          deliveryId: 1,
          deliveryStatus: 'PICKED_UP',
          pickupTime: '2026-11-09T12:30:00',
          deliveredTime: null,
        },
      }),
    ).toBe(false);
  });
  it('locks address and cancellation after confirmed', () => {
    for (const status of orderStatusSchema.options) {
      const order = sampleOrder({ orderStatus: status });
      expect(canEditAddress(order)).toBe(['PENDING', 'CONFIRMED'].includes(status));
      expect(canCancelOrder(order)).toBe(['PENDING', 'CONFIRMED'].includes(status));
      expect(terminalOrder(status)).toBe(['COMPLETED', 'CANCELLED'].includes(status));
    }
  });
  it('validates nonblank trimmed addresses at the actual 255-character boundary', () => {
    expect(addressSchema.parse({ deliveryAddress: '  Hà Nội  ' }).deliveryAddress).toBe('Hà Nội');
    expect(addressSchema.safeParse({ deliveryAddress: ' ' }).success).toBe(false);
    expect(addressSchema.safeParse({ deliveryAddress: 'a'.repeat(255) }).success).toBe(true);
    expect(addressSchema.safeParse({ deliveryAddress: 'a'.repeat(256) }).success).toBe(false);
  });
  it('rejects invalid route IDs and supports only safe positive integers', () => {
    for (const value of [undefined, '', '0', '-1', '1.5', '1e2', '01', 'abc', '9007199254740992'])
      expect(parseOrderId(value)).toBeNull();
    expect(parseOrderId('17')).toBe(17);
  });
  it('does not fabricate missing or invalid timestamps', () => {
    expect(formatOrderDate(null)).toBe('Chưa ghi nhận');
    expect(formatOrderDate('invalid')).toBe('Chưa ghi nhận');
  });
});
describe('order API integration', () => {
  it('loads server pages and explicit status, never a whole unbounded history', async () => {
    const transport = vi.fn().mockResolvedValue(pageOf([sampleOrder()]));
    const api = createOrdersApi(transport as Transport);
    await api.page(1, { page: 0, size: 12, status: 'COMPLETED' });
    expect(transport).toHaveBeenLastCalledWith(
      '/customers/1/orders/page?page=0&size=12&status=COMPLETED',
      { signal: undefined },
    );
    await api.list(1);
    expect(transport).toHaveBeenLastCalledWith('/customers/1/orders/page?page=0&size=50', {
      signal: undefined,
    });
  });
  it('sends only the address field and does not accept prices or identity from a form', async () => {
    const transport = vi.fn().mockResolvedValue(sampleOrder());
    await createOrdersApi(transport as Transport).updateAddress(17, '  New address  ');
    expect(transport).toHaveBeenCalledExactlyOnceWith('/orders/17/delivery-address', {
      method: 'PUT',
      body: { deliveryAddress: 'New address' },
    });
  });
  it('sends cancel PATCH without an invented status payload', async () => {
    const transport = vi.fn().mockResolvedValue(sampleOrder({ orderStatus: 'CANCELLED' }));
    await createOrdersApi(transport as Transport).cancel(17);
    expect(transport).toHaveBeenCalledExactlyOnceWith('/orders/17/cancel', { method: 'PATCH' });
  });
  it('reads detail/payment and propagates denied requests without retry', async () => {
    const denied = new ApiError(404, '404'),
      transport = vi.fn().mockRejectedValue(denied);
    const api = createOrdersApi(transport as Transport);
    await expect(api.detail(999)).rejects.toBe(denied);
    expect(transport).toHaveBeenCalledTimes(1);
    transport.mockResolvedValueOnce(sampleOrder().paymentResponseDTO);
    await api.payment(17);
    expect(transport).toHaveBeenLastCalledWith('/payments/orders/17', { signal: undefined });
  });
  it('rejects malformed server responses rather than inventing an order', async () => {
    const api = createOrdersApi(vi.fn().mockResolvedValue({ orderId: 17 }) as Transport);
    await expect(api.detail(17)).rejects.toMatchObject({ code: 'CONTRACT', status: 502 });
  });
  it('scopes private query keys by account', () => {
    expect(orderKeys.detail(1, 17)).not.toEqual(orderKeys.detail(2, 17));
    expect(orderKeys.page(1, 0, '')).not.toEqual(orderKeys.page(2, 0, ''));
  });
});
describe('order components', () => {
  it('renders an OrderCard with server total and a real ID link', () => {
    render(
      <MemoryRouter>
        <OrderCard order={sampleOrder()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Bếp Hà Nội' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Xem chi tiết/ })).toHaveAttribute(
      'href',
      '/customer/orders/17',
    );
    expect(screen.getByText(/105\.000/)).toBeVisible();
  });
  it('presents exact server amount breakdown rather than a hardcoded shipping fee', () => {
    render(<OrderContents order={sampleOrder({ shippingFee: 23000, totalAmount: 113000 })} />);
    expect(screen.getByText(/23\.000/)).toBeVisible();
    expect(screen.getByText(/113\.000/)).toBeVisible();
    expect(screen.queryByText(/15\.000/)).not.toBeInTheDocument();
  });
  it('maps current order step without marking future stages complete or creating timestamps', () => {
    render(<OrderTimeline order={sampleOrder({ orderStatus: 'PREPARING' })} />);
    const step = screen.getByText('Đang chuẩn bị món').closest('li');
    expect(step).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Đã hoàn thành').closest('li')).not.toHaveClass('done');
    expect(screen.getAllByText('Trạng thái hiện tại')).toHaveLength(1);
  });
  it('does not present a cancelled order as completed', () => {
    render(<OrderTimeline order={sampleOrder({ orderStatus: 'CANCELLED' })} />);
    expect(screen.getByText('Đơn hàng đã hủy')).toBeVisible();
    expect(screen.queryByText('Đã hoàn thành')).not.toBeInTheDocument();
  });
  it('handles missing delivery and payment safely', () => {
    render(<OrderPaymentDelivery order={sampleOrder({ paymentResponseDTO: null })} />);
    expect(screen.getByText('Chưa có chuyến giao được ghi nhận')).toBeVisible();
    expect(screen.getByText('Chưa có thông tin thanh toán được ghi nhận.')).toBeVisible();
  });
  it('validates address and confirms before sending it', async () => {
    const save = vi.fn().mockResolvedValue(undefined),
      user = userEvent.setup();
    render(
      <DeliveryAddressForm address="Old address" busy={false} onSave={save} onCancel={vi.fn()} />,
    );
    await user.clear(screen.getByLabelText('Địa chỉ giao hàng mới'));
    await user.type(screen.getByLabelText('Địa chỉ giao hàng mới'), 'New address');
    await user.click(screen.getByRole('button', { name: 'Lưu địa chỉ' }));
    expect(save).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Xác nhận đổi địa chỉ' }));
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith('New address'));
  });
});
async function renderOrderPage(ui: React.ReactNode, path: string, route: string) {
  const a = account();
  const session = new Session(gateway(a), immediateLock);
  await session.login({ email: a.email, password: 'test-only-value' });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider session={session}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={ui} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { client, session };
}
describe('order page integration', () => {
  it('loads own server-paged history and changes status via a new server query', async () => {
    const read = vi.spyOn(ordersApi, 'page').mockResolvedValue(pageOf([sampleOrder()]));
    await renderOrderPage(<OrdersPage />, '/customer/orders', '/customer/orders');
    expect(await screen.findByRole('heading', { name: 'Bếp Hà Nội' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Lọc trạng thái đơn'), {
      target: { value: 'COMPLETED' },
    });
    await waitFor(() =>
      expect(read).toHaveBeenLastCalledWith(
        1,
        { page: 0, size: 12, status: 'COMPLETED' },
        expect.any(AbortSignal),
      ),
    );
  });
  it('conceals a mismatched response owner', async () => {
    vi.spyOn(ordersApi, 'detail').mockResolvedValue(
      sampleOrder({ customer: { customerId: 2, name: 'Other private name' } }),
    );
    await renderOrderPage(<OrderDetailPage />, '/customer/orders/17', '/customer/orders/:id');
    expect(await screen.findByText('Không tìm thấy thông tin')).toBeVisible();
    expect(screen.queryByText('Other private name')).not.toBeInTheDocument();
    expect(screen.queryByText('12 Phố Huế, Hà Nội')).not.toBeInTheDocument();
  });
  it('cancels once after confirmation, refreshes server state and hides invalid actions', async () => {
    const cancelled = sampleOrder({ orderStatus: 'CANCELLED' });
    vi.spyOn(ordersApi, 'detail').mockResolvedValueOnce(sampleOrder()).mockResolvedValue(cancelled);
    const cancel = vi.spyOn(ordersApi, 'cancel').mockResolvedValue(cancelled),
      user = userEvent.setup();
    await renderOrderPage(<OrderDetailPage />, '/customer/orders/17', '/customer/orders/:id');
    await user.click(await screen.findByRole('button', { name: 'Hủy đơn hàng' }));
    expect(cancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }));
    await waitFor(() => expect(cancel).toHaveBeenCalledExactlyOnceWith(17));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Hủy đơn hàng' })).not.toBeInTheDocument(),
    );
  });
  it('does not refetch a nonterminal order on an interval while the tab is hidden', async () => {
    const read = vi.spyOn(ordersApi, 'detail').mockResolvedValue(sampleOrder());
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await renderOrderPage(<OrderDetailPage />, '/customer/orders/17', '/customer/orders/:id');
    await screen.findByRole('heading', { name: 'Đơn hàng #17' });
    vi.useFakeTimers();
    try {
      await act(async () => {
        vi.advanceTimersByTime(45000);
      });
      expect(read).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    }
  });
  it('writes a late mutation response only to the originating order after navigation', async () => {
    const other = sampleOrder({
      orderId: 18,
      restaurant: { restaurantId: 9, name: 'Another restaurant' },
    });
    vi.spyOn(ordersApi, 'detail').mockImplementation(async (id) =>
      id === 17 ? sampleOrder() : other,
    );
    let finish!: (order: Order) => void;
    const cancel = vi.spyOn(ordersApi, 'cancel').mockImplementation(
      () =>
        new Promise<Order>((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    const { client } = await renderOrderPage(
      <>
        <Link to="/customer/orders/18">Open another order</Link>
        <OrderDetailPage />
      </>,
      '/customer/orders/17',
      '/customer/orders/:id',
    );
    await user.click(await screen.findByRole('button', { name: 'Hủy đơn hàng' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }));
    await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('link', { name: 'Open another order' }));
    await screen.findByRole('heading', { name: 'Đơn hàng #18' });
    const setData = vi.spyOn(client, 'setQueryData');
    const cancelled = sampleOrder({ orderStatus: 'CANCELLED' });
    await act(async () => {
      finish(cancelled);
    });
    await waitFor(() => expect(setData).toHaveBeenCalledWith(orderKeys.detail(1, 17), cancelled));
    expect(setData).not.toHaveBeenCalledWith(orderKeys.detail(1, 18), cancelled);
    expect(screen.getByRole('heading', { name: 'Đơn hàng #18' })).toBeVisible();
  });
});
