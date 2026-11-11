import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Input, Checkbox, Button, PageHeader } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/feedback';
import { UnsavedChanges } from '@/components/ui/UnsavedChanges';
import { driverApi } from './api';
import { profileInput, type ProfileInput, type DriverProfile } from './model';
import { useDriver, useDriverAction, ActionNotice, DriverSection } from './shared';
export function DriverProfileForm({
  profile,
  busy,
  onSave,
}: {
  profile: DriverProfile;
  busy: boolean;
  onSave: (value: ProfileInput) => Promise<DriverProfile | undefined>;
}) {
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInput),
    defaultValues: {
      ...(profile.version === undefined ? {} : { expectedVersion: profile.version }),
      name: profile.name,
      phoneNumber: profile.phoneNumber,
      address: profile.address,
      licensePlate: profile.licensePlate || '',
      driveStatus: profile.driveStatus === true,
    },
  });
  return (
    <form
      className="driver-form"
      aria-label="Hồ sơ tài xế"
      noValidate
      onSubmit={form.handleSubmit(async (value) => {
        const saved = await onSave(value);
        if (saved)
          form.reset({
            ...(saved.version === undefined ? {} : { expectedVersion: saved.version }),
            name: saved.name,
            phoneNumber: saved.phoneNumber,
            address: saved.address,
            licensePlate: saved.licensePlate || '',
            driveStatus: saved.driveStatus === true,
          });
      })}
    >
      <UnsavedChanges dirty={form.formState.isDirty} />
      <fieldset disabled={busy}>
        <Input
          label="Họ tên tài xế"
          maxLength={100}
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Input
          label="Số điện thoại tài xế"
          type="tel"
          maxLength={15}
          error={form.formState.errors.phoneNumber?.message}
          {...form.register('phoneNumber')}
        />
        <Input
          label="Địa chỉ tài xế"
          maxLength={255}
          error={form.formState.errors.address?.message}
          {...form.register('address')}
        />
        <Input
          label="Biển số xe"
          maxLength={20}
          error={form.formState.errors.licensePlate?.message}
          {...form.register('licensePlate')}
        />
        <Checkbox type="checkbox" {...form.register('driveStatus')}>
          Đang nhận chuyến mới
        </Checkbox>
        <p className="driver-note">
          Tạm ngừng nhận chuyến mới vẫn cho phép tiếp tục các chuyến đã nhận. Đây không phải trạng
          thái xác minh tài khoản.
        </p>
        <div className="driver-form-actions">
          <Button type="submit" busy={busy}>
            Lưu hồ sơ tài xế
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            form.reset({
              name: profile.name,
              address: profile.address,
              phoneNumber: profile.phoneNumber,
              licensePlate: profile.licensePlate || '',
              driveStatus: profile.driveStatus === true,
              ...(profile.version === undefined ? {} : { expectedVersion: profile.version }),
            })
          }
        >
          Nạp hồ sơ hiện tại
        </Button>
      </fieldset>
    </form>
  );
}
export function DriverProfilePage() {
  const { account, key } = useDriver(),
    cache = useQueryClient();
  const data = useQuery({
    queryKey: [...key, 'profile'],
    queryFn: ({ signal }) => driverApi.profile(signal),
  });
  const action = useDriverAction((value: ProfileInput) => driverApi.updateProfile(value));
  return (
    <DriverSection>
      <PageHeader
        title="Hồ sơ tài xế"
        description="Thông tin liên hệ, phương tiện và trạng thái nhận chuyến của bạn."
      />
      <p className="driver-note">
        Email đăng nhập: {account.email} · <Link to="/account/change-password">Đổi mật khẩu</Link>
      </p>
      <ActionNotice action={action} />
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <DriverProfileForm
          profile={data.data}
          busy={action.busy}
          onSave={async (value) => {
            const result = await action.run(value);
            if (result)
              await cache.invalidateQueries({
                queryKey: ['account', account.accountId, 'profile'],
              });
            return result;
          }}
        />
      )}
    </DriverSection>
  );
}
