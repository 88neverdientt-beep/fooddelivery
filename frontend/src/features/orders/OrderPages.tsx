import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, RefreshCw, Star } from 'lucide-react';
import { z } from 'zod';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Alert, EmptyState, ErrorState, Spinner, useToast } from '@/components/feedback';
import { Badge, Button, Input, PageHeader, Pagination, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiError, normalizeError } from '@/lib/api/http';
import { ordersApi, orderKeys } from './api';
import {
  addressSchema,
  canCancelOrder,
  canEditAddress,
  formatOrderDate,
  orderLabels,
  orderStatusSchema,
  parseOrderId,
  terminalOrder,
  type Order,
} from './model';
import { OrderCard, OrderContents, OrderPaymentDelivery, OrderTimeline } from './OrderComponents';
import './orders.css';

export function useVisiblePage() {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const change = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  return visible;
}
function requireOwner(order: Order, customerId: number) {
  if (order.customer.customerId !== customerId) throw new ApiError(404, '404');
  return order;
}
export function OrdersPage() {
  const account = useAuth().account;
  const [search, setSearch] = useSearchParams();
  const visible = useVisiblePage();
  const statusValue = orderStatusSchema.safeParse(search.get('status'));
  const status = statusValue.success ? statusValue.data : undefined;
  const requestedPage = Number(search.get('page') || '1');
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;
  const customerId = account?.role === 'CUSTOMER' ? account.customerId : null;
  const orders = useQuery({
    queryKey: orderKeys.page(account?.accountId || 0, page - 1, status || ''),
    queryFn: async ({ signal }) => {
      const result = await ordersApi.page(
        customerId!,
        { page: page - 1, size: 12, status },
        signal,
      );
      result.items.forEach((order) => requireOwner(order, customerId!));
      return result;
    },
    enabled: !!customerId,
    refetchInterval: (query) =>
      visible && query.state.data?.items.some((order) => !terminalOrder(order.orderStatus))
        ? 20000
        : false,
    refetchIntervalInBackground: false,
  });
  if (!customerId) return <ErrorState error={new ApiError(403, '403')} />;
  const updateSearch = (nextPage: number, nextStatus = status || '') => {
    const next = new URLSearchParams();
    if (nextPage > 1) next.set('page', String(nextPage));
    if (nextStatus) next.set('status', nextStatus);
    setSearch(next);
  };
  return (
    <div className="customer-orders">
      <PageHeader
        eyebrow="BỮA NGON CỦA BẠN"
        title="Đơn hàng của tôi"
        description="Xem lại bữa ngon đã đặt và cập nhật hành trình giao hàng."
      />
      <div className="order-toolbar">
        <Select
          label="Lọc trạng thái đơn"
          value={status || ''}
          onChange={(event) => updateSearch(1, event.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {orderStatusSchema.options.map((value) => (
            <option key={value} value={value}>
              {orderLabels[value]}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          busy={orders.isFetching && !orders.isPending}
          onClick={() => {
            void orders.refetch();
          }}
        >
          <RefreshCw size={17} />
          Làm mới đơn hàng
        </Button>
      </div>
      {orders.isPending ? (
        <Spinner label="Đang tải đơn hàng…" />
      ) : orders.isError ? (
        <ErrorState
          error={orders.error}
          onRetry={() => {
            void orders.refetch();
          }}
        />
      ) : (
        <>
          {orders.data.items.length ? (
            <div className="customer-order-list">
              {orders.data.items.map((order) => (
                <OrderCard key={order.orderId} order={order} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={status ? 'Chưa có đơn ở trạng thái này' : 'Bạn chưa có đơn hàng'}
              description="Khám phá nhà hàng và chọn một bữa ngon cho hôm nay."
              action={
                <Link className="button button-primary" to="/restaurants">
                  Khám phá nhà hàng
                </Link>
              }
            />
          )}
          <p className="order-list-note">
            {orders.data.totalElements} đơn hàng{status ? ' theo trạng thái đã chọn' : ''} · Mới
            nhất trước · Phân trang từ máy chủ
          </p>
          <Pagination
            page={page}
            count={orders.data.totalPages}
            onChange={(value) => updateSearch(value)}
          />
        </>
      )}
      <p className="order-sync-note">
        <RefreshCw size={15} />
        Đơn đang xử lý được cập nhật mỗi 20 giây khi tab đang hoạt động. Bạn có thể làm mới bất cứ
        lúc nào.
      </p>
    </div>
  );
}
export function DeliveryAddressForm({
  address,
  busy,
  onSave,
  onCancel,
}: {
  address: string;
  busy: boolean;
  onSave: (address: string) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: { deliveryAddress: address },
    mode: 'onChange',
  });
  const nextAddress = useWatch({ control, name: 'deliveryAddress', defaultValue: address });
  return (
    <form
      className="order-address-form"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <h2>Đổi địa chỉ giao hàng</h2>
      <p className="muted">Chỉ áp dụng khi đơn đang chờ xác nhận hoặc đã xác nhận.</p>
      <Input
        label="Địa chỉ giao hàng mới"
        autoComplete="street-address"
        maxLength={255}
        {...register('deliveryAddress')}
        error={errors.deliveryAddress?.message}
        disabled={busy}
      />
      <div className="dialog-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Đóng chỉnh sửa
        </Button>
        <ConfirmDialog
          title="Xác nhận địa chỉ mới?"
          description={nextAddress}
          confirm="Xác nhận đổi địa chỉ"
          busy={busy}
          trigger={
            <Button type="button" disabled={!isValid || busy}>
              Lưu địa chỉ
            </Button>
          }
          onConfirm={handleSubmit(async (input) => {
            await onSave(input.deliveryAddress);
          })}
        />
      </div>
    </form>
  );
}
type OrderAction = { kind: 'cancel' } | { kind: 'address'; address: string };
type OwnedOrderAction = OrderAction & { accountId: number; customerId: number; orderId: number };
export function OrderDetailPage() {
  const id = parseOrderId(useParams().id);
  const auth = useAuth(),
    account = auth.account;
  const session = useSession();
  const customerId = account?.role === 'CUSTOMER' ? account.customerId : null;
  const queryClient = useQueryClient();
  const toast = useToast();
  const visible = useVisiblePage();
  const [editing, setEditing] = useState(false);
  const [failure, setFailure] = useState('');
  const operation = useRef(false);
  const detail = useQuery({
    queryKey: orderKeys.detail(account?.accountId || 0, id),
    queryFn: async ({ signal }) => requireOwner(await ordersApi.detail(id!, signal), customerId!),
    enabled: !!id && !!customerId,
    refetchInterval: (query) =>
      visible &&
      !editing &&
      !operation.current &&
      query.state.data &&
      !terminalOrder(query.state.data.orderStatus)
        ? 20000
        : false,
    refetchIntervalInBackground: false,
  });
  const mutation = useMutation({
    mutationFn: async (input: OwnedOrderAction) => {
      const actor = session.getSnapshot().account;
      if (actor?.accountId !== input.accountId || actor.customerId !== input.customerId)
        throw new ApiError(401, '401');
      if (operation.current) throw new ApiError(409, 'BUSY');
      operation.current = true;
      setFailure('');
      try {
        await queryClient.cancelQueries({ queryKey: orderKeys.all(input.accountId) });
        if (session.getSnapshot().account?.accountId !== input.accountId)
          throw new ApiError(401, '401');
        return requireOwner(
          input.kind === 'cancel'
            ? await ordersApi.cancel(input.orderId)
            : await ordersApi.updateAddress(input.orderId, input.address),
          input.customerId,
        );
      } finally {
        operation.current = false;
      }
    },
    retry: false,
    onSuccess: (order, input) => {
      if (session.getSnapshot().account?.accountId !== input.accountId) return;
      queryClient.setQueryData(orderKeys.detail(input.accountId, input.orderId), order);
      if (input.kind === 'address' && input.orderId === id) setEditing(false);
      toast(input.kind === 'cancel' ? 'Đã hủy đơn hàng.' : 'Đã cập nhật địa chỉ giao hàng.');
    },
    onError: (error, input) => {
      if (session.getSnapshot().account?.accountId !== input.accountId || input.orderId !== id)
        return;
      setFailure(
        error instanceof ApiError && error.status === 409
          ? 'Trạng thái đơn vừa thay đổi. Vui lòng xem dữ liệu mới trước khi thao tác lại.'
          : normalizeError(error).message,
      );
    },
    onSettled: (_data, _error, input) => {
      if (session.getSnapshot().account?.accountId === input.accountId)
        return queryClient.invalidateQueries({ queryKey: orderKeys.all(input.accountId) });
    },
  });
  const perform = async (action: OrderAction) => {
    const actor = session.getSnapshot().account;
    if (
      !id ||
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
      orderId: id,
    });
  };
  if (!id) return <ErrorState error={new ApiError(404, '404')} />;
  if (!customerId) return <ErrorState error={new ApiError(403, '403')} />;
  if (detail.isPending) return <Spinner label="Đang tải chi tiết đơn…" />;
  if (detail.isError)
    return (
      <ErrorState
        error={detail.error}
        onRetry={() => {
          void detail.refetch();
        }}
      />
    );
  const order = detail.data;
  return (
    <div className="customer-order-detail">
      <Link className="order-back-link" to="/customer/orders">
        <ArrowLeft size={17} />
        Đơn hàng của tôi
      </Link>
      <PageHeader
        eyebrow={order.restaurant.name}
        title={`Đơn hàng #${order.orderId}`}
        description={`Đặt lúc ${formatOrderDate(order.createdAt)}`}
        action={
          <Button
            variant="secondary"
            busy={detail.isFetching}
            disabled={mutation.isPending}
            onClick={() => {
              void detail.refetch();
            }}
          >
            <RefreshCw size={17} />
            Làm mới
          </Button>
        }
      />
      <div className="order-detail-heading">
        <Badge
          tone={
            order.orderStatus === 'COMPLETED'
              ? 'success'
              : order.orderStatus === 'CANCELLED'
                ? 'neutral'
                : 'warning'
          }
        >
          {orderLabels[order.orderStatus]}
        </Badge>
        <Link className="text-link" to={`/restaurants/${order.restaurant.restaurantId}`}>
          Xem nhà hàng
        </Link>
      </div>
      {failure && <Alert>{failure}</Alert>}
      <div className="order-detail-layout">
        <OrderContents order={order} />
        <OrderTimeline order={order} />
      </div>
      <OrderPaymentDelivery order={order} />
      <div className="order-actions">
        {canEditAddress(order) && (
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => setEditing(!editing)}
          >
            Đổi địa chỉ
          </Button>
        )}
        {canCancelOrder(order) && (
          <ConfirmDialog
            trigger={
              <Button variant="danger" disabled={mutation.isPending}>
                Hủy đơn hàng
              </Button>
            }
            title={`Hủy đơn #${order.orderId}?`}
            description="Đơn sẽ được hủy theo điều kiện hiện tại của nhà hàng và chuyến giao. Thao tác không thể hoàn tác."
            confirm="Xác nhận hủy đơn"
            busy={mutation.isPending}
            onConfirm={async () => {
              await perform({ kind: 'cancel' });
            }}
          />
        )}
      </div>
      {editing && canEditAddress(order) && (
        <DeliveryAddressForm
          key={order.deliveryAddress}
          address={order.deliveryAddress}
          busy={mutation.isPending}
          onCancel={() => setEditing(false)}
          onSave={async (address) => {
            await perform({ kind: 'address', address });
          }}
        />
      )}
      {order.orderStatus === 'COMPLETED' && (
        <section className="order-review-link">
          <h2>
            <Star size={22} /> Bữa ăn hôm nay thế nào?
          </h2>
          <p>Chia sẻ trải nghiệm của bạn về {order.restaurant.name} sau đơn hàng đã hoàn thành.</p>
          <Link
            className="button button-primary"
            to={`/restaurants/${order.restaurant.restaurantId}?reviewOrder=${order.orderId}#restaurant-ratings`}
          >
            Viết đánh giá
          </Link>
          <Link className="text-link" to="/customer/ratings">
            Quản lý đánh giá của tôi
          </Link>
        </section>
      )}
      {!terminalOrder(order.orderStatus) && (
        <p className="order-sync-note">
          <RefreshCw size={15} />
          Tự cập nhật mỗi 20 giây khi tab đang hoạt động. Đơn hàng, giao hàng và thanh toán được
          hiển thị riêng theo dữ liệu máy chủ.
        </p>
      )}
    </div>
  );
}
