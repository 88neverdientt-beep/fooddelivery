import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, PageHeader, Button } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { parseOrderId } from '@/features/orders/model';
import { adminApi } from './api';
import { AdminReadState, AdminFacts, AdminOrderView, useAdminIdentity } from './ExistingPages';
import { AdminStatus, adminTime } from './ListPages';
export function AdminDeliveryDetail() {
  const id = parseOrderId(useParams().id),
    { key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'delivery', id],
    queryFn: ({ signal }) => adminApi.delivery(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <Link className="text-link" to="/admin/deliveries">
        Về danh sách giao hàng
      </Link>
      <PageHeader
        title={`Giám sát chuyến #${id}`}
        action={
          <Button variant="secondary" busy={query.isFetching} onClick={() => void query.refetch()}>
            Làm mới chuyến giao
          </Button>
        }
      />
      <AdminReadState query={query}>
        {(data) => (
          <>
            <Card>
              <h2>Thông tin giao hàng</h2>
              <AdminFacts
                entries={[
                  {
                    label: 'Trạng thái chuyến',
                    value: <AdminStatus value={data.delivery.deliveryStatus} kind="delivery" />,
                  },
                  {
                    label: 'Tài xế',
                    value: data.delivery.driver ? (
                      <Link to={`/admin/drivers/${data.delivery.driver.id}`}>
                        {data.delivery.driver.name} · #{data.delivery.driver.id}
                      </Link>
                    ) : (
                      'Chưa có tài xế'
                    ),
                  },
                  { label: 'Biển số xe', value: data.licensePlate },
                  { label: 'Nhà hàng lấy hàng', value: data.delivery.restaurant?.name },
                  { label: 'Địa chỉ lấy', value: data.pickupAddress },
                  { label: 'Địa chỉ giao', value: data.deliveryAddress },
                  { label: 'Đã lấy hàng', value: adminTime(data.delivery.pickupTime) },
                  { label: 'Đã giao', value: adminTime(data.delivery.deliveredTime) },
                ]}
              />
            </Card>
            <AdminOrderView order={data.order} />
          </>
        )}
      </AdminReadState>
    </section>
  );
}
