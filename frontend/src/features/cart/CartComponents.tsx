import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, Trash2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui';
import { FoodImage } from '@/components/ui/FoodImage';
import { money } from '@/features/public/api';
import { MAX_CART_QUANTITY, quantitySchema, type Cart, type CartItem } from './api';

export function CartItemRow({
  item,
  disabled = false,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  disabled?: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(String(item.quantity));
  const [error, setError] = useState('');
  const quantityId = `quantity-${item.cartItemId}`;
  const update = (value: unknown) => {
    const result = quantitySchema.safeParse(value);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError('');
    if (result.data !== item.quantity) onQuantity(result.data);
  };
  return (
    <article className="customer-cart-item" aria-label={item.foodItemName}>
      <div className="customer-cart-visual">
        <FoodImage alt="Ảnh minh họa món ăn" sizes="100px" />
        <small>Ảnh minh họa</small>
      </div>
      <div className="customer-cart-item-content">
        <h2>{item.foodItemName}</h2>
        <p className="muted">Đơn giá: {money(item.unitPrice)}</p>
        {item.note && <p className="customer-cart-note">{item.note}</p>}
        <form
          className="customer-quantity-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            update(draft);
          }}
        >
          <div className="customer-quantity-controls">
            <button
              type="button"
              className="icon-button"
              aria-label={`Giảm số lượng ${item.foodItemName}`}
              disabled={disabled || item.quantity <= 1}
              onClick={() => update(item.quantity - 1)}
            >
              <Minus size={17} />
            </button>
            <label className="sr-only" htmlFor={quantityId}>
              Số lượng {item.foodItemName}
            </label>
            <input
              id={quantityId}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_CART_QUANTITY}
              step={1}
              value={draft}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={error ? quantityId + '-error' : undefined}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={`Tăng số lượng ${item.foodItemName}`}
              disabled={disabled || item.quantity >= MAX_CART_QUANTITY}
              onClick={() => update(item.quantity + 1)}
            >
              <Plus size={17} />
            </button>
          </div>
          <Button
            type="submit"
            variant="ghost"
            disabled={disabled || draft === String(item.quantity)}
          >
            Cập nhật
          </Button>
        </form>
        {error && (
          <p className="field-error" id={quantityId + '-error'} role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="customer-cart-item-end">
        <strong>{money(item.subtotal)}</strong>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          aria-label={`Xóa ${item.foodItemName} khỏi giỏ`}
          onClick={onRemove}
        >
          <Trash2 size={17} /> Xóa
        </Button>
      </div>
    </article>
  );
}

export function CartSummary({ cart, children }: { cart: Cart; children?: ReactNode }) {
  return (
    <aside className="customer-cart-summary" aria-label="Chi tiết thanh toán">
      <span className="eyebrow">BỮA NGON CỦA BẠN</span>
      <h2>Chi tiết thanh toán</h2>
      <dl>
        <div>
          <dt>Tạm tính</dt>
          <dd>{money(cart.subtotal)}</dd>
        </div>
        <div>
          <dt>Phí giao hàng</dt>
          <dd>{money(cart.shippingFee)}</dd>
        </div>
        <div className="customer-summary-total">
          <dt>Tổng thanh toán</dt>
          <dd>{money(cart.totalAmount)}</dd>
        </div>
      </dl>
      <p className="customer-summary-note">
        Giá và phí được lấy từ máy chủ. Đơn hàng sẽ được kiểm tra lại khi xác nhận.
      </p>
      {children}
    </aside>
  );
}

export function CartRestaurant({ cart }: { cart: Cart }) {
  if (!cart.restaurant) return null;
  return (
    <div className="customer-cart-restaurant">
      <span>
        <Utensils size={23} />
      </span>
      <div>
        <small>Đặt món từ</small>
        <h2>{cart.restaurant.name}</h2>
      </div>
      <Link to={`/restaurants/${cart.restaurant.restaurantId}`} className="text-link">
        Thêm món <ArrowRight size={16} />
      </Link>
    </div>
  );
}
