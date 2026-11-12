import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { api } from '@/lib/runtime';
import { normalizeError, ApiError } from '@/lib/api/http';
import { profileSchema } from '@/types/domain';
import { Alert, EmptyState, ErrorState, Spinner, useToast } from '@/components/feedback';
import { Button, PageHeader } from '@/components/ui';
import { money } from '@/features/public/api';
import { cartApi, cartQueryKey } from '@/features/cart/api';
import { CartRestaurant, CartSummary } from '@/features/cart/CartComponents';
import { ordersApi, orderKeys } from '@/features/orders/api';
import type { Order } from '@/features/orders/model';
import { checkoutApi } from './api';
import { CheckoutForm } from './CheckoutForm';
import {
  cartFingerprint,
  checkoutAttemptKey,
  isDefiniteCheckoutRejection,
  matchingCheckoutOrders,
  type CheckoutAttempt,
  type CheckoutInput,
} from './model';
import '@/features/cart/cart.css';
import './checkout.css';
import {
  rememberPending,
  restorePending,
  forgetPending,
  restoredMatches,
  type PendingCheckout,
} from './pending';

export function CheckoutPage() {
  const auth = useAuth();
  const account = auth.account!;
  const session = useSession();
  const generation = auth.generation;
  const customerId = account.customerId!;
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const key = cartQueryKey(account.accountId, customerId);
  const attemptKey = checkoutAttemptKey(account.accountId);
  const current = () =>
    session.getSnapshot().account?.accountId === account.accountId &&
    session.getSnapshot().generation === generation;
  const cart = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => cartApi.read(signal),
    staleTime: 0,
  });
  const methods = useQuery({
    queryKey: ['checkout', account.accountId, 'payment-methods'],
    queryFn: ({ signal }) => checkoutApi.paymentMethods(signal),
    staleTime: 0,
  });
  const profile = useQuery({
    queryKey: ['account', account.accountId, 'profile'],
    queryFn: async ({ signal }) =>
      profileSchema.parse(await api.get(`/customers/${customerId}`, signal)),
  });
  // Reload restores only a hashed reconciliation marker; no address/cart/token is persisted.
  const attempt = useQuery<PendingCheckout | null>({
    queryKey: attemptKey,
    queryFn: async () => null,
    initialData: () => restorePending(account.accountId, customerId),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const finish = async (order: Order, reconciled = false) => {
    if (!current()) return;
    forgetPending(account.accountId);
    client.setQueryData(attemptKey, null);
    await client.cancelQueries({ queryKey: key });
    await client.cancelQueries({ queryKey: orderKeys.all(account.accountId) });
    if (!current()) return;
    client.setQueryData(orderKeys.detail(account.accountId, order.orderId), order);
    await Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({ queryKey: orderKeys.all(account.accountId) }),
    ]);
    if (!current()) return;
    toast(
      reconciled
        ? `Đã tìm thấy đơn phù hợp #${order.orderId} trên máy chủ. Hãy kiểm tra chi tiết.`
        : `Đặt hàng thành công. Mã đơn #${order.orderId}.`,
    );
    navigate(`/customer/orders/${order.orderId}`, { replace: true });
  };
  const reconcile = async (value: PendingCheckout) => {
    if (value.kind === 'unavailable') {
      setError(
        'Không đọc được trạng thái chống đặt trùng. Không gửi yêu cầu mới; hãy kiểm tra lịch sử đơn và quyền lưu trữ trình duyệt.',
      );
      return;
    }
    if (!current()) return;
    setChecking(true);
    try {
      const [latest, latestCart] = await Promise.all([
        ordersApi.latest(customerId),
        cartApi.read(),
      ]);
      if (!current()) return;
      client.setQueryData(key, latestCart);
      const matches =
        'signature' in value
          ? await restoredMatches(value, latest)
          : matchingCheckoutOrders(value, latest);
      if (!current()) return;
      if (matches.length === 1) await finish(matches[0], true);
      else
        setError(
          'Chưa xác minh được kết quả đặt hàng. Không gửi lại yêu cầu; hãy kiểm tra lịch sử đơn hoặc làm mới trạng thái.',
        );
    } catch (problem) {
      if (current())
        setError(
          `${normalizeError(problem).message} Kết quả đặt hàng vẫn chưa xác định; không gửi lại yêu cầu.`,
        );
    } finally {
      if (current()) setChecking(false);
    }
  };
  const checkout = useMutation({
    retry: false,
    mutationFn: async (task: {
      input: CheckoutInput;
      accountId: number;
      customerId: number;
      generation: number;
    }) => {
      if (
        task.accountId !== account.accountId ||
        task.customerId !== customerId ||
        task.generation !== generation ||
        !current()
      )
        return;
      const input = task.input;
      setError('');
      let sent = false;
      let accepted = false;
      let snapshot: CheckoutAttempt | null = null;
      try {
        const [fresh, availableMethods, latest] = await Promise.all([
          cartApi.read(),
          checkoutApi.paymentMethods(),
          ordersApi.latest(customerId),
        ]);
        if (!current()) return;
        if (fresh.cartItems.length === 0) {
          client.setQueryData(key, fresh);
          throw new ApiError(409, 'EMPTY', 'Giỏ hàng đã trống. Vui lòng chọn món trước khi đặt.');
        }
        if (!cart.data || cartFingerprint(fresh) !== cartFingerprint(cart.data)) {
          client.setQueryData(key, fresh);
          throw new ApiError(
            409,
            'CART_CHANGED',
            'Giá, phí hoặc số lượng vừa thay đổi. Hãy kiểm tra tổng tiền mới rồi xác nhận lại.',
          );
        }
        if (!availableMethods.some((method) => method.paymentMethodId === input.paymentMethodId)) {
          client.setQueryData(['checkout', account.accountId, 'payment-methods'], availableMethods);
          throw new ApiError(
            409,
            'PAYMENT_CHANGED',
            'Phương thức COD vừa thay đổi. Vui lòng chọn lại phương thức khả dụng.',
          );
        }
        snapshot = {
          kind: 'sending',
          customerId,
          cart: fresh,
          address: input.deliveryAddress,
          baselineIds: latest.map((order) => order.orderId),
        };
        await rememberPending(account.accountId, snapshot);
        if (!current()) return;
        client.setQueryData(attemptKey, snapshot);
        sent = true;
        const created = await checkoutApi.create(input);
        accepted = true;
        if (!current()) return;
        const order = await ordersApi.detail(created.orderId);
        if (!current()) return;
        if (order.orderId !== created.orderId || order.customer.customerId !== customerId)
          throw new ApiError(502, 'CONTRACT');
        await finish(order);
      } catch (problem) {
        if (!current()) return;
        if (sent && snapshot && (accepted || !isDefiniteCheckoutRejection(problem))) {
          const uncertain: CheckoutAttempt = { ...snapshot, kind: 'uncertain' };
          client.setQueryData(attemptKey, uncertain);
          setError(
            'Máy chủ có thể đã nhận đơn nhưng kết nối chưa xác nhận được kết quả. Đang đối chiếu dữ liệu…',
          );
          await reconcile(uncertain);
        } else {
          forgetPending(account.accountId);
          client.setQueryData(attemptKey, null);
          setError(normalizeError(problem).message);
          if (sent) await client.invalidateQueries({ queryKey: key });
        }
      }
    },
  });
  const submit = async (input: CheckoutInput) => {
    if (locked.current || client.getQueryData<CheckoutAttempt | null>(attemptKey)) return;
    locked.current = true;
    try {
      await checkout.mutateAsync({ input, accountId: account.accountId, customerId, generation });
    } finally {
      locked.current = false;
    }
  };
  const pending = checkout.isPending || checking;
  return (
    <section className="customer-ordering-page">
      <Link to="/customer/cart" className="text-link customer-checkout-back">
        <ArrowLeft size={17} /> Quay lại giỏ hàng
      </Link>
      <PageHeader
        eyebrow="SẮP CÓ MỘT BỮA NGON"
        title="Xác nhận đơn hàng"
        description="Kiểm tra thông tin lần cuối. Giá và phí giao hàng được xác nhận từ máy chủ."
      />
      {attempt.data ? (
        <div className="customer-checkout-uncertain">
          <Alert tone="info">
            <strong>
              {attempt.data.kind === 'sending'
                ? 'Đang gửi đơn hàng…'
                : 'Kết quả đặt hàng đang được xác minh'}
            </strong>
            <p>
              {error ||
                (attempt.data.kind === 'sending'
                  ? 'Yêu cầu đang được máy chủ xử lý. Vui lòng chờ và không gửi lại.'
                  : 'Có một yêu cầu đặt hàng chưa được đối chiếu. Không gửi yêu cầu mới để tránh đặt trùng.')}
            </p>
          </Alert>
          <div className="customer-checkout-recovery">
            <Button busy={pending} onClick={() => void reconcile(attempt.data!)}>
              <RefreshCw size={17} /> Kiểm tra trên máy chủ
            </Button>
            <Link className="button button-secondary" to="/customer/orders">
              Xem lịch sử đơn
            </Link>
          </div>
        </div>
      ) : cart.isPending || methods.isPending || profile.isPending ? (
        <Spinner label="Đang chuẩn bị thông tin đặt hàng…" />
      ) : cart.isError || methods.isError || profile.isError ? (
        <ErrorState
          error={cart.error || methods.error || profile.error}
          onRetry={() => {
            void cart.refetch();
            void methods.refetch();
            void profile.refetch();
          }}
        />
      ) : cart.data.cartItems.length === 0 ? (
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Chọn món trước khi xác nhận đơn hàng."
          action={
            <Link className="button button-primary" to="/restaurants">
              Khám phá nhà hàng
            </Link>
          }
        />
      ) : (
        <>
          <CartRestaurant cart={cart.data} />
          <div className="customer-cart-layout customer-checkout-layout">
            <div>
              <div className="customer-checkout-lines">
                <h2>Món trong đơn hàng</h2>
                {cart.data.cartItems.map((item) => (
                  <div key={item.cartItemId}>
                    <span>
                      <strong>
                        {item.quantity} × {item.foodItemName}
                      </strong>
                      <small>{money(item.unitPrice)} / phần</small>
                    </span>
                    <b>{money(item.subtotal)}</b>
                  </div>
                ))}
              </div>
              <CheckoutForm
                key={methods.data.map((method) => method.paymentMethodId).join('-')}
                initialAddress={profile.data.address}
                methods={methods.data}
                busy={pending}
                disabled={
                  cart.isFetching || cart.data.cartItems.some((item) => item.unitPrice <= 0)
                }
                error={error}
                onSubmit={submit}
              />
              {cart.data.cartItems.some((item) => item.unitPrice <= 0) && (
                <Alert>Một món chưa có giá hợp lệ. Vui lòng quay lại giỏ và chọn món khác.</Alert>
              )}
            </div>
            <CartSummary cart={cart.data}>
              <p className="customer-checkout-total-note">
                Bạn chỉ thanh toán khi nhận hàng. Trạng thái thanh toán được cập nhật bởi máy chủ.
              </p>
            </CartSummary>
          </div>
        </>
      )}
    </section>
  );
}
