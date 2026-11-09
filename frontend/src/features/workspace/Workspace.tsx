import { AccountMenu } from '@/components/layout/AccountMenu';
import { FoodImage } from '@/components/ui/FoodImage';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  UserRound,
  ShoppingBag,
  ClipboardList,
  Utensils,
  Truck,
  Users,
  Store,
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Bike,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { roleName, roleHome, type Role } from '@/types/domain';
import { Badge, Card, PageHeader } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
type Item = { to: string; label: string; icon: typeof UserRound };
export const workspaceNav: Record<Role, Item[]> = {
  CUSTOMER: [
    { to: '/customer', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/customer/profile', label: 'Hồ sơ của tôi', icon: UserRound },
    { to: '/customer/cart', label: 'Giỏ hàng', icon: ShoppingBag },
    { to: '/customer/orders', label: 'Đơn hàng', icon: ClipboardList },
    { to: '/customer/ratings', label: 'Đánh giá của tôi', icon: Star },
  ],
  RESTAURANT: [
    { to: '/restaurant/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/restaurant/profile', label: 'Hồ sơ nhà hàng', icon: Store },
    { to: '/restaurant/menu', label: 'Thực đơn', icon: Utensils },
    { to: '/restaurant/orders', label: 'Đơn của nhà hàng', icon: ClipboardList },
  ],
  DRIVER: [
    { to: '/driver/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/driver/profile', label: 'Hồ sơ tài xế', icon: UserRound },
    { to: '/driver/deliveries', label: 'Chuyến giao hàng', icon: Truck },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/admin/accounts', label: 'Tài khoản', icon: Users },
    { to: '/admin/restaurants', label: 'Nhà hàng', icon: Store },
    { to: '/admin/drivers', label: 'Tài xế', icon: Truck },
  ],
};
export function WorkspaceLayout() {
  const account = useAuth().account!;
  const role = account.role;
  const [open, setOpen] = useState(false);
  const links = (
    <nav aria-label={`Điều hướng ${roleName[role]}`}>
      {workspaceNav[role].map((item) => (
        <NavLink end key={item.to} to={item.to} onClick={() => setOpen(false)}>
          <item.icon size={19} />
          {item.label}
        </NavLink>
      ))}
      <div className="nav-divider" />
      <NavLink to="/account">
        <UserRound size={19} />
        Tài khoản
      </NavLink>
      <NavLink to="/account/change-password">
        <ShieldCheck size={19} />
        Bảo mật
      </NavLink>
    </nav>
  );
  return (
    <div className={`workspace workspace-${role.toLowerCase()}`}>
      <aside className="workspace-sidebar">
        <span className="workspace-overline">KHÔNG GIAN LÀM VIỆC</span>
        <div className="sidebar-identity">
          <span>
            <Utensils size={23} />
          </span>
          <div>
            <strong>{roleName[role]}</strong>
            <small>HanoiFood workspace</small>
          </div>
        </div>
        {links}
        <div className="sidebar-note">
          <Sparkles size={23} />
          <p>
            Mỗi vai trò,
            <br />
            cùng một bữa ngon.
          </p>
        </div>
      </aside>
      <div className="workspace-main">
        <div className="workspace-topbar">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              className="icon-button workspace-menu"
              aria-label="Mở điều hướng vai trò"
            >
              <Menu />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="mobile-sidebar">
                <Dialog.Title>{roleName[role]}</Dialog.Title>
                <Dialog.Description>Điều hướng không gian của bạn.</Dialog.Description>
                {links}
                <Dialog.Close
                  className="dialog-close icon-button"
                  aria-label="Đóng điều hướng vai trò"
                >
                  <X />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="workspace-context">
            <span>HanoiFood</span>
            <span>/</span>
            <strong>{roleName[role]}</strong>
          </div>
          <div className="workspace-topbar-actions">
            <Badge tone="success">
              <CheckCircle2 size={13} />
              Đang hoạt động
            </Badge>
            <AccountMenu />
          </div>
        </div>
        {role === 'DRIVER' && (
          <nav className="driver-bottom-nav" aria-label="Điều hướng nhanh tài xế">
            {workspaceNav.DRIVER.map((item) => (
              <NavLink end key={item.to} to={item.to}>
                <item.icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
        <div className="workspace-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
const dashboardCopy: Record<
  Role,
  {
    eyebrow: string;
    title: string;
    text: string;
    icon: typeof UserRound;
    link: string;
    cta: string;
  }
> = {
  CUSTOMER: {
    eyebrow: 'MỘT CHÚT HÀ NỘI, NGON TRỌN HÔM NAY',
    title: 'Bữa ngon tiếp theo, theo cách bạn thích.',
    text: 'Quán quen hay hương vị mới? Khám phá thực đơn và tìm cảm hứng cho bữa ăn hôm nay.',
    icon: Utensils,
    link: '/restaurants',
    cta: 'Khám phá nhà hàng',
  },
  RESTAURANT: {
    eyebrow: 'KHÔNG GIAN DÀNH CHO NHÀ HÀNG',
    title: 'Chăm chút từng món, trọn vẹn từng trải nghiệm.',
    text: 'Một nơi để quản lý thông tin nhà hàng, chuẩn bị thực đơn và sẵn sàng cho những đơn hàng tiếp theo.',
    icon: Store,
    link: '/restaurant/profile',
    cta: 'Xem hồ sơ nhà hàng',
  },
  DRIVER: {
    eyebrow: 'HÀNH TRÌNH CÙNG HANOIFOOD',
    title: 'Sẵn sàng cho những hành trình ngon.',
    text: 'Giữ thông tin cá nhân luôn chính xác và làm quen với không gian giao hàng dành cho bạn.',
    icon: Bike,
    link: '/driver/profile',
    cta: 'Xem hồ sơ tài xế',
  },
  ADMIN: {
    eyebrow: 'KHÔNG GIAN QUẢN TRỊ',
    title: 'Kết nối mọi vai trò, vận hành thật chỉn chu.',
    text: 'Truy cập các khu vực quản lý tài khoản, nhà hàng và tài xế từ một không gian nhất quán.',
    icon: ShieldCheck,
    link: '/account',
    cta: 'Xem tài khoản quản trị',
  },
};
export function DashboardPage() {
  const account = useAuth().account!;
  const role = account.role;
  const copy = dashboardCopy[role];
  const profile = workspaceNav[role].find((item) => item.to.includes('profile'));
  const phase = role === 'CUSTOMER' ? 4 : role === 'RESTAURANT' ? 5 : role === 'DRIVER' ? 6 : 7;
  return (
    <>
      <PageHeader
        eyebrow="HANOIFOOD · KHÔNG GIAN CỦA BẠN"
        title={
          role === 'CUSTOMER'
            ? 'Hôm nay, mình ăn gì nhỉ?'
            : `Chào mừng ${roleName[role].toLowerCase()}`
        }
        description={account.email}
      />
      <div className="workspace-welcome">
        <div>
          <span className="welcome-eyebrow">
            <copy.icon size={17} />
            {copy.eyebrow}
          </span>
          <h2>{copy.title}</h2>
          <p>{copy.text}</p>
          <Link to={copy.link} className="button button-primary">
            {copy.cta}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        {role === 'CUSTOMER' ? (
          <FoodImage kind="rice" alt="" className="welcome-food" sizes="300px" />
        ) : (
          <div className="workspace-role-art" aria-hidden="true">
            <span />
            <copy.icon size={78} strokeWidth={1.1} />
            <i />
            <b />
          </div>
        )}
      </div>
      <div className="workspace-section-heading">
        <h2>Điều bạn muốn làm hôm nay</h2>
        <span>Không gian {roleName[role].toLowerCase()}</span>
      </div>
      <div className="workspace-cards">
        <Link to={profile?.to || '/account'}>
          <Card>
            <span className="quick-action-icon">
              <UserRound size={23} />
            </span>
            <h3>Thông tin của bạn</h3>
            <p>Xem hồ sơ và thông tin đăng nhập của tài khoản.</p>
            <span className="text-link">
              Mở hồ sơ <ArrowRight size={16} />
            </span>
          </Card>
        </Link>
        <Link to="/account/change-password">
          <Card>
            <span className="quick-action-icon quick-action-security">
              <ShieldCheck size={23} />
            </span>
            <h3>An tâm sử dụng</h3>
            <p>Đổi mật khẩu và quản lý các phiên đăng nhập.</p>
            <span className="text-link">
              Tới bảo mật <ArrowRight size={16} />
            </span>
          </Card>
        </Link>
      </div>
      <div className="workspace-shortcuts">
        {workspaceNav[role]
          .filter(
            (item) =>
              !item.to.includes('profile') &&
              !item.to.endsWith('dashboard') &&
              item.to !== '/customer',
          )
          .map((item) => (
            <Link key={item.to} to={item.to}>
              <span>
                <item.icon size={21} />
              </span>
              <div>
                <strong>{item.label}</strong>
                <small>Khám phá khu vực chức năng</small>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
      </div>
      <div className="feature-note">
        <Sparkles size={20} />
        <p>
          {role === 'CUSTOMER'
            ? 'Chọn món từ nhà hàng, kiểm tra giỏ hàng, đặt COD và theo dõi đơn ngay trong tài khoản của bạn.'
            : `Các màn hình nghiệp vụ chuyên sâu sẽ được hoàn thiện ở Giai đoạn ${phase}. Hiện bạn có thể quản lý tài khoản và khám phá các khu vực trong không gian của mình.`}
        </p>
      </div>
    </>
  );
}
const futureContent: Record<string, { title: string; description: string; phase: number }> = {
  '/customer/cart': {
    title: 'Giỏ hàng',
    description: 'Chọn món, cập nhật số lượng và checkout sẽ được bổ sung trong luồng đặt hàng.',
    phase: 4,
  },
  '/customer/orders': {
    title: 'Đơn hàng của bạn',
    description: 'Danh sách đơn và theo dõi trạng thái sẽ được tích hợp cùng luồng đặt hàng.',
    phase: 4,
  },
  '/restaurant/menu': {
    title: 'Quản lý thực đơn',
    description:
      'Tạo và cập nhật món ăn của nhà hàng sẽ được triển khai trong không gian quản lý nhà hàng.',
    phase: 5,
  },
  '/restaurant/orders': {
    title: 'Đơn của nhà hàng',
    description: 'Tiếp nhận và chuẩn bị đơn sẽ được tích hợp trong giai đoạn dành cho nhà hàng.',
    phase: 5,
  },
  '/driver/deliveries': {
    title: 'Chuyến giao hàng',
    description:
      'Nhận chuyến, cập nhật giao hàng và COD sẽ được tích hợp trong giai đoạn dành cho tài xế.',
    phase: 6,
  },
  '/admin/accounts': {
    title: 'Quản lý tài khoản',
    description:
      'Danh sách, tạo và quản lý trạng thái tài khoản sẽ được bổ sung trong luồng quản trị.',
    phase: 7,
  },
  '/admin/restaurants': {
    title: 'Quản lý nhà hàng',
    description: 'Tạo tài khoản và quản lý nhà hàng sẽ được tích hợp trong giai đoạn quản trị.',
    phase: 7,
  },
  '/admin/drivers': {
    title: 'Quản lý tài xế',
    description: 'Tạo tài khoản và quản lý tài xế sẽ được tích hợp trong giai đoạn quản trị.',
    phase: 7,
  },
};
export function FutureFeaturePage() {
  const location = useLocation();
  const role = useAuth().account!.role;
  const content = futureContent[location.pathname];
  if (!content) throw new Error('Missing future route');
  return (
    <>
      <PageHeader
        title={content.title}
        description="Không gian đã sẵn sàng, chức năng đang được chuẩn bị."
      />
      <Card className="future-feature-card">
        <span className="feature-coming-label">
          <Sparkles size={15} />
          ĐANG ĐƯỢC CHUẨN BỊ
        </span>
        <EmptyState
          title={`Sẽ hoàn thiện ở Giai đoạn ${content.phase}`}
          description={content.description}
          action={
            <Link className="button button-secondary" to={roleHome[role]}>
              Về tổng quan <ArrowRight size={17} />
            </Link>
          }
        />
      </Card>
    </>
  );
}
