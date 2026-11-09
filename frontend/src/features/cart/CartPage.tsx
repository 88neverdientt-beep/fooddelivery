import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Alert, EmptyState, ErrorState, Spinner, useToast } from '@/components/feedback';
import { Button, PageHeader } from '@/components/ui';
import { cartApi, cartQueryKey } from './api';
import { CartItemRow, CartRestaurant, CartSummary } from './CartComponents';
import './cart.css';
type CartActor = { accountId: number; customerId: number; generation: number };
type CartAction = { id: number; quantity?: number; actor: CartActor };

export function CartPage() {
  const auth = useAuth();
  const account = auth.account!;
  const session = useSession();
  const generation = auth.generation;
  const client = useQueryClient();
  const notify = useToast();
  const locked = useRef(false);
  const key = cartQueryKey(account.accountId, account.customerId!);
  const current = (actor: CartActor) =>
    session.getSnapshot().account?.accountId === actor.accountId &&
    session.getSnapshot().account?.customerId === actor.customerId &&
    session.getSnapshot().generation === actor.generation;
  const cart = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => cartApi.read(signal),
    staleTime: 0,
  });
  const change = useMutation({
    mutationFn: async (action: CartAction) => {
      await client.cancelQueries({
        queryKey: cartQueryKey(action.actor.accountId, action.actor.customerId),
      });
      if (!current(action.actor)) throw new DOMException('Account changed', 'AbortError');
      if (action.quantity === undefined) await cartApi.remove(action.id);
      else await cartApi.update(action.id, action.quantity);
    },
    retry: false,
    onSuccess: async (_, action) => {
      if (!current(action.actor)) return;
      await client.invalidateQueries({
        queryKey: cartQueryKey(action.actor.accountId, action.actor.customerId),
      });
      if (!current(action.actor)) return;
      notify('Giỏ hàng đã được cập nhật.');
    },
    onError: async (_, action) => {
      if (!current(action.actor)) return;
      await client.invalidateQueries({
        queryKey: cartQueryKey(action.actor.accountId, action.actor.customerId),
      });
    },
  });
  const commit = (action: { id: number; quantity?: number }) => {
    const actor = { accountId: account.accountId, customerId: account.customerId!, generation };
    if (locked.current || !current(actor)) return;
    locked.current = true;
    void change
      .mutateAsync({ ...action, actor })
      .catch(() => {})
      .finally(() => {
        locked.current = false;
      });
  };
  return (
    <section className="customer-ordering-page">
      <PageHeader
        eyebrow="CHỌN MÓN THEO CÁCH BẠN THÍCH"
        title="Giỏ hàng của bạn"
        description="Một nhà hàng, một bữa ngon. Kiểm tra món trước khi đặt nhé."
        action={
          <Button
            variant="secondary"
            disabled={cart.isFetching || change.isPending}
            onClick={() => void cart.refetch()}
          >
            <RefreshCw size={17} /> Làm mới
          </Button>
        }
      />
      {cart.isPending ? (
        <Spinner label="Đang tải giỏ hàng…" />
      ) : cart.isError ? (
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
      ) : cart.data.cartItems.length === 0 ? (
        <EmptyState
          title="Giỏ hàng đang chờ một món ngon"
          description="Khám phá thực đơn và chọn món yêu thích. Giỏ của bạn chỉ chứa món từ một nhà hàng."
          action={
            <Link to="/restaurants" className="button button-primary">
              Khám phá nhà hàng <ArrowRight size={18} />
            </Link>
          }
        />
      ) : (
        <>
          <CartRestaurant cart={cart.data} />
          {change.isError && (
            <Alert>
              {change.error.message} Giỏ đã được đối chiếu lại với máy chủ; hãy kiểm tra trước khi
              thử lại.
            </Alert>
          )}
          <div className="customer-cart-layout" aria-busy={change.isPending || undefined}>
            <div className="customer-cart-items">
              {cart.data.cartItems.map((item) => (
                <CartItemRow
                  key={`${item.cartItemId}-${item.quantity}`}
                  item={item}
                  disabled={change.isPending || cart.isFetching}
                  onQuantity={(quantity) => commit({ id: item.cartItemId, quantity })}
                  onRemove={() => commit({ id: item.cartItemId })}
                />
              ))}
              <div className="customer-cart-assurance">
                <ShieldCheck size={20} />
                <p>
                  Giá và tổng tiền đồng bộ từ máy chủ. Món không khả dụng sẽ được kiểm tra lại khi
                  đặt hàng.
                </p>
              </div>
            </div>
            <CartSummary cart={cart.data}>
              {cart.data.cartItems.some((item) => item.unitPrice <= 0) ? (
                <Alert>Một món chưa có giá hợp lệ. Vui lòng bỏ món đó hoặc chọn món khác.</Alert>
              ) : change.isPending || cart.isFetching ? (
                <Button className="full-width" disabled>
                  Đang đồng bộ giỏ hàng…
                </Button>
              ) : (
                <Link to="/customer/checkout" className="button button-primary full-width">
                  Tiếp tục đặt hàng <ArrowRight size={18} />
                </Link>
              )}
              <Link to="/restaurants" className="customer-cart-continue">
                Tiếp tục khám phá
              </Link>
            </CartSummary>
          </div>
        </>
      )}
    </section>
  );
}
