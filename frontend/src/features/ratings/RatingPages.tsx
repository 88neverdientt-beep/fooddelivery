import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Star, UserRound } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Alert, EmptyState, ErrorState, Spinner, useToast } from '@/components/feedback';
import { Button, PageHeader, Pagination } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiError, normalizeError } from '@/lib/api/http';
import { ordersApi, orderKeys } from '@/features/orders/api';
import { formatOrderDate, parseOrderId, type Order } from '@/features/orders/model';
import { RatingForm } from './RatingForm';
import { ratingsApi, ratingKeys } from './api';
import { isOwnRating, type Rating, type RatingInput } from './model';
import './ratings.css';

export function RatingCard({
  rating,
  own,
  busy,
  onEdit,
  onDelete,
}: {
  rating: Rating;
  own: boolean;
  busy?: boolean;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
}) {
  return (
    <article className="rating-card">
      <div className="rating-card-heading">
        <div className="rating-card-author">
          <span aria-hidden="true">
            <UserRound size={20} />
          </span>
          <div>
            <strong>{own ? 'Bạn' : 'Khách hàng'}</strong>
            <time dateTime={rating.createdAt}>{formatOrderDate(rating.createdAt)}</time>
          </div>
        </div>
        <span className="rating-score-stars" aria-label={`${rating.ratingScore} trên 5 sao`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              size={17}
              fill={value <= rating.ratingScore ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          ))}
          <small>{rating.ratingScore}/5</small>
        </span>
      </div>
      {rating.comment ? (
        <p className="rating-comment">{rating.comment}</p>
      ) : (
        <p className="rating-comment muted">Khách hàng không để lại nhận xét.</p>
      )}
      {own && onEdit && onDelete && (
        <div className="rating-card-actions">
          <Button variant="secondary" disabled={busy} onClick={onEdit}>
            Sửa đánh giá
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" disabled={busy}>
                Xóa đánh giá
              </Button>
            }
            title="Xóa đánh giá này?"
            description="Nhận xét và điểm đánh giá của bạn sẽ bị xóa. Thao tác không thể hoàn tác."
            confirm="Xác nhận xóa đánh giá"
            busy={busy}
            onConfirm={onDelete}
          />
        </div>
      )}
    </article>
  );
}
type RatingAction =
  | { kind: 'create'; input: RatingInput }
  | { kind: 'update'; ratingId: number; input: RatingInput }
  | { kind: 'delete'; ratingId: number };
type OwnedRatingAction = RatingAction & {
  accountId: number;
  customerId: number;
  restaurantId: number;
  page: number;
  eligible: boolean;
};
export function RestaurantRatings({
  restaurantId,
  ownOnly = false,
  completedOrder,
}: {
  restaurantId: number;
  ownOnly?: boolean;
  completedOrder?: Order;
}) {
  const account = useAuth().account;
  const session = useSession();
  const customerId = account?.role === 'CUSTOMER' ? account.customerId : null;
  const [search] = useSearchParams();
  const contextId = parseOrderId(search.get('reviewOrder') || undefined);
  const [pagination, setPagination] = useState({ restaurantId, page: 1 });
  const page = pagination.restaurantId === restaurantId ? pagination.page : 1;
  const setPage = (value: number) => setPagination({ restaurantId, page: value });
  const [editing, setEditing] = useState<number | null>(null);
  const [created, setCreated] = useState(0);
  const [failure, setFailure] = useState('');
  const operation = useRef(false);
  const queryClient = useQueryClient(),
    toast = useToast();
  const reviews = useQuery({
    queryKey: ratingKeys.page(
      restaurantId,
      page - 1,
      ownOnly ? account?.accountId || 0 : undefined,
    ),
    queryFn: async ({ signal }) => {
      const result = await ratingsApi.page(
        restaurantId,
        { page: page - 1, size: 12, mine: ownOnly },
        signal,
      );
      if (ownOnly && result.items.some((rating) => !isOwnRating(rating, customerId)))
        throw new ApiError(404, '404');
      return result;
    },
    enabled: !ownOnly || !!customerId,
  });
  const average = useQuery({
    queryKey: ratingKeys.average(restaurantId),
    queryFn: ({ signal }) => ratingsApi.average(restaurantId, signal),
    enabled: !ownOnly,
  });
  const proof = useQuery({
    queryKey: orderKeys.detail(account?.accountId || 0, contextId),
    queryFn: async ({ signal }) => {
      const order = await ordersApi.detail(contextId!, signal);
      if (
        order.customer.customerId !== customerId ||
        order.restaurant.restaurantId !== restaurantId
      )
        throw new ApiError(404, '404');
      return order;
    },
    enabled: !!contextId && !!customerId && !completedOrder,
  });
  const eligibleOrder = completedOrder || proof.data;
  const canCreate =
    !!customerId &&
    eligibleOrder?.customer.customerId === customerId &&
    eligibleOrder.restaurant.restaurantId === restaurantId &&
    eligibleOrder.orderStatus === 'COMPLETED';
  const mutation = useMutation({
    mutationFn: async (action: OwnedRatingAction) => {
      const actor = session.getSnapshot().account;
      if (actor?.accountId !== action.accountId || actor.customerId !== action.customerId)
        throw new ApiError(401, '401');
      if (operation.current) throw new ApiError(409, 'BUSY');
      if (action.kind === 'create' && !action.eligible) throw new ApiError(400, 'ELIGIBILITY');
      operation.current = true;
      setFailure('');
      try {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: ratingKeys.public(action.restaurantId) }),
          queryClient.cancelQueries({ queryKey: ratingKeys.mine(action.accountId) }),
        ]);
        if (session.getSnapshot().account?.accountId !== action.accountId)
          throw new ApiError(401, '401');
        const result =
          action.kind === 'create'
            ? await ratingsApi.create(action.restaurantId, action.customerId, action.input)
            : action.kind === 'update'
              ? await ratingsApi.update(action.ratingId, action.customerId, action.input)
              : await ratingsApi.remove(action.ratingId, action.customerId);
        if (typeof result !== 'string' && !isOwnRating(result, action.customerId))
          throw new ApiError(502, 'CONTRACT');
        return result;
      } finally {
        operation.current = false;
      }
    },
    retry: false,
    onSuccess: (_rating, action) => {
      if (session.getSnapshot().account?.accountId !== action.accountId) return;
      if (restaurantId !== action.restaurantId) return;
      setEditing(null);
      if (action.kind === 'create') {
        setCreated((value) => value + 1);
        setPage(1);
      }
      if (
        action.kind === 'delete' &&
        page === action.page &&
        page > 1 &&
        reviews.data?.items.length === 1
      )
        setPage(page - 1);
      toast(
        action.kind === 'create'
          ? 'Đã gửi đánh giá của bạn.'
          : action.kind === 'update'
            ? 'Đã cập nhật đánh giá.'
            : 'Đã xóa đánh giá.',
      );
    },
    onError: (error, action) => {
      if (
        session.getSnapshot().account?.accountId !== action.accountId ||
        restaurantId !== action.restaurantId
      )
        return;
      setFailure(
        error instanceof ApiError && error.status === 400
          ? 'Chưa thể gửi đánh giá. Điểm cần từ 1 đến 5 và bạn phải có ít nhất một đơn đã hoàn thành tại nhà hàng.'
          : normalizeError(error).message,
      );
    },
    onSettled: (_data, _error, action) => {
      if (session.getSnapshot().account?.accountId !== action.accountId) return;
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ratingKeys.public(action.restaurantId) }),
        queryClient.invalidateQueries({ queryKey: ratingKeys.mine(action.accountId) }),
      ]);
    },
  });
  const perform = async (action: RatingAction) => {
    const actor = session.getSnapshot().account;
    if (
      !account ||
      !customerId ||
      actor?.accountId !== account.accountId ||
      actor.customerId !== customerId
    )
      throw new ApiError(401, '401');
    await mutation.mutateAsync({
      ...action,
      accountId: account.accountId,
      customerId,
      restaurantId,
      page,
      eligible: canCreate,
    });
  };
  return (
    <section
      className="restaurant-ratings"
      id="restaurant-ratings"
      aria-label={ownOnly ? 'Đánh giá của tôi theo nhà hàng' : 'Đánh giá nhà hàng'}
    >
      <div className="ratings-heading">
        <div>
          <p className="eyebrow">TRẢI NGHIỆM SAU MỖI BỮA NGON</p>
          <h2>{ownOnly ? 'Đánh giá của tôi' : 'Đánh giá từ khách hàng'}</h2>
          <p className="muted">
            {reviews.data
              ? `${reviews.data.totalElements} đánh giá${ownOnly ? ' của bạn tại nhà hàng đã chọn' : ' công khai'}`
              : 'Những chia sẻ được gửi từ khách hàng.'}
          </p>
        </div>
        {!ownOnly && average.data !== undefined && (reviews.data?.totalElements || 0) > 0 && (
          <div className="ratings-score">
            <Star size={23} fill="currentColor" />
            <strong>{average.data.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}/5</strong>
            <span>Điểm từ máy chủ</span>
          </div>
        )}
        <Button
          variant="secondary"
          busy={reviews.isFetching && !reviews.isPending}
          onClick={() => {
            void reviews.refetch();
            if (!ownOnly) void average.refetch();
          }}
        >
          <RefreshCw size={16} />
          Làm mới đánh giá
        </Button>
      </div>
      {failure && (
        <div className="rating-error">
          <Alert>{failure}</Alert>
        </div>
      )}
      {reviews.isPending ? (
        <Spinner label="Đang tải đánh giá…" />
      ) : reviews.isError ? (
        <ErrorState
          error={reviews.error}
          onRetry={() => {
            void reviews.refetch();
          }}
        />
      ) : (
        <>
          {reviews.data.items.length ? (
            <ul className="rating-list">
              {reviews.data.items.map((rating) => (
                <li key={rating.ratingId}>
                  {editing === rating.ratingId && isOwnRating(rating, customerId) ? (
                    <div className="rating-card">
                      <h3>Chỉnh sửa đánh giá của bạn</h3>
                      <RatingForm
                        initial={{ ratingScore: rating.ratingScore, comment: rating.comment || '' }}
                        busy={mutation.isPending}
                        onCancel={() => setEditing(null)}
                        onSubmit={async (input) => {
                          await perform({
                            kind: 'update',
                            ratingId: rating.ratingId,
                            input,
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <RatingCard
                      rating={rating}
                      own={isOwnRating(rating, customerId)}
                      busy={mutation.isPending}
                      onEdit={() => {
                        setEditing(rating.ratingId);
                        setFailure('');
                      }}
                      onDelete={async () => {
                        await perform({ kind: 'delete', ratingId: rating.ratingId });
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rating-empty-note">
              {ownOnly
                ? 'Bạn chưa có đánh giá tại nhà hàng này.'
                : 'Nhà hàng chưa có đánh giá. Các đánh giá sẽ hiển thị sau khi khách gửi trải nghiệm thật.'}
            </p>
          )}
          <Pagination page={page} count={reviews.data.totalPages} onChange={setPage} />
        </>
      )}
      {canCreate ? (
        <div className="rating-compose">
          <h3>Chia sẻ trải nghiệm của bạn</h3>
          <p>
            Bạn đã hoàn thành đơn #{eligibleOrder.orderId} tại nhà hàng này. Chỉ điểm và nhận xét
            được gửi; máy chủ kiểm tra quyền của bạn.
          </p>
          <RatingForm
            key={`${account!.accountId}-${created}`}
            busy={mutation.isPending}
            onSubmit={async (input) => {
              await perform({ kind: 'create', input });
            }}
          />
        </div>
      ) : customerId ? (
        <div className="rating-compose">
          <h3>Đánh giá sau một bữa ăn đã hoàn thành</h3>
          {proof.isFetching && <Spinner label="Đang kiểm tra đơn hàng đủ điều kiện…" />}
          {proof.isError && (
            <p className="muted">
              Không thể xác minh đơn hàng được chọn. Vui lòng mở một đơn đã hoàn thành của bạn.
            </p>
          )}
          {!proof.isFetching && !proof.isError && (
            <p>
              Chọn một đơn đã hoàn thành tại nhà hàng này trong lịch sử, rồi bấm “Viết đánh giá”.
              Quyền gửi được kiểm tra lại trên máy chủ.
            </p>
          )}
          <Link className="button button-secondary" to="/customer/orders?status=COMPLETED">
            Xem đơn đã hoàn thành
          </Link>
        </div>
      ) : !account ? (
        <div className="rating-compose">
          <h3>Bữa ăn của bạn, câu chuyện của bạn</h3>
          <p>Đăng nhập bằng tài khoản khách hàng và hoàn thành đơn hàng để gửi đánh giá.</p>
          <Link
            className="button button-secondary"
            to="/login"
            state={{ from: `/restaurants/${restaurantId}` }}
          >
            Đăng nhập để đánh giá
          </Link>
        </div>
      ) : null}
    </section>
  );
}
export function MyRatingsPage() {
  const account = useAuth().account;
  const customerId = account?.role === 'CUSTOMER' ? account.customerId : null;
  const [pageState, setPage] = useState({ accountId: account?.accountId, page: 1 });
  const page = pageState.accountId === account?.accountId ? pageState.page : 1;
  const [selection, setSelection] = useState<{ accountId: number; order: Order } | null>(null);
  const selected =
    selection && selection.accountId === account?.accountId ? selection.order : undefined;
  const completed = useQuery({
    queryKey: orderKeys.page(account?.accountId || 0, page - 1, 'COMPLETED'),
    queryFn: async ({ signal }) => {
      const result = await ordersApi.page(
        customerId!,
        { page: page - 1, size: 12, status: 'COMPLETED' },
        signal,
      );
      if (
        result.items.some(
          (order) => order.customer.customerId !== customerId || order.orderStatus !== 'COMPLETED',
        )
      )
        throw new ApiError(404, '404');
      return result;
    },
    enabled: !!customerId,
  });
  if (!customerId || !account) return <ErrorState error={new ApiError(403, '403')} />;
  const unique = new Map(
    completed.data?.items.map((order) => [order.restaurant.restaurantId, order]),
  );
  return (
    <div className="customer-ratings-page">
      <PageHeader
        eyebrow="TRẢI NGHIỆM CỦA BẠN"
        title="Đánh giá của tôi"
        description="Chọn nhà hàng từ những đơn đã hoàn thành để xem, sửa hoặc xóa đánh giá của mình."
      />
      {completed.isPending ? (
        <Spinner label="Đang tải nhà hàng từ đơn hoàn thành…" />
      ) : completed.isError ? (
        <ErrorState
          error={completed.error}
          onRetry={() => {
            void completed.refetch();
          }}
        />
      ) : completed.data.items.length ? (
        <>
          <div className="rating-restaurant-choice" aria-label="Chọn nhà hàng để quản lý đánh giá">
            {[...unique.values()].map((order) => (
              <Button
                key={order.restaurant.restaurantId}
                variant={
                  selected?.restaurant.restaurantId === order.restaurant.restaurantId
                    ? 'primary'
                    : 'secondary'
                }
                onClick={() => setSelection({ accountId: account.accountId, order })}
              >
                {order.restaurant.name}
              </Button>
            ))}
          </div>
          <p className="rating-selection-note">
            Các nhà hàng xuất hiện trong trang đơn hoàn thành hiện tại. Dùng phân trang để tìm các
            đơn cũ hơn; đánh giá được tải riêng sau khi chọn nhà hàng.
          </p>
          <Pagination
            page={page}
            count={completed.data.totalPages}
            onChange={(value) => setPage({ accountId: account.accountId, page: value })}
          />
        </>
      ) : (
        <EmptyState
          title="Chưa có đơn hoàn thành để đánh giá"
          description="Sau khi nhận món và hoàn thành đơn, bạn có thể chia sẻ trải nghiệm tại nhà hàng."
          action={
            <Link className="button button-primary" to="/customer/orders">
              Xem đơn hàng
            </Link>
          }
        />
      )}
      {selected && (
        <div className="rating-own-section">
          <div className="rating-manage-heading">
            <h2>{selected.restaurant.name}</h2>
            <Link className="text-link" to={`/restaurants/${selected.restaurant.restaurantId}`}>
              Xem nhà hàng
            </Link>
          </div>
          <RestaurantRatings
            key={`${account.accountId}-${selected.restaurant.restaurantId}`}
            restaurantId={selected.restaurant.restaurantId}
            ownOnly
            completedOrder={selected}
          />
        </div>
      )}
    </div>
  );
}
