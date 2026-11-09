import { Check, Clock3, MapPin, PackageCheck, ReceiptText, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { money } from '@/features/public/api';
import {
  deliveryLabels,
  formatOrderDate,
  orderLabels,
  orderSteps,
  paymentLabels,
  type Order,
} from './model';
import './orders.css';

export function OrderCard({ order }: { order: Order }) {
  return (
    <article className="customer-order-card">
      <div className="order-card-heading">
        <div>
          <span className="eyebrow">ĐƠN HÀNG #{order.orderId}</span>
          <h2>{order.restaurant.name}</h2>
        </div>
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
      </div>
      <p className="order-date">
        <Clock3 size={16} />
        {formatOrderDate(order.createdAt)}
      </p>
      <p className="order-card-foods">
        {order.orderDetails.map((item) => `${item.quantity} × ${item.foodItemName}`).join(' · ')}
      </p>
      {order.deliveryOutputDTO && (
        <p className="order-delivery-label">
          <Truck size={16} />
          {deliveryLabels[order.deliveryOutputDTO.deliveryStatus]}
        </p>
      )}
      <div className="order-card-footer">
        <strong>{money(order.totalAmount)}</strong>
        <Link className="button button-secondary" to={`/customer/orders/${order.orderId}`}>
          Xem chi tiết <ReceiptText size={17} />
        </Link>
      </div>
    </article>
  );
}
export function OrderTimeline({ order }: { order: Order }) {
  const index = orderSteps.indexOf(order.orderStatus as Exclude<Order['orderStatus'], 'CANCELLED'>);
  return (
    <section className="order-panel" aria-label="Tiến trình đơn hàng">
      <h2>
        <PackageCheck size={22} /> Tiến trình đơn hàng
      </h2>
      <p className="muted">Trạng thái được đồng bộ từ nhà hàng và hệ thống giao hàng.</p>
      {order.orderStatus === 'CANCELLED' ? (
        <div className="order-cancelled">
          <strong>Đơn hàng đã hủy</strong>
          <p>Đơn này không tiếp tục được chuẩn bị hoặc giao.</p>
        </div>
      ) : (
        <ol className="order-timeline">
          {orderSteps.map((status, position) => (
            <li
              className={position < index ? 'done' : position === index ? 'current' : ''}
              key={status}
              aria-current={position === index ? 'step' : undefined}
            >
              <span className="order-step-marker" aria-hidden="true">
                {position < index ? <Check size={16} /> : position + 1}
              </span>
              <div>
                <strong>{orderLabels[status]}</strong>
                {position === index && <small>Trạng thái hiện tại</small>}
                {status === 'PENDING' && <small>{formatOrderDate(order.createdAt)}</small>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
export function OrderContents({ order }: { order: Order }) {
  return (
    <section className="order-panel">
      <h2>
        <ReceiptText size={22} /> Món đã đặt
      </h2>
      <ul className="order-food-list">
        {order.orderDetails.map((item) => (
          <li key={item.orderDetailId}>
            <div>
              <strong>{item.foodItemName}</strong>
              <span>
                {item.quantity} × {money(item.unitPrice)}
              </span>
              {item.note && <small>Ghi chú: {item.note}</small>}
            </div>
            <strong>{money(item.subtotalItem)}</strong>
          </li>
        ))}
      </ul>
      <dl className="order-totals">
        <div>
          <dt>Tạm tính</dt>
          <dd>{money(order.subtotal)}</dd>
        </div>
        <div>
          <dt>Phí giao hàng</dt>
          <dd>{money(order.shippingFee)}</dd>
        </div>
        <div className="order-grand-total">
          <dt>Tổng thanh toán</dt>
          <dd>{money(order.totalAmount)}</dd>
        </div>
      </dl>
      <p className="order-server-note">Giá và tổng tiền được xác nhận bởi máy chủ.</p>
    </section>
  );
}
export function OrderPaymentDelivery({ order }: { order: Order }) {
  const delivery = order.deliveryOutputDTO,
    payment = order.paymentResponseDTO;
  return (
    <div className="order-payment-delivery">
      <section className="order-panel">
        <h2>
          <MapPin size={22} /> Giao hàng
        </h2>
        <p className="order-address">{order.deliveryAddress}</p>
        <dl className="order-info-list">
          <div>
            <dt>Trạng thái giao</dt>
            <dd>
              {delivery
                ? deliveryLabels[delivery.deliveryStatus]
                : 'Chưa có chuyến giao được ghi nhận'}
            </dd>
          </div>
          {delivery?.pickupTime && (
            <div>
              <dt>Đã lấy món lúc</dt>
              <dd>{formatOrderDate(delivery.pickupTime)}</dd>
            </div>
          )}
          {delivery?.deliveredTime && (
            <div>
              <dt>Đã giao lúc</dt>
              <dd>{formatOrderDate(delivery.deliveredTime)}</dd>
            </div>
          )}
        </dl>
      </section>
      <section className="order-panel">
        <h2>
          <ReceiptText size={22} /> Thanh toán
        </h2>
        {payment ? (
          <dl className="order-info-list">
            <div>
              <dt>Phương thức</dt>
              <dd>
                {payment.paymentMethod === 'COD'
                  ? 'Tiền mặt khi nhận hàng (COD)'
                  : payment.paymentMethod || 'Chưa ghi nhận'}
              </dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>{paymentLabels[payment.paymentStatus]}</dd>
            </div>
            <div>
              <dt>Số tiền</dt>
              <dd>{money(payment.amount)}</dd>
            </div>
            {payment.paidAt && (
              <div>
                <dt>Thanh toán lúc</dt>
                <dd>{formatOrderDate(payment.paidAt)}</dd>
              </div>
            )}
            {payment.refundedAt && (
              <div>
                <dt>Hoàn tiền lúc</dt>
                <dd>{formatOrderDate(payment.refundedAt)}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="muted">Chưa có thông tin thanh toán được ghi nhận.</p>
        )}
      </section>
    </div>
  );
}
