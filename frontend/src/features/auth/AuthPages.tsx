import { FoodImage } from '@/components/ui/FoodImage';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ArrowLeft, ShieldCheck, Leaf } from 'lucide-react';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from './validation';
import { useSession } from './AuthProvider';
import { roleHome } from '@/types/domain';
import { customerReturnTo } from './returnTo';
import { Alert } from '@/components/feedback';
import { Button, Input, PasswordInput } from '@/components/ui';
import { normalizeError } from '@/lib/api/http';
import { useState, type ReactNode } from 'react';
function AuthFrame({ children, register = false }: { children: ReactNode; register?: boolean }) {
  return (
    <section className="auth-shell container">
      <div className="auth-story">
        <FoodImage alt="" className="auth-photo" priority sizes="(max-width:767px) 1px, 520px" />
        <span className="auth-photo-shade" aria-hidden="true" />
        <Link to="/restaurants" className="back-link">
          <ArrowLeft size={16} />
          Khám phá HanoiFood
        </Link>
        <span className="eyebrow">BỮA NGON, NGÀY VUI</span>
        <h1>
          Một tài khoản.
          <br />
          Nhiều điều <em>ngon.</em>
        </h1>
        <p>Giữ những hương vị yêu thích ở gần bạn hơn một chút.</p>
        <span className="auth-editorial-label">HƯƠNG VỊ VIỆT · ẢNH MINH HỌA</span>
        <div className="story-note">
          <Leaf size={20} />
          <span>Vị thân quen, trải nghiệm mới.</span>
        </div>
      </div>
      <div className="auth-form-panel">
        <span className="small-tag">
          <ShieldCheck size={15} />
          Không gian của bạn
        </span>
        <h2>{register ? 'Bắt đầu hành trình ngon' : 'Chào mừng bạn trở lại'}</h2>
        <p className="muted">
          {register
            ? 'Tạo tài khoản khách hàng và khám phá quán ngon.'
            : 'Đăng nhập để tiếp tục cùng HanoiFood.'}
        </p>
        {children}
      </div>
    </section>
  );
}
export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  return (
    <AuthFrame>
      {location.state?.registered && (
        <Alert tone="success">Tài khoản đã được tạo. Bạn có thể đăng nhập ngay.</Alert>
      )}
      {location.state?.passwordChanged && (
        <Alert tone="success">Đã đổi mật khẩu và đăng xuất mọi phiên. Hãy đăng nhập lại.</Alert>
      )}
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setFailure('');
          try {
            await session.login(values);
            const account = session.getSnapshot().account;
            if (account)
              navigate(
                account.role === 'CUSTOMER'
                  ? customerReturnTo(location.state?.from) || roleHome.CUSTOMER
                  : roleHome[account.role],
                { replace: true },
              );
          } catch (error) {
            const e = normalizeError(error);
            setFailure(
              e.status === 401
                ? 'Email hoặc mật khẩu chưa đúng, hoặc tài khoản đã bị khóa.'
                : e.message,
            );
          }
        })}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          maxLength={255}
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Mật khẩu"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {failure && <Alert>{failure}</Alert>}
        <Button type="submit" busy={isSubmitting} className="full-width">
          Đăng nhập <ArrowRight size={18} />
        </Button>
      </form>
      <p className="auth-alternate">
        Bạn mới đến HanoiFood? <Link to="/register">Tạo tài khoản</Link>
      </p>
      <p className="form-note">Tài khoản nhà hàng và tài xế được quản trị viên cấp.</p>
    </AuthFrame>
  );
}
export function RegisterPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  return (
    <AuthFrame register>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setFailure('');
          try {
            await session.register({
              name: values.name,
              email: values.email,
              password: values.password,
              phoneNumber: values.phoneNumber,
              address: values.address,
            });
            navigate('/login', { replace: true, state: { registered: true } });
          } catch (error) {
            const e = normalizeError(error);
            setFailure(
              e.status === 409
                ? 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.'
                : e.message,
            );
          }
        })}
      >
        <div className="form-row">
          <Input
            label="Họ và tên"
            autoComplete="name"
            maxLength={100}
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Số điện thoại"
            type="tel"
            autoComplete="tel"
            maxLength={15}
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          maxLength={255}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Địa chỉ"
          autoComplete="street-address"
          maxLength={255}
          error={errors.address?.message}
          {...register('address')}
        />
        <PasswordInput
          label="Mật khẩu"
          autoComplete="new-password"
          hint="Ít nhất 12 ký tự, tối đa 72 byte UTF-8."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Xác nhận mật khẩu"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {failure && <Alert>{failure}</Alert>}
        <Button type="submit" busy={isSubmitting} className="full-width">
          Tạo tài khoản khách hàng <ArrowRight size={18} />
        </Button>
      </form>
      <p className="auth-alternate">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </AuthFrame>
  );
}
