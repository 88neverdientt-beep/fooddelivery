import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Check, X } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { Alert, useToast } from '@/components/feedback';
import { Button, Input } from '@/components/ui';
import { normalizeError } from '@/lib/api/http';
import { customerApi, customerProfileInput, type CustomerProfileInput } from './api';

type Actor = { accountId: number; customerId: number; generation: number };
type Edit = { actor: Actor; input: CustomerProfileInput };
export function CustomerProfile({
  profile,
}: {
  profile: { name: string; phoneNumber?: string; address: string; version?: number };
}) {
  const { account } = useAuth();
  const authSession = useSession();
  const cache = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const form = useForm<CustomerProfileInput>({
    resolver: zodResolver(customerProfileInput),
    defaultValues: {
      ...(profile.version === undefined ? {} : { expectedVersion: profile.version }),
      name: profile.name,
      phoneNumber: profile.phoneNumber || '',
      address: profile.address,
    },
  });
  const sameActor = (actor: Actor) => {
    const now = authSession.getSnapshot();
    return (
      now.status === 'authenticated' &&
      now.generation === actor.generation &&
      now.account?.accountId === actor.accountId &&
      now.account.customerId === actor.customerId
    );
  };
  const mutation = useMutation({
    retry: false,
    onMutate: async ({ actor }: Edit) => {
      await cache.cancelQueries({ queryKey: ['account', actor.accountId, 'profile'] });
      if (!sameActor(actor)) throw new DOMException('Account changed', 'AbortError');
    },
    mutationFn: ({ actor, input }: Edit) => {
      if (!sameActor(actor)) throw new DOMException('Account changed', 'AbortError');
      return customerApi.update(input, actor.accountId);
    },
    onSuccess: async (saved, { actor }) => {
      if (!sameActor(actor)) return;
      await authSession.verify();
      if (!sameActor(actor)) return;
      cache.setQueryData(['account', actor.accountId, 'profile'], saved);
      await cache.invalidateQueries({ queryKey: ['account', actor.accountId, 'profile'] });
      if (!sameActor(actor)) return;
      form.reset({
        name: saved.name,
        phoneNumber: saved.phoneNumber,
        address: saved.address,
        ...(saved.version === undefined ? {} : { expectedVersion: saved.version }),
      });
      setEditing(false);
      toast('Đã cập nhật hồ sơ của bạn.');
    },
  });
  if (account?.role !== 'CUSTOMER' || !account.customerId) return null;
  const open = () => {
    mutation.reset();
    form.reset({
      ...(profile.version === undefined ? {} : { expectedVersion: profile.version }),
      name: profile.name,
      phoneNumber: profile.phoneNumber || '',
      address: profile.address,
    });
    setEditing(true);
  };
  return (
    <div className="customer-profile-editor">
      {!editing ? (
        <Button variant="secondary" onClick={open}>
          <Pencil size={17} />
          Chỉnh sửa hồ sơ
        </Button>
      ) : (
        <form
          aria-label="Chỉnh sửa hồ sơ khách hàng"
          noValidate
          onSubmit={form.handleSubmit((input) => {
            const now = authSession.getSnapshot();
            if (now.account?.role !== 'CUSTOMER' || !now.account.customerId) return;
            mutation.mutate({
              actor: {
                accountId: now.account.accountId,
                customerId: now.account.customerId,
                generation: now.generation,
              },
              input,
            });
          })}
        >
          <h3>Thông tin cá nhân</h3>
          <p className="muted">Email đăng nhập và quyền tài khoản được giữ nguyên.</p>
          <fieldset disabled={mutation.isPending}>
            <Input
              label="Họ và tên"
              autoComplete="name"
              maxLength={100}
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <Input
              label="Số điện thoại"
              type="tel"
              autoComplete="tel"
              maxLength={15}
              error={form.formState.errors.phoneNumber?.message}
              {...form.register('phoneNumber')}
            />
            <Input
              label="Địa chỉ"
              autoComplete="street-address"
              maxLength={255}
              error={form.formState.errors.address?.message}
              {...form.register('address')}
            />
            {mutation.isError && <Alert>{normalizeError(mutation.error).message}</Alert>}
            <div className="customer-profile-actions">
              <Button type="submit" busy={mutation.isPending}>
                <Check size={17} />
                Lưu hồ sơ
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                <X size={17} />
                Hủy chỉnh sửa
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
