import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CustomerProfile } from '@/features/customer/CustomerProfile';
import { customerApi } from '@/features/customer/api';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, LogOut, UserRound, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { changePasswordSchema, type ChangePasswordInput } from '@/features/auth/validation';
import { api } from '@/lib/runtime';
import { normalizeError, ApiError } from '@/lib/api/http';
import { accountSchema, profileSchema, roleName, type Account } from '@/types/domain';
import { Avatar, Badge, Button, Card, PageHeader, PasswordInput } from '@/components/ui';
import { Alert, ErrorState, Spinner, useToast } from '@/components/feedback';
function AccountNavigation() {
  return (
    <nav className="account-tabs" aria-label="Tài khoản">
      <NavLink end to="/account">
        <UserRound size={17} />
        Thông tin tài khoản
      </NavLink>
      <NavLink to="/account/change-password">
        <ShieldCheck size={17} />
        Bảo mật
      </NavLink>
    </nav>
  );
}
export function AccountPage() {
  const auth = useAuth();
  const session = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const account = auth.account!;
  const me = useQuery({
    queryKey: ['account', account.accountId, 'me'],
    queryFn: async ({ signal }) => {
      const value = accountSchema.safeParse(await api.get<Account>('/auth/me', signal));
      if (!value.success) throw new ApiError(502, 'CONTRACT');
      return value.data;
    },
  });
  const profilePath =
    account.role === 'CUSTOMER'
      ? `/customers/${account.customerId}`
      : account.role === 'RESTAURANT'
        ? `/restaurants/${account.restaurantId}`
        : account.role === 'DRIVER'
          ? `/drivers/${account.driverId}`
          : null;
  const profile = useQuery({
    queryKey: ['account', account.accountId, 'profile'],
    queryFn: async ({ signal }) =>
      account.role === 'CUSTOMER'
        ? customerApi.read(signal)
        : profileSchema.parse(await api.get(profilePath!, signal)),
    enabled: !!profilePath,
  });
  const logoutAll = async () => {
    setBusy(true);
    try {
      await session.logout(true);
      navigate('/login', { replace: true });
      toast('Đã đăng xuất khỏi mọi thiết bị.');
    } catch (error) {
      toast(normalizeError(error).message, 'error');
      throw error;
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container account-page">
      <PageHeader
        eyebrow="KHÔNG GIAN CỦA BẠN"
        title="Thông tin tài khoản"
        description="Mọi điều cơ bản để giữ kết nối với HanoiFood."
      />
      <AccountNavigation />
      {me.isPending ? (
        <Spinner />
      ) : me.isError ? (
        <ErrorState
          error={me.error}
          onRetry={() => {
            void me.refetch();
          }}
        />
      ) : (
        <div className="account-grid">
          <Card className="identity-card">
            <div className="profile-cover" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="profile-summary">
              <Avatar name={profile.data?.name || account.email} />
              <div>
                <h2>{profile.data?.name || 'Tài khoản HanoiFood'}</h2>
                <Badge tone="success">Đang hoạt động</Badge>
              </div>
            </div>
            <dl className="profile-details">
              <div>
                <dt>
                  <Mail size={18} />
                  Email đăng nhập
                </dt>
                <dd>{me.data.email}</dd>
              </div>
              <div>
                <dt>
                  <UserRound size={18} />
                  Vai trò
                </dt>
                <dd>{roleName[me.data.role]}</dd>
              </div>
              {profile.data?.phoneNumber && (
                <div>
                  <dt>
                    <Phone size={18} />
                    Số điện thoại
                  </dt>
                  <dd>{profile.data.phoneNumber}</dd>
                </div>
              )}
              {profile.data?.address && (
                <div>
                  <dt>
                    <MapPin size={18} />
                    Địa chỉ
                  </dt>
                  <dd>{profile.data.address}</dd>
                </div>
              )}
            </dl>
            {profile.isFetching && <Spinner label="Đang tải hồ sơ…" />}
            {profile.isError && (
              <ErrorState
                error={profile.error}
                onRetry={() => {
                  void profile.refetch();
                }}
              />
            )}
            {account.role === 'CUSTOMER' && profile.data && (
              <CustomerProfile profile={profile.data} />
            )}
          </Card>
          <div className="account-security">
            <Card>
              <span className="security-symbol">
                <ShieldCheck size={27} />
              </span>
              <h2>Bảo vệ tài khoản</h2>
              <p>Đổi mật khẩu định kỳ và đăng xuất khỏi thiết bị bạn không còn sử dụng.</p>
              <Link className="button button-secondary" to="/account/change-password">
                Đổi mật khẩu
              </Link>
            </Card>
            <Card>
              <LogOut size={23} />
              <h2>Đăng xuất mọi thiết bị</h2>
              <p>Thao tác này cũng đăng xuất bạn trên thiết bị hiện tại.</p>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" className="danger-text">
                    Đăng xuất tất cả
                  </Button>
                }
                title="Đăng xuất khỏi mọi thiết bị?"
                description="Bạn cần đăng nhập lại trên tất cả thiết bị sau khi xác nhận."
                confirm="Đăng xuất tất cả"
                onConfirm={logoutAll}
                busy={busy}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
export function ChangePasswordPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  return (
    <div className="container account-page">
      <PageHeader
        eyebrow="AN TÂM SỬ DỤNG"
        title="Đổi mật khẩu"
        description="Một thay đổi nhỏ, thêm một lớp an tâm."
      />
      <AccountNavigation />
      <Card className="password-card">
        <h2>Mật khẩu mới cho tài khoản</h2>
        <p className="muted">Sau khi đổi mật khẩu, bạn sẽ được đăng xuất khỏi mọi thiết bị.</p>
        <form
          noValidate
          onSubmit={handleSubmit(async (values) => {
            setFailure('');
            try {
              await session.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
              });
              navigate('/login', { replace: true, state: { passwordChanged: true } });
            } catch (error) {
              const e = normalizeError(error);
              setFailure(
                e.status === 401
                  ? 'Mật khẩu hiện tại chưa đúng hoặc phiên đã hết hạn. Vui lòng kiểm tra lại.'
                  : e.message,
              );
            }
          })}
        >
          <PasswordInput
            label="Mật khẩu hiện tại"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <PasswordInput
            label="Mật khẩu mới"
            autoComplete="new-password"
            hint="Ít nhất 12 ký tự, tối đa 72 byte UTF-8. Giữ nguyên dấu cách và chữ hoa/chữ thường."
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordInput
            label="Xác nhận mật khẩu mới"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {failure && <Alert>{failure}</Alert>}
          <Button type="submit" busy={isSubmitting}>
            Lưu mật khẩu mới
          </Button>
        </form>
      </Card>
    </div>
  );
}
