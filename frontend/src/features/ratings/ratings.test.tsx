import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Session } from '@/features/auth/session';
import { ToastProvider } from '@/components/feedback';
import { account, anonymousSession, gateway, immediateLock } from '@/test/fixtures';
import { ApiError, type Transport } from '@/lib/api/http';
import { ordersApi } from '@/features/orders/api';
import type { Order } from '@/features/orders/model';
import { createRatingsApi, ratingsApi, ratingKeys } from './api';
import { RatingForm } from './RatingForm';
import { MyRatingsPage, RatingCard, RestaurantRatings } from './RatingPages';
import { isOwnRating, MAX_COMMENT_BYTES, ratingInputSchema, type Rating } from './model';
const review = (patch: Partial<Rating> = {}): Rating => ({
  ratingId: 41,
  ratingScore: 4,
  comment: 'Món ngon và giao cẩn thận.',
  createdAt: '2026-11-09T12:30:00',
  customerOutputDTO: { customerId: 1, name: 'Customer' },
  ...patch,
});
const reviewsPage = (items: Rating[]) => ({
  items,
  page: 0,
  size: 12,
  totalElements: items.length,
  totalPages: items.length ? 1 : 0,
});
const completedOrder = (patch: Partial<Order> = {}): Order => ({
  orderId: 17,
  deliveryAddress: 'Test address',
  subtotal: 45000,
  shippingFee: 15000,
  totalAmount: 60000,
  orderStatus: 'COMPLETED',
  createdAt: '2026-11-09T12:30:00',
  customer: { customerId: 1, name: 'Test customer' },
  restaurant: { restaurantId: 8, name: 'Bếp Hà Nội' },
  orderDetails: [],
  deliveryOutputDTO: null,
  paymentResponseDTO: null,
  ...patch,
});
describe('rating validation and ownership', () => {
  it('allows integer stars 1..5 and optional empty comment', () => {
    for (const score of [1, 2, 3, 4, 5])
      expect(ratingInputSchema.safeParse({ ratingScore: score, comment: '' }).success).toBe(true);
    for (const score of [0, -1, 6, 3.5, NaN])
      expect(ratingInputSchema.safeParse({ ratingScore: score, comment: '' }).success).toBe(false);
  });
  it('uses actual TEXT UTF-8 storage capacity, not a guessed 255-character limit', () => {
    expect(
      ratingInputSchema.safeParse({ ratingScore: 5, comment: 'a'.repeat(MAX_COMMENT_BYTES) })
        .success,
    ).toBe(true);
    expect(
      ratingInputSchema.safeParse({ ratingScore: 5, comment: 'a'.repeat(MAX_COMMENT_BYTES + 1) })
        .success,
    ).toBe(false);
    const text = '🍜'.repeat(16383) + 'abc';
    expect(new TextEncoder().encode(text).length).toBe(MAX_COMMENT_BYTES);
    expect(ratingInputSchema.safeParse({ ratingScore: 5, comment: text }).success).toBe(true);
    expect(ratingInputSchema.safeParse({ ratingScore: 5, comment: text + 'x' }).success).toBe(
      false,
    );
  });
  it('never treats an anonymous or other customer review as owned', () => {
    expect(isOwnRating(review(), null)).toBe(false);
    expect(isOwnRating(review(), 2)).toBe(false);
    expect(isOwnRating(review(), 1)).toBe(true);
  });
  it('keeps private review keys isolated by account and apart from public keys', () => {
    expect(ratingKeys.page(8, 0, 1)).not.toEqual(ratingKeys.page(8, 0, 2));
    expect(ratingKeys.page(8, 0, 1)).not.toEqual(ratingKeys.page(8, 0));
  });
});
describe('rating API integration', () => {
  it('loads public pages using the public transport', async () => {
    const publicRead = vi.fn().mockResolvedValue(reviewsPage([review()])),
      protectedRead = vi.fn();
    await createRatingsApi(publicRead as Transport, protectedRead as Transport).page(8, {
      page: 0,
      size: 12,
    });
    expect(publicRead).toHaveBeenCalledExactlyOnceWith(
      '/restaurants/8/ratings/page?page=0&size=12',
      { signal: undefined },
    );
    expect(protectedRead).not.toHaveBeenCalled();
  });
  it('uses mine=true with Bearer transport without a caller-chosen owner filter', async () => {
    const protectedRead = vi.fn().mockResolvedValue(reviewsPage([review()])),
      publicRead = vi.fn();
    await createRatingsApi(publicRead as Transport, protectedRead as Transport).page(8, {
      page: 1,
      size: 12,
      mine: true,
    });
    expect(protectedRead).toHaveBeenCalledExactlyOnceWith(
      '/restaurants/8/ratings/page?page=1&size=12&mine=true',
      { signal: undefined },
    );
    expect(publicRead).not.toHaveBeenCalled();
  });
  it('creates with only validated rating fields and the verified customer profile ID', async () => {
    const write = vi.fn().mockResolvedValue(review());
    await createRatingsApi(vi.fn() as Transport, write as Transport).create(8, 1, {
      ratingScore: 4,
      comment: 'Rất ngon',
    });
    expect(write).toHaveBeenCalledExactlyOnceWith('/restaurants/8/ratings', {
      method: 'POST',
      body: { customerId: 1, ratingScore: 4, comment: 'Rất ngon' },
    });
  });
  it('updates without role/account/restaurant IDs in the body and deletes once', async () => {
    const write = vi
      .fn()
      .mockResolvedValueOnce(review())
      .mockResolvedValueOnce('Delete succesfully!');
    const api = createRatingsApi(vi.fn() as Transport, write as Transport);
    await api.update(41, 1, { ratingScore: 3, comment: '' });
    expect(write).toHaveBeenNthCalledWith(1, '/ratings/41/customers/1', {
      method: 'PUT',
      body: { ratingScore: 3, comment: '' },
    });
    await api.remove(41, 1);
    expect(write).toHaveBeenNthCalledWith(2, '/ratings/41/customers/1', { method: 'DELETE' });
  });
  it('propagates unauthorized/missing review errors without retry', async () => {
    const error = new ApiError(404, '404'),
      write = vi.fn().mockRejectedValue(error);
    await expect(
      createRatingsApi(vi.fn() as Transport, write as Transport).update(41, 2, {
        ratingScore: 3,
        comment: '',
      }),
    ).rejects.toBe(error);
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed page and average payloads', async () => {
    const api = createRatingsApi(vi.fn().mockResolvedValue(99) as Transport, vi.fn() as Transport);
    await expect(api.page(8, { page: 0, size: 12 })).rejects.toMatchObject({ code: 'CONTRACT' });
    await expect(api.average(8)).rejects.toMatchObject({ code: 'CONTRACT' });
  });
});
describe('rating components', () => {
  it('selects stars and submits only rating data', async () => {
    const submit = vi.fn().mockResolvedValue(undefined),
      user = userEvent.setup();
    render(<RatingForm onSubmit={submit} />);
    await user.click(screen.getByRole('radio', { name: '3 sao' }));
    await user.type(screen.getByLabelText(/Nhận xét của bạn/), 'Thơm ngon');
    await user.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledExactlyOnceWith({ ratingScore: 3, comment: 'Thơm ngon' }),
    );
  });
  it('disables all edits and submit while an unsafe request is pending', () => {
    render(<RatingForm busy onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Gửi đánh giá' })).toBeDisabled();
    expect(screen.getByLabelText(/Nhận xét của bạn/)).toBeDisabled();
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });
  it('loads existing values for editing and leaves errors visible', () => {
    render(
      <RatingForm
        initial={{ ratingScore: 2, comment: 'Cần cải thiện' }}
        error="Chưa thể lưu."
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('radio', { name: '2 sao' })).toBeChecked();
    expect(screen.getByLabelText(/Nhận xét của bạn/)).toHaveValue('Cần cải thiện');
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa thể lưu.');
  });
  it('escapes user HTML and does not show owner-only actions on another review', () => {
    const { container } = render(
      <RatingCard
        rating={review({ comment: '<img src=x onerror=alert(1)>' })}
        own={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sửa đánh giá' })).not.toBeInTheDocument();
  });
  it('requires confirmation before deleting an owned review', async () => {
    const remove = vi.fn().mockResolvedValue(undefined),
      user = userEvent.setup();
    render(<RatingCard rating={review()} own onEdit={vi.fn()} onDelete={remove} />);
    await user.click(screen.getByRole('button', { name: 'Xóa đánh giá' }));
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa đánh giá' }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
  });
});
async function renderRatingPage(
  ui: React.ReactNode,
  path = '/restaurants/8?reviewOrder=17',
  anonymous = false,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const a = account();
  const session = anonymous
    ? anonymousSession().session
    : new Session(gateway(a), immediateLock, () => {
        void client.cancelQueries();
        client.clear();
      });
  if (!anonymous) await session.login({ email: a.email, password: 'test-only-value' });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider session={session}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { client, session };
}
describe('rating page integration', () => {
  it('loads public bounded reviews and actual average without an anonymous form', async () => {
    const read = vi.spyOn(ratingsApi, 'page').mockResolvedValue(reviewsPage([review()]));
    vi.spyOn(ratingsApi, 'average').mockResolvedValue(4);
    await renderRatingPage(<RestaurantRatings restaurantId={8} />, '/restaurants/8', true);
    expect(await screen.findByText('Món ngon và giao cẩn thận.')).toBeVisible();
    expect(read).toHaveBeenCalledExactlyOnceWith(
      8,
      { page: 0, size: 12, mine: false },
      expect.any(AbortSignal),
    );
    expect(screen.getByRole('link', { name: 'Đăng nhập để đánh giá' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).not.toBeInTheDocument();
  });
  it('enables create only after a real owned completed order matches the restaurant', async () => {
    vi.spyOn(ratingsApi, 'page').mockResolvedValue(reviewsPage([]));
    vi.spyOn(ratingsApi, 'average').mockResolvedValue(0);
    vi.spyOn(ordersApi, 'detail').mockResolvedValue(completedOrder());
    const create = vi.spyOn(ratingsApi, 'create').mockResolvedValue(review()),
      user = userEvent.setup();
    await renderRatingPage(<RestaurantRatings restaurantId={8} />);
    await user.type(await screen.findByLabelText(/Nhận xét của bạn/), 'Rất ngon');
    await user.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledExactlyOnceWith(8, 1, { ratingScore: 5, comment: 'Rất ngon' }),
    );
    expect(await screen.findByText('Đã gửi đánh giá của bạn.')).toBeVisible();
  });
  it('does not create from a pending or another customer order', async () => {
    vi.spyOn(ratingsApi, 'page').mockResolvedValue(reviewsPage([]));
    vi.spyOn(ratingsApi, 'average').mockResolvedValue(0);
    vi.spyOn(ordersApi, 'detail').mockResolvedValue(completedOrder({ orderStatus: 'PENDING' }));
    await renderRatingPage(<RestaurantRatings restaurantId={8} />);
    await waitFor(() =>
      expect(screen.queryByText('Đang kiểm tra đơn hàng đủ điều kiện…')).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem đơn đã hoàn thành' })).toBeVisible();
  });
  it('conceals invalid proof ownership and never displays the private order name', async () => {
    vi.spyOn(ratingsApi, 'page').mockResolvedValue(reviewsPage([]));
    vi.spyOn(ratingsApi, 'average').mockResolvedValue(0);
    vi.spyOn(ordersApi, 'detail').mockResolvedValue(
      completedOrder({ customer: { customerId: 2, name: 'Private other customer' } }),
    );
    await renderRatingPage(<RestaurantRatings restaurantId={8} />);
    expect(await screen.findByText(/Không thể xác minh đơn hàng được chọn/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).not.toBeInTheDocument();
    expect(screen.queryByText('Private other customer')).not.toBeInTheDocument();
  });
  it('allows edits only on the verified customer review', async () => {
    vi.spyOn(ratingsApi, 'page').mockResolvedValue(
      reviewsPage([
        review(),
        review({
          ratingId: 42,
          customerOutputDTO: { customerId: 2, name: 'Customer' },
          comment: 'Another review',
        }),
      ]),
    );
    vi.spyOn(ratingsApi, 'average').mockResolvedValue(4);
    const update = vi.spyOn(ratingsApi, 'update').mockResolvedValue(review({ ratingScore: 3 })),
      user = userEvent.setup();
    await renderRatingPage(<RestaurantRatings restaurantId={8} />, '/restaurants/8');
    await user.click(await screen.findByRole('button', { name: 'Sửa đánh giá' }));
    await user.click(screen.getByRole('radio', { name: '3 sao' }));
    await user.click(screen.getByRole('button', { name: 'Lưu đánh giá' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledExactlyOnceWith(41, 1, {
        ratingScore: 3,
        comment: 'Món ngon và giao cẩn thận.',
      }),
    );
    expect(screen.getByText('Another review')).toBeVisible();
  });
  it('rejects an own-list response with a mismatched owner', async () => {
    vi.spyOn(ratingsApi, 'page').mockResolvedValue(
      reviewsPage([
        review({
          customerOutputDTO: { customerId: 2, name: 'Customer' },
          comment: 'Other private review',
        }),
      ]),
    );
    await renderRatingPage(<RestaurantRatings restaurantId={8} ownOnly />, '/customer/ratings');
    expect(await screen.findByText('Không tìm thấy thông tin')).toBeVisible();
    expect(screen.queryByText('Other private review')).not.toBeInTheDocument();
  });
  it('chooses a restaurant from a server page of completed orders before loading own reviews', async () => {
    const orderRead = vi.spyOn(ordersApi, 'page').mockResolvedValue({
      items: [completedOrder()],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
    });
    const reviewRead = vi.spyOn(ratingsApi, 'page').mockResolvedValue(reviewsPage([review()])),
      user = userEvent.setup();
    await renderRatingPage(<MyRatingsPage />, '/customer/ratings');
    await user.click(await screen.findByRole('button', { name: 'Bếp Hà Nội' }));
    expect(await screen.findByText('Món ngon và giao cẩn thận.')).toBeVisible();
    expect(orderRead).toHaveBeenCalledExactlyOnceWith(
      1,
      { page: 0, size: 12, status: 'COMPLETED' },
      expect.any(AbortSignal),
    );
    expect(reviewRead).toHaveBeenCalledExactlyOnceWith(
      8,
      { page: 0, size: 12, mine: true },
      expect.any(AbortSignal),
    );
  });
  it('preserves a comment and shows an API validation failure rather than claiming success', async () => {
    vi.spyOn(ratingsApi, 'page').mockResolvedValue(reviewsPage([]));
    vi.spyOn(ratingsApi, 'average').mockResolvedValue(0);
    vi.spyOn(ordersApi, 'detail').mockResolvedValue(completedOrder());
    vi.spyOn(ratingsApi, 'create').mockRejectedValue(new ApiError(400, '400'));
    const user = userEvent.setup();
    await renderRatingPage(<RestaurantRatings restaurantId={8} />);
    await user.type(await screen.findByLabelText(/Nhận xét của bạn/), 'Chưa gửi được');
    await user.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể gửi đánh giá.');
    expect(screen.getByLabelText(/Nhận xét của bạn/)).toHaveValue('Chưa gửi được');
    expect(screen.queryByText('Đã gửi đánh giá của bạn.')).not.toBeInTheDocument();
  });
  it('does not apply mutation callbacks after identity is cleared', async () => {
    vi.spyOn(ratingsApi, 'page').mockResolvedValue(reviewsPage([]));
    vi.spyOn(ratingsApi, 'average').mockResolvedValue(0);
    vi.spyOn(ordersApi, 'detail').mockResolvedValue(completedOrder());
    let finish!: (value: Rating) => void;
    const create = vi.spyOn(ratingsApi, 'create').mockImplementation(
      () =>
        new Promise<Rating>((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    const { client, session } = await renderRatingPage(<RestaurantRatings restaurantId={8} />);
    await user.click(await screen.findByRole('button', { name: 'Gửi đánh giá' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await act(async () => {
      await session.logout();
      finish(review());
    });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).not.toBeInTheDocument(),
    );
    expect(invalidate).not.toHaveBeenCalled();
    expect(screen.queryByText('Đã gửi đánh giá của bạn.')).not.toBeInTheDocument();
  });
});
