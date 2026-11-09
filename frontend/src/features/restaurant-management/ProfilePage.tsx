import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Checkbox, PageHeader } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/feedback';
import { useSession } from '@/features/auth/AuthProvider';
import { restaurantApi } from './api';
import { profileInput, type ProfileInput, type RestaurantProfile } from './model';
import {
  useRestaurant,
  useAction,
  ActionNotice,
  UnsavedChanges,
  ManagementSection,
} from './shared';
export function RestaurantProfileForm({
  profile,
  onSave,
  busy,
}: {
  profile: RestaurantProfile;
  onSave: (value: ProfileInput) => Promise<RestaurantProfile | undefined>;
  busy: boolean;
}) {
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInput),
    defaultValues: {
      name: profile.name,
      address: profile.address,
      phoneNumber: profile.phoneNumber,
      restaurantStatus: profile.restaurantStatus,
    },
  });
  return (
    <form
      className="management-form"
      aria-label="Thông tin nhà hàng"
      noValidate
      onSubmit={form.handleSubmit(async (value) => {
        const saved = await onSave(value);
        if (saved)
          form.reset({
            name: saved.name,
            address: saved.address,
            phoneNumber: saved.phoneNumber,
            restaurantStatus: saved.restaurantStatus,
          });
      })}
    >
      <UnsavedChanges dirty={form.formState.isDirty} />
      <fieldset disabled={busy}>
        <Input
          label="Tên nhà hàng"
          maxLength={150}
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Input
          label="Số điện thoại nhà hàng"
          type="tel"
          maxLength={15}
          error={form.formState.errors.phoneNumber?.message}
          {...form.register('phoneNumber')}
        />
        <Input
          label="Địa chỉ nhà hàng"
          maxLength={255}
          error={form.formState.errors.address?.message}
          {...form.register('address')}
        />
        <Checkbox type="checkbox" {...form.register('restaurantStatus')}>
          Nhà hàng đang mở cửa
        </Checkbox>
        <Button type="submit" busy={busy}>
          Lưu thông tin nhà hàng
        </Button>
      </fieldset>
    </form>
  );
}
export function RestaurantProfilePage() {
  const { account, key } = useRestaurant();
  const session = useSession(),
    cache = useQueryClient();
  const data = useQuery({
    queryKey: [...key, 'profile'],
    queryFn: ({ signal }) => restaurantApi.profile(signal),
  });
  const action = useAction((input: ProfileInput) => restaurantApi.updateProfile(input));
  return (
    <ManagementSection>
      <PageHeader
        title="Thông tin nhà hàng"
        description="Thông tin liên hệ và trạng thái kinh doanh do nhà hàng quản lý."
      />
      <p className="management-note">
        Email đăng nhập: {account.email} · Đổi mật khẩu trong mục Bảo mật.
      </p>
      <ActionNotice action={action} />
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <RestaurantProfileForm
          profile={data.data}
          busy={action.busy}
          onSave={async (value) => {
            const saved = await action.run(value);
            if (saved && session.getSnapshot().account?.accountId === account.accountId) {
              await cache.invalidateQueries({
                queryKey: ['account', account.accountId, 'profile'],
              });
              await session.verify();
            }
            return saved;
          }}
        />
      )}
    </ManagementSection>
  );
}
