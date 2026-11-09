import { Link } from 'react-router-dom';
import { PackageCheck, MapPin, Store, Clock3 } from 'lucide-react';
import { Badge, Card, Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { money } from '@/features/public/api';
import { formatOrderDate } from '@/features/orders/model';
import {
  deliveryLabels,
  nextDeliveryStatus,
  type DeliveryStatus,
  type DeliveryDetail,
  type AssignedDelivery,
} from './model';
export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <Badge
      tone={status === 'DELIVERED' ? 'success' : status === 'CANCELLED' ? 'neutral' : 'warning'}
    >
      {deliveryLabels[status]}
    </Badge>
  );
}
export function DeliveryCard({ delivery }: { delivery: AssignedDelivery }) {
  return (
    <Card className="driver-trip-card">
      <div className="driver-trip-heading">
        <h2>Chuyến #{delivery.deliveryId}</h2>
        <DeliveryStatusBadge status={delivery.deliveryStatus} />
      </div>
      <p className="muted">
        Đơn #{delivery.orderId} · Tạo đơn {formatOrderDate(delivery.orderCreatedAt)}
      </p>
      {delivery.deliveredTime && (
        <p className="driver-note">Giao thành công: {formatOrderDate(delivery.deliveredTime)}</p>
      )}
      <div className="driver-addresses">
        <div>
          <Store size={19} />
          <div>
            <span>Điểm lấy hàng</span>
            <h3>{delivery.pickup.name}</h3>
            <p>{delivery.pickup.address}</p>
          </div>
        </div>
        <div>
          <MapPin size={19} />
          <div>
            <span>Điểm giao hàng</span>
            <p>{delivery.deliveryAddress}</p>
          </div>
        </div>
      </div>
      <div className="driver-trip-footer">
        <span>
          {delivery.paymentMethod === 'COD'
            ? `Giá trị đơn COD: ${money(delivery.totalAmount)}`
            : 'Xem thanh toán trong chi tiết'}
        </span>
        <Link className="button button-primary" to={`/driver/deliveries/${delivery.deliveryId}`}>
          Xem chuyến #{delivery.deliveryId}
        </Link>
      </div>
    </Card>
  );
}
export function DeliveryTimeline({
  detail,
}: {
  detail: Pick<DeliveryDetail, 'deliveryStatus' | 'pickupTime' | 'deliveredTime'>;
}) {
  return (
    <Card>
      <h2>
        <Clock3 size={20} /> Mốc giao hàng
      </h2>
      <ol className="driver-timeline">
        <li>
          <strong>Tình trạng hiện tại</strong>
          <span>{deliveryLabels[detail.deliveryStatus]}</span>
        </li>
        <li>
          <strong>Đã lấy hàng</strong>
          <span>
            {detail.pickupTime ? formatOrderDate(detail.pickupTime) : 'Chưa có thời gian lấy hàng'}
          </span>
        </li>
        <li>
          <strong>Giao thành công</strong>
          <span>
            {detail.deliveredTime
              ? formatOrderDate(detail.deliveredTime)
              : 'Chưa có thời gian giao thành công'}
          </span>
        </li>
      </ol>
      <p className="driver-note">
        Hệ thống không lưu thời gian nhận chuyến hoặc bắt đầu di chuyển.
      </p>
    </Card>
  );
}
const names = {
  PICKED_UP: 'Xác nhận đã lấy hàng',
  DELIVERING: 'Bắt đầu giao hàng',
  DELIVERED: 'Xác nhận giao thành công',
};
export function DeliveryActionButtons({
  detail,
  busy,
  onAction,
}: {
  detail: DeliveryDetail;
  busy: boolean;
  onAction: (status: 'PICKED_UP' | 'DELIVERING' | 'DELIVERED') => Promise<void>;
}) {
  const next = nextDeliveryStatus(detail);
  if (!next)
    return (
      <p className="driver-note">
        {detail.deliveryStatus === 'PENDING'
          ? 'Nhà hàng cần chuyển đơn sang sẵn sàng trước khi lấy hàng.'
          : 'Chuyến này không có bước tiếp theo được phép.'}
      </p>
    );
  return (
    <ConfirmDialog
      key={detail.deliveryId + '-' + next}
      trigger={
        <Button busy={busy}>
          <PackageCheck size={19} />
          {names[next]}
        </Button>
      }
      title={names[next] + '?'}
      description={
        next === 'DELIVERED' && detail.order.paymentResponseDTO?.paymentMethod === 'COD'
          ? `Chỉ xác nhận khi đã giao đủ hàng và đã thu COD ${money(detail.order.totalAmount)}. Máy chủ sẽ đồng thời hoàn tất đơn và thanh toán.`
          : 'Máy chủ sẽ kiểm tra tài xế, quyền sở hữu và trạng thái hiện tại trước khi cập nhật.'
      }
      confirm="Xác nhận bước giao hàng"
      busy={busy}
      onConfirm={() => onAction(next)}
    />
  );
}
