import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, PageHeader } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { parseOrderId } from '@/features/orders/model';
import { roleName } from '@/types/domain';
import { adminApi } from './api';
import { AdminReadState, AdminFacts, useAdminIdentity } from './ExistingPages';
import { AdminStatus, adminTime } from './ListPages';
import { useAdminMutation, AdminActionNotice } from './shared';
import type { AccountRow } from './model';

export function AccountStatusActions({ row }: { row: AccountRow }) {
  const { account, key } = useAdminIdentity(),
    cache = useQueryClient();
  const next = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const action = useAdminMutation(
    (input: { status: 'ACTIVE' | 'DISABLED'; expectedStatus: 'ACTIVE' | 'DISABLED' }) =>
      adminApi.status(row.accountId, input.status, input.expectedStatus, row.version),
    () => adminApi.account(row.accountId),
    (fresh) => cache.setQueryData([...key, 'account', row.accountId], fresh),
  );
  return (
    <Card>
      <ShieldCheck size={25} />
      <h2>Trạng thái đăng nhập</h2>
      <p>
        {row.status === 'ACTIVE'
          ? 'Vô hiệu hóa sẽ thu hồi phiên đăng nhập của tài khoản này. Hồ sơ và lịch sử nghiệp vụ được giữ lại.'
          : 'Kích hoạt cho phép tài khoản đăng nhập lại. Các phiên đã thu hồi không được khôi phục.'}
      </p>
      <AdminActionNotice action={action} />
      <ConfirmDialog
        trigger={
          <Button
            variant={next === 'DISABLED' ? 'danger' : 'primary'}
            disabled={action.busy || row.accountId === account.accountId}
          >
            {next === 'DISABLED' ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
          </Button>
        }
        title={`${next === 'DISABLED' ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản #${row.accountId}?`}
        description={`${row.email} · ${roleName[row.role]}. Xác nhận thay đổi trạng thái đăng nhập; dữ liệu đơn, giao hàng và thanh toán được giữ nguyên.`}
        confirm="Xác nhận trạng thái tài khoản"
        busy={action.busy}
        onConfirm={() => action.run({ status: next, expectedStatus: row.status })}
      />
      {row.accountId === account.accountId && (
        <p className="muted">Bạn đang dùng tài khoản này. Không thể tự vô hiệu hóa.</p>
      )}
    </Card>
  );
}
export function AdminAccountDetail() {
  const id = parseOrderId(useParams().id),
    { account, key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'account', id],
    queryFn: ({ signal }) => adminApi.account(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <Link className="text-link" to="/admin/accounts">
        Về danh sách tài khoản
      </Link>
      <PageHeader
        title={`Tài khoản #${id}`}
        description="Định danh và vai trò được quản lý từ hệ thống tài khoản."
      />
      <AdminReadState query={query}>
        {(row) => (
          <div className="admin-profile-grid">
            <Card>
              <h2>{row.email}</h2>
              <Badge>{roleName[row.role]}</Badge>
              <AdminFacts
                entries={[
                  { label: 'Tên hồ sơ', value: row.name },
                  { label: 'Trạng thái', value: <AdminStatus value={row.status} /> },
                  { label: 'Ngày tạo tài khoản', value: adminTime(row.createdAt) },
                ]}
              />
              {row.customerId && (
                <Link to={`/admin/customers/${row.customerId}`}>
                  Hồ sơ khách hàng #{row.customerId}
                </Link>
              )}
              {row.restaurantId && (
                <Link to={`/admin/restaurants/${row.restaurantId}`}>
                  Hồ sơ nhà hàng #{row.restaurantId}
                </Link>
              )}
              {row.driverId && (
                <Link to={`/admin/drivers/${row.driverId}`}>Hồ sơ tài xế #{row.driverId}</Link>
              )}
            </Card>
            <AccountStatusActions
              key={`${account.accountId}/${row.accountId}/${row.status}`}
              row={row}
            />
          </div>
        )}
      </AdminReadState>
    </section>
  );
}
