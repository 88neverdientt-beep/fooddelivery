import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useSession } from '@/features/auth/AuthProvider';
import { Card, PageHeader, Input, PasswordInput, Select, Button } from '@/components/ui';
import { UnsavedChanges } from '@/components/ui/UnsavedChanges';
import { Alert, useToast } from '@/components/feedback';
import { normalizeError } from '@/lib/api/http';
import { adminApi } from './api';
import { useAdminIdentity, AdminFacts } from './ExistingPages';
import { createProfileSchema, type CreateProfileInput, type AccountRow } from './model';

export function AdminCreateProfile({ kind }: { kind: 'RESTAURANT' | 'DRIVER' }) {
  const { account, key } = useAdminIdentity(),
    session = useSession(),
    navigate = useNavigate(),
    toast = useToast(),
    cache = useQueryClient();
  const lock = useRef(false),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [notice, setNotice] = useState('');
  type Pending = { email: string; accountId: number; generation: number };
  const [completed, setCompleted] = useState<{ path: string; task: Pending } | null>(null);
  useEffect(() => {
    if (!completed) return;
    const state = session.getSnapshot();
    if (
      state.account?.accountId === completed.task.accountId &&
      state.generation === completed.task.generation
    )
      navigate(completed.path);
  }, [completed, navigate, session]);
  const [pending, setPending] = useState<Pending | null>(null),
    [found, setFound] = useState<AccountRow | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<CreateProfileInput>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      address: '',
      licensePlate: '',
      activity: 'true',
      password: '',
      confirmPassword: '',
    },
  });
  const current = (task: Pending) =>
    session.getSnapshot().account?.accountId === task.accountId &&
    session.getSnapshot().generation === task.generation;
  const module = kind === 'RESTAURANT' ? 'restaurants' : 'drivers';
  async function verify(task: Pending) {
    if (!current(task)) return;
    const result = await adminApi.accounts({ q: task.email.slice(0, 100), role: kind, size: 50 });
    if (!current(task)) return;
    const candidate = result.items.find(
      (value) => value.email === task.email && value.role === kind,
    );
    if (candidate) {
      await cache.invalidateQueries({ queryKey: key });
      if (!current(task)) return;
      setFound(candidate);
      setNotice(
        'Đã tìm thấy tài khoản cùng email và loại hồ sơ. Mở hồ sơ để đối chiếu dữ liệu hiện tại.',
      );
    } else
      setNotice(
        'Chưa xác minh được tài khoản trong kết quả đã đọc. Không gửi lại yêu cầu tạo; tiếp tục kiểm tra hoặc đối chiếu danh sách tài khoản.',
      );
  }
  async function submit(value: CreateProfileInput) {
    if (lock.current || pending) return;
    if (kind === 'DRIVER' && value.name.length > 100) {
      setError('name', { message: 'Tên tài xế tối đa 100 ký tự.' });
      setOpen(false);
      return;
    }
    const task = {
      email: value.email.toLowerCase(),
      accountId: account.accountId,
      generation: session.getSnapshot().generation,
    };
    if (!current(task)) return;
    lock.current = true;
    setBusy(true);
    setNotice('');
    try {
      const result = await adminApi.createProfile(kind, value);
      if (!current(task)) return;
      reset();
      setOpen(false);
      await cache.invalidateQueries({ queryKey: key });
      if (!current(task)) return;
      toast('Đã tạo tài khoản và hồ sơ.');
      setCompleted({
        path: `/admin/${module}/${kind === 'RESTAURANT' ? result.restaurantId : result.driverId}`,
        task,
      });
    } catch (error) {
      if (!current(task)) return;
      const fault = normalizeError(error);
      setOpen(false);
      if (fault.status === 0 || fault.status >= 500) {
        setPending(task);
        reset({ ...getValues(), password: '', confirmPassword: '' });
        setNotice(
          'Chưa xác định được kết quả tạo. Không tự gửi lại yêu cầu; đang kiểm tra email trên máy chủ.',
        );
        try {
          await verify(task);
        } catch {
          if (current(task))
            setNotice('Chưa đọc được kết quả. Yêu cầu tạo vẫn bị khóa; hãy kiểm tra lại máy chủ.');
        }
      } else
        setNotice(
          fault.status === 409
            ? 'Email đã có tài khoản. Hãy đối chiếu danh sách trước khi tạo hồ sơ khác.'
            : fault.message,
        );
    } finally {
      lock.current = false;
      if (current(task)) setBusy(false);
    }
  }
  async function recheck() {
    if (!pending || lock.current || !current(pending)) return;
    lock.current = true;
    setBusy(true);
    try {
      await verify(pending);
    } catch {
      if (current(pending))
        setNotice('Máy chủ chưa trả kết quả kiểm tra. Không gửi lại yêu cầu tạo.');
    } finally {
      lock.current = false;
      if (current(pending)) setBusy(false);
    }
  }
  return (
    <section className="admin-management">
      <Link className="text-link" to={`/admin/${module}`}>
        Về danh sách {kind === 'RESTAURANT' ? 'nhà hàng' : 'tài xế'}
      </Link>
      <PageHeader
        title={kind === 'RESTAURANT' ? 'Tạo nhà hàng' : 'Tạo tài xế'}
        description="Khởi tạo hồ sơ và tài khoản đăng nhập cùng nhau. Email phải duy nhất toàn hệ thống."
      />
      <Card>
        <UnsavedChanges dirty={isDirty && !busy && !pending && !completed} />
        {notice && <Alert>{notice}</Alert>}
        {pending && (
          <div className="admin-links">
            <Button variant="secondary" busy={busy} onClick={() => void recheck()}>
              Kiểm tra kết quả tạo
            </Button>
            <Link
              className="button button-secondary"
              to={`/admin/accounts?q=${encodeURIComponent(pending.email.slice(0, 100))}&role=${kind}`}
            >
              Đối chiếu tài khoản
            </Link>
            {found && (
              <Link
                className="button button-primary"
                to={`/admin/${module}/${kind === 'RESTAURANT' ? found.restaurantId : found.driverId}`}
              >
                Mở hồ sơ đã xác minh
              </Link>
            )}
          </div>
        )}
        <form
          className="admin-profile-form"
          noValidate
          onSubmit={handleSubmit(() => setOpen(true))}
        >
          <Input
            label="Tên hồ sơ mới"
            maxLength={kind === 'DRIVER' ? 100 : 150}
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Email đăng nhập mới"
            autoComplete="off"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Số điện thoại mới"
            {...register('phoneNumber')}
            error={errors.phoneNumber?.message}
          />
          <Input
            label="Địa chỉ hồ sơ mới"
            {...register('address')}
            error={errors.address?.message}
          />
          {kind === 'DRIVER' && (
            <Input
              label="Biển số xe mới"
              {...register('licensePlate')}
              error={errors.licensePlate?.message}
            />
          )}
          <Select label="Hoạt động ban đầu" {...register('activity')}>
            <option value="true">{kind === 'RESTAURANT' ? 'Mở cửa' : 'Nhận chuyến mới'}</option>
            <option value="false">
              {kind === 'RESTAURANT' ? 'Đóng cửa' : 'Ngừng nhận chuyến mới'}
            </option>
          </Select>
          <PasswordInput
            label="Mật khẩu tài khoản mới"
            autoComplete="new-password"
            hint="Ít nhất 12 ký tự, tối đa 72 byte UTF-8."
            {...register('password')}
            error={errors.password?.message}
          />
          <PasswordInput
            label="Xác nhận mật khẩu tài khoản mới"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <Button type="submit" disabled={busy || !!pending}>
            Kiểm tra và tạo hồ sơ
          </Button>
        </form>
      </Card>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>
              Xác nhận tạo {kind === 'RESTAURANT' ? 'nhà hàng' : 'tài xế'}
            </Dialog.Title>
            <Dialog.Description>
              Tài khoản mới được liên kết với hồ sơ này; phiên quản trị hiện tại được giữ nguyên.
            </Dialog.Description>
            <AdminFacts
              entries={[
                { label: 'Tên hồ sơ', value: getValues('name') },
                { label: 'Email đăng nhập', value: getValues('email') },
                { label: 'Loại hồ sơ', value: kind === 'RESTAURANT' ? 'Nhà hàng' : 'Tài xế' },
              ]}
            />
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={busy}>
                  Quay lại
                </Button>
              </Dialog.Close>
              <Button busy={busy} onClick={() => void handleSubmit(submit)()}>
                Xác nhận tạo hồ sơ
              </Button>
            </div>
            <Dialog.Close className="dialog-close icon-button" aria-label="Đóng xác nhận tạo hồ sơ">
              <X size={19} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
export function AdminCreateRestaurant() {
  return <AdminCreateProfile kind="RESTAURANT" />;
}
export function AdminCreateDriver() {
  return <AdminCreateProfile kind="DRIVER" />;
}
