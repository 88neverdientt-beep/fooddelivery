import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button, Card, Input, Select, PageHeader } from '@/components/ui';
import { UnsavedChanges } from '@/components/ui/UnsavedChanges';
import { ErrorState } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { parseOrderId } from '@/features/orders/model';
import { adminApi } from './api';
import { adminExistingApi } from './existing-api';
import { AdminReadState, AdminFacts, useAdminIdentity } from './ExistingPages';
import { adminTime, AdminStatus } from './ListPages';
import { useAdminMutation, AdminActionNotice } from './shared';

export const editProfileSchema = z
  .object({
    kind: z.enum(['restaurant', 'driver']),
    name: z.string().trim().min(1, 'Nhập tên hồ sơ.').max(150),
    phoneNumber: z.string().trim().min(1, 'Nhập số liên hệ.').max(15),
    address: z.string().trim().min(1, 'Nhập địa chỉ.').max(255),
    licensePlate: z.string().trim().max(20),
    activity: z
      .enum(['true', 'false', ''])
      .refine((v): boolean => v !== '', 'Chọn trạng thái hoạt động trước khi lưu.'),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'driver' && v.name.length > 100)
      ctx.addIssue({ code: 'custom', path: ['name'], message: 'Tên tài xế tối đa 100 ký tự.' });
  });
type EditProfile = z.infer<typeof editProfileSchema>;
type Editable = {
  name: string;
  phoneNumber: string;
  address: string;
  licensePlate?: string | null;
  driveStatus?: boolean | null;
  restaurantStatus?: boolean | null;
};
const values = (kind: EditProfile['kind'], p: Editable): EditProfile => ({
  kind,
  name: p.name,
  phoneNumber: p.phoneNumber,
  address: p.address,
  licensePlate: p.licensePlate || '',
  activity:
    (kind === 'restaurant' ? p.restaurantStatus : p.driveStatus) === null
      ? ''
      : (String(kind === 'restaurant' ? p.restaurantStatus : p.driveStatus) as 'true' | 'false'),
});
export function AdminProfileEditor({
  kind,
  id,
  profile,
}: {
  kind: EditProfile['kind'];
  id: number;
  profile: Editable;
}) {
  const { key } = useAdminIdentity(),
    cache = useQueryClient(),
    [staged, setStaged] = useState<EditProfile | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<EditProfile>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: values(kind, profile),
  });
  const read = () =>
    kind === 'restaurant' ? adminApi.restaurant(id) : adminExistingApi.driver(id);
  const action = useAdminMutation<EditProfile, Awaited<ReturnType<typeof read>>>(
    async (input: EditProfile, stillCurrent) => {
      const fresh = await read();
      if (!stillCurrent()) throw new DOMException('Account changed', 'AbortError');
      if (JSON.stringify(values(kind, fresh)) !== JSON.stringify(values(kind, profile)))
        throw new ApiError(409, 'STALE_PROFILE');
      const common = { name: input.name, phoneNumber: input.phoneNumber, address: input.address };
      if (kind === 'restaurant')
        await adminApi.saveRestaurant(id, {
          ...common,
          restaurantStatus: input.activity === 'true',
        });
      else
        await adminApi.saveDriver(id, {
          ...common,
          licensePlate: input.licensePlate,
          driveStatus: input.activity === 'true',
        });
    },
    read,
    (fresh, confirmed) => {
      cache.setQueryData([...key, kind, id], fresh);
      if (confirmed) reset(values(kind, fresh));
    },
  );
  return (
    <Card>
      <h2>Chỉnh sửa hồ sơ {kind === 'restaurant' ? 'nhà hàng' : 'tài xế'}</h2>
      <p className="muted">
        Thay đổi thông tin liên hệ và trạng thái hoạt động; lịch sử đơn và chuyến giao được giữ lại.
      </p>
      <UnsavedChanges dirty={isDirty && !action.busy} />
      <AdminActionNotice action={action} />
      <form noValidate className="admin-profile-form" onSubmit={handleSubmit(setStaged)}>
        <Input label="Tên hồ sơ" {...register('name')} error={errors.name?.message} />
        <Input
          label="Số điện thoại"
          {...register('phoneNumber')}
          error={errors.phoneNumber?.message}
        />
        <Input label="Địa chỉ hồ sơ" {...register('address')} error={errors.address?.message} />
        {kind === 'driver' && (
          <Input
            label="Biển số xe"
            {...register('licensePlate')}
            error={errors.licensePlate?.message}
          />
        )}
        <Select
          label={kind === 'restaurant' ? 'Hoạt động nhà hàng' : 'Hoạt động nhận chuyến'}
          {...register('activity')}
        >
          <option value="">Chọn trạng thái</option>
          <option value="true">{kind === 'restaurant' ? 'Mở cửa' : 'Nhận chuyến mới'}</option>
          <option value="false">
            {kind === 'restaurant' ? 'Đóng cửa' : 'Ngừng nhận chuyến mới'}
          </option>
        </Select>
        {errors.activity && (
          <p className="field-error" role="alert">
            {errors.activity.message}
          </p>
        )}
        <div className="admin-form-actions">
          <Button type="submit" disabled={action.busy || !isDirty}>
            Kiểm tra và lưu hồ sơ
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={action.busy}
            onClick={() => reset(values(kind, profile))}
          >
            Nạp hồ sơ hiện tại
          </Button>
        </div>
      </form>
      <Dialog.Root
        open={staged !== null}
        onOpenChange={(open) => {
          if (!open) setStaged(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Xác nhận lưu toàn bộ hồ sơ #{id}</Dialog.Title>
            <Dialog.Description>
              Kiểm tra thông tin liên hệ và trạng thái hoạt động trước khi lưu.
            </Dialog.Description>
            {staged && (
              <AdminFacts
                entries={[
                  { label: 'Tên hồ sơ', value: staged.name },
                  { label: 'Liên hệ', value: staged.phoneNumber },
                  { label: 'Địa chỉ', value: staged.address },
                  {
                    label: 'Hoạt động',
                    value:
                      staged.activity === 'true'
                        ? kind === 'restaurant'
                          ? 'Mở cửa'
                          : 'Nhận chuyến mới'
                        : kind === 'restaurant'
                          ? 'Đóng cửa'
                          : 'Ngừng nhận chuyến mới',
                  },
                ]}
              />
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={action.busy}>
                  Quay lại chỉnh sửa
                </Button>
              </Dialog.Close>
              <Button
                busy={action.busy}
                onClick={() => {
                  if (staged) void action.run(staged).then(() => setStaged(null));
                }}
              >
                Xác nhận lưu hồ sơ
              </Button>
            </div>
            <Dialog.Close className="dialog-close icon-button" aria-label="Đóng xác nhận hồ sơ">
              <X size={19} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
export function AdminRestaurantDetail() {
  const id = parseOrderId(useParams().id),
    { account, key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'restaurant', id],
    queryFn: ({ signal }) => adminApi.restaurant(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <Link to="/admin/restaurants" className="text-link">
        Về danh sách nhà hàng
      </Link>
      <PageHeader title={`Nhà hàng #${id}`} />
      <AdminReadState query={query}>
        {(p) => (
          <>
            <Card>
              <h2>{p.name}</h2>
              <AdminFacts
                entries={[
                  { label: 'Email', value: p.email },
                  { label: 'Liên hệ', value: p.phoneNumber },
                  { label: 'Địa chỉ', value: p.address },
                  {
                    label: 'Hoạt động',
                    value:
                      p.restaurantStatus === null
                        ? 'Chưa ghi nhận'
                        : p.restaurantStatus
                          ? 'Đang mở cửa'
                          : 'Đang đóng cửa',
                  },
                  { label: 'Ngày tạo', value: adminTime(p.createdAt) },
                  { label: 'Tài khoản', value: <AdminStatus value={p.accountStatus} /> },
                  { label: 'Mọi thời gian', value: `${p.orderCount} đơn · ${p.menuCount} món` },
                ]}
              />
              <div className="admin-links">
                <Link className="button button-secondary" to={`/admin/orders?restaurantId=${id}`}>
                  Xem đơn của nhà hàng
                </Link>
                {p.accountId && (
                  <Link className="button button-secondary" to={`/admin/accounts/${p.accountId}`}>
                    Xem tài khoản đăng nhập
                  </Link>
                )}
              </div>
            </Card>
            <AdminProfileEditor
              key={`${account.accountId}/${id}`}
              kind="restaurant"
              id={id}
              profile={p}
            />
          </>
        )}
      </AdminReadState>
    </section>
  );
}
export function AdminDriverProfileDetail() {
  const id = parseOrderId(useParams().id),
    { account, key } = useAdminIdentity();
  const query = useQuery({
    queryKey: [...key, 'driver', id],
    queryFn: ({ signal }) => adminExistingApi.driver(id!, signal),
    enabled: id !== null,
  });
  if (!id) return <ErrorState error={new ApiError(404, 'NOT_FOUND')} />;
  return (
    <section className="admin-management">
      <Link to="/admin/drivers" className="text-link">
        Về danh sách tài xế
      </Link>
      <PageHeader title={`Hồ sơ tài xế #${id}`} />
      <AdminReadState query={query}>
        {(p) => (
          <>
            <Card>
              <h2>{p.name}</h2>
              <AdminFacts
                entries={[
                  { label: 'Email', value: p.email },
                  { label: 'Liên hệ', value: p.phoneNumber },
                  { label: 'Địa chỉ', value: p.address },
                  { label: 'Biển số', value: p.licensePlate },
                  {
                    label: 'Nhận chuyến mới',
                    value:
                      p.driveStatus === null
                        ? 'Chưa ghi nhận'
                        : p.driveStatus
                          ? 'Đang nhận mới'
                          : 'Ngừng nhận mới',
                  },
                  { label: 'Ngày tạo', value: adminTime(p.createdAt) },
                ]}
              />
              <Link className="button button-secondary" to={`/admin/deliveries?driverId=${id}`}>
                Xem các chuyến của tài xế
              </Link>
            </Card>
            <AdminProfileEditor
              key={`${account.accountId}/${id}`}
              kind="driver"
              id={id}
              profile={p}
            />
          </>
        )}
      </AdminReadState>
    </section>
  );
}
