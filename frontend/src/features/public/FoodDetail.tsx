import { useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Utensils } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Button, Badge, Input } from '@/components/ui';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FoodImage } from '@/components/ui/FoodImage';
import { Alert, ErrorState, Skeleton, useToast } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { cartApi, cartQueryKey, MAX_CART_QUANTITY, quantitySchema } from '@/features/cart/api';
import { publicApi, money } from './api';
import { validId } from './model';
import './customer-menu.css';

type AddRequest = {
  accountId: number;
  customerId: number;
  generation: number;
  menuId: number;
  restaurantId: number;
  quantity: number;
};
export function FoodDetailPage() {
  const params = useParams();
  const id = params.id || '';
  const foodId = params.foodId || params.menuItemId || params.itemId || '';
  const valid = validId(id) && validId(foodId);
  const location = useLocation();
  const auth = useAuth();
  const session = useSession();
  const client = useQueryClient();
  const toast = useToast();
  const customer = auth.account?.role === 'CUSTOMER' ? auth.account : null;
  const [selection, setSelection] = useState({ foodId, quantity: '1', error: '' });
  const [result, setResult] = useState({ foodId: '', added: false, error: '' });
  const locked = useRef(false);
  const draft = selection.foodId === foodId ? selection : { foodId, quantity: '1', error: '' };
  const restaurant = useQuery({
    queryKey: ['public', 'restaurant', id],
    queryFn: ({ signal }) => publicApi.restaurant(id, signal),
    enabled: valid,
  });
  const menu = useQuery({
    queryKey: ['public', 'menu-item', foodId],
    queryFn: ({ signal }) => publicApi.menuItem(foodId, signal),
    enabled: valid,
  });
  const cart = useQuery({
    queryKey: cartQueryKey(customer?.accountId || 0, customer?.customerId || 0),
    queryFn: ({ signal }) => cartApi.read(signal),
    enabled: valid && !!customer,
    staleTime: 0,
  });
  const current = (request: AddRequest) => {
    const snapshot = session.getSnapshot();
    return (
      snapshot.account?.accountId === request.accountId &&
      snapshot.account?.customerId === request.customerId &&
      snapshot.generation === request.generation
    );
  };
  const add = useMutation({
    retry: false,
    mutationFn: async (request: AddRequest) => {
      const key = cartQueryKey(request.accountId, request.customerId);
      await client.cancelQueries({ queryKey: key });
      if (!current(request)) throw new DOMException('Account changed', 'AbortError');
      const fresh = await cartApi.read();
      if (!current(request)) throw new DOMException('Account changed', 'AbortError');
      client.setQueryData(key, fresh);
      if (fresh.restaurant && fresh.restaurant.restaurantId !== request.restaurantId)
        throw new ApiError(
          400,
          'MIXED_RESTAURANT',
          'Giỏ hiện có món của nhà hàng khác. Hãy xem và tự điều chỉnh giỏ trước khi thêm món này.',
        );
      const existing =
        fresh.cartItems.find((item) => item.restaurantFoodItemId === request.menuId)?.quantity || 0;
      if (existing + request.quantity > MAX_CART_QUANTITY)
        throw new ApiError(
          400,
          'QUANTITY',
          'Tổng số lượng món trong giỏ vượt giới hạn máy chủ. Vui lòng giảm số lượng.',
        );
      return cartApi.add({ restaurantFoodItemId: request.menuId, quantity: request.quantity });
    },
    onSuccess: async (_, request) => {
      if (!current(request)) return;
      await client.invalidateQueries({
        queryKey: cartQueryKey(request.accountId, request.customerId),
      });
      if (
        !current(request) ||
        request.menuId !== Number(foodId) ||
        request.restaurantId !== Number(id)
      )
        return;
      setResult({ foodId, added: true, error: '' });
      toast('Đã thêm món vào giỏ hàng.');
    },
    onError: async (problem, request) => {
      if (!current(request)) return;
      await client.invalidateQueries({
        queryKey: cartQueryKey(request.accountId, request.customerId),
      });
      if (
        !current(request) ||
        request.menuId !== Number(foodId) ||
        request.restaurantId !== Number(id)
      )
        return;
      setResult({
        foodId,
        added: false,
        error: `${problem.message} Hãy kiểm tra giỏ trước khi thử lại.`,
      });
    },
  });
  if (!valid)
    return (
      <section className="container section-space">
        <ErrorState error={new ApiError(404, '404')} />
      </section>
    );
  if (restaurant.isPending || menu.isPending)
    return (
      <section className="container section-space">
        <Skeleton count={1} />
      </section>
    );
  if (restaurant.isError || menu.isError)
    return (
      <section className="container section-space">
        <ErrorState
          error={restaurant.error || menu.error}
          onRetry={() => {
            void restaurant.refetch();
            void menu.refetch();
          }}
        />
      </section>
    );
  const item = menu.data;
  const place = restaurant.data;
  if (
    item.restaurant.restaurantId !== Number(id) ||
    item.restaurantFoodItemId !== Number(foodId) ||
    place.restaurantId !== Number(id)
  )
    return (
      <section className="container section-space">
        <ErrorState error={new ApiError(404, '404')} />
      </section>
    );
  const mixed =
    !!cart.data?.restaurant && cart.data.restaurant.restaurantId !== item.restaurant.restaurantId;
  const unavailable = !place.restaurantStatus || !item.isAvailable || item.price <= 0;
  const pending = add.isPending || cart.isFetching;
  const submit = () => {
    if (!customer || locked.current || unavailable || mixed || pending || cart.isError) return;
    const quantity = quantitySchema.safeParse(draft.quantity);
    if (!quantity.success) {
      setSelection({ ...draft, error: quantity.error.issues[0].message });
      return;
    }
    setSelection({ ...draft, error: '' });
    locked.current = true;
    void add
      .mutateAsync({
        accountId: customer.accountId,
        customerId: customer.customerId!,
        generation: auth.generation,
        menuId: item.restaurantFoodItemId,
        restaurantId: item.restaurant.restaurantId,
        quantity: quantity.data,
      })
      .catch(() => {})
      .finally(() => {
        locked.current = false;
      });
  };
  const stepQuantity = (direction: number) => {
    const value = quantitySchema.safeParse(draft.quantity);
    const next = Math.min(
      MAX_CART_QUANTITY,
      Math.max(1, (value.success ? value.data : 1) + direction),
    );
    setSelection({ foodId, quantity: String(next), error: '' });
  };
  return (
    <section className="container section-space customer-food-detail">
      <Breadcrumb
        items={[
          { label: 'Nhà hàng', to: '/restaurants' },
          { label: place.name, to: `/restaurants/${id}` },
          { label: item.foodItem.name },
        ]}
      />
      <div className="customer-food-detail-grid">
        <div className="customer-food-detail-photo">
          {item.foodItem.imageUrl ? (
            <img src={item.foodItem.imageUrl} alt={item.foodItem.name} loading="lazy" />
          ) : (
            <FoodImage
              kind={/cơm|rice/i.test(item.foodItem.category || '') ? 'rice' : 'pho'}
              alt="Ảnh minh họa món ăn Việt"
              priority
              sizes="(max-width:767px) calc(100vw - 32px), 560px"
            />
          )}
          {!item.foodItem.imageUrl && (
            <span>Ảnh minh họa · hình ảnh món thực tế chưa được nhà hàng cung cấp</span>
          )}
        </div>
        <div className="customer-food-detail-copy">
          <p className="eyebrow">
            <Utensils size={15} /> {place.name}
          </p>
          <div className="customer-food-detail-badges">
            <Badge tone={item.isAvailable ? 'success' : 'neutral'}>
              {item.isAvailable ? 'Còn bán' : 'Tạm hết'}
            </Badge>
            <Badge tone={place.restaurantStatus ? 'success' : 'neutral'}>
              {place.restaurantStatus ? 'Nhà hàng đang mở cửa' : 'Nhà hàng đang nghỉ'}
            </Badge>
          </div>
          <h1>{item.foodItem.name}</h1>
          {item.foodItem.category && (
            <p className="customer-food-category">{item.foodItem.category}</p>
          )}
          <strong className="customer-food-detail-price">{money(item.price)}</strong>
          <p className="customer-food-description">
            {item.foodItem.description || 'Nhà hàng chưa cung cấp mô tả cho món này.'}
          </p>
          {mixed && (
            <Alert tone="info">
              Giỏ hiện có món của nhà hàng khác. Mỗi giỏ chỉ chứa món từ một nhà hàng; chúng tôi
              không tự xóa giỏ cũ.{' '}
              <Link to="/customer/cart" className="text-link">
                Xem giỏ hiện tại
              </Link>
            </Alert>
          )}
          {unavailable && (
            <Alert tone="info">
              {!place.restaurantStatus
                ? 'Nhà hàng đang nghỉ, hiện chưa nhận thêm món.'
                : !item.isAvailable
                  ? 'Món tạm hết, vui lòng chọn món khác.'
                  : 'Món chưa có giá bán hợp lệ, vui lòng chọn món khác.'}
            </Alert>
          )}
          {customer && cart.isError && (
            <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
          )}
          {result.foodId === foodId && result.error && <Alert>{result.error}</Alert>}
          <form
            className="customer-food-add-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="customer-food-quantity">
              <Button
                type="button"
                variant="secondary"
                aria-label="Giảm số lượng"
                disabled={pending || Number(draft.quantity) <= 1}
                onClick={() => stepQuantity(-1)}
              >
                <Minus size={18} />
              </Button>
              <Input
                label="Số lượng"
                type="number"
                min={1}
                max={MAX_CART_QUANTITY}
                step={1}
                inputMode="numeric"
                value={draft.quantity}
                onChange={(event) =>
                  setSelection({ foodId, quantity: event.target.value, error: '' })
                }
                error={draft.error}
                disabled={pending}
              />
              <Button
                type="button"
                variant="secondary"
                aria-label="Tăng số lượng"
                disabled={pending || Number(draft.quantity) >= MAX_CART_QUANTITY}
                onClick={() => stepQuantity(1)}
              >
                <Plus size={18} />
              </Button>
            </div>
            {!auth.account ? (
              <Link
                className="button button-primary full-width"
                to="/login"
                state={{ from: location.pathname }}
              >
                Đăng nhập để thêm món <ArrowRight size={18} />
              </Link>
            ) : customer ? (
              <Button
                className="full-width"
                type="submit"
                busy={add.isPending}
                disabled={unavailable || mixed || pending || cart.isPending || cart.isError}
              >
                <ShoppingBag size={19} /> Thêm vào giỏ hàng
              </Button>
            ) : (
              <Alert tone="info">Chức năng đặt món dành cho tài khoản CUSTOMER.</Alert>
            )}
          </form>
          {result.foodId === foodId && result.added && (
            <Link
              className="button button-secondary full-width customer-food-cart-link"
              to="/customer/cart"
            >
              Xem giỏ hàng <ArrowRight size={18} />
            </Link>
          )}
          <p className="customer-food-authority">
            Giá được lấy từ thực đơn nhà hàng. Tổng tiền, phí giao hàng và tình trạng món sẽ được
            máy chủ kiểm tra lại trong giỏ và khi đặt hàng.
          </p>
          <Link to={`/restaurants/${id}`} className="text-link">
            <ArrowLeft size={16} /> Trở lại thực đơn
          </Link>
        </div>
      </div>
    </section>
  );
}
