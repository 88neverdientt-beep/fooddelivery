import { lazy, Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  Menu,
  X,
  UtensilsCrossed,
  MapPin,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
const AccountMenu = lazy(() =>
  import('./AccountMenu').then((module) => ({ default: module.AccountMenu })),
);
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="HanoiFood — Trang chủ">
      <span className="brand-icon">
        <UtensilsCrossed size={23} />
      </span>
      <span className="brand-wordmark">
        hanoi<span className="brand-food">food</span>
        <span className="brand-dot">.</span>
        <small>FOOD DELIVERY · HÀ NỘI</small>
      </span>
    </Link>
  );
}
export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const auth = useAuth();
  const workspace = /^\/(customer|restaurant|driver|admin)(?:\/|$)/.test(location.pathname);
  const navigation = (
    <>
      <NavLink to="/" end>
        Trang chủ
      </NavLink>
      <NavLink to="/restaurants">Khám phá nhà hàng</NavLink>
      <a href="/#how-it-works">Cách đặt món</a>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header
        className="site-header"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            setOpen(false);
            (
              event.currentTarget.querySelector('.mobile-menu-button') as HTMLButtonElement | null
            )?.focus();
          }
        }}
      >
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {navigation}
          </nav>
          <div className="header-actions">
            {auth.account?.role === 'CUSTOMER' && !workspace && (
              <Link to="/customer/cart" className="icon-button header-cart" aria-label="Giỏ hàng">
                <ShoppingBag size={21} />
              </Link>
            )}
            {auth.status === 'authenticated' ? (
              workspace ? (
                <Link to="/restaurants" className="header-explore">
                  Khám phá <ArrowUpRight size={17} />
                </Link>
              ) : (
                <Suspense
                  fallback={
                    <span className="account-placeholder" role="status">
                      Đang mở tài khoản…
                    </span>
                  }
                >
                  <AccountMenu />
                </Suspense>
              )
            ) : (
              <>
                <Link className="header-signup" to="/register">
                  Đăng ký
                </Link>
                <Link className="button button-primary button-small" to="/login">
                  Đăng nhập <ArrowUpRight size={16} />
                </Link>
              </>
            )}
            <button
              className="icon-button mobile-menu-button"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? 'Đóng điều hướng' : 'Mở điều hướng'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            className="mobile-navigation"
            aria-label="Điều hướng di động"
            key={location.pathname}
            onClick={() => setOpen(false)}
          >
            {navigation}
            {auth.status !== 'authenticated' && (
              <Link to="/register" className="mobile-signup">
                Tạo tài khoản khách hàng <ArrowRight size={18} />
              </Link>
            )}
          </nav>
        )}
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Brand />
            <p>
              Vị ngon quen thuộc, trải nghiệm mới.
              <br />
              Kết nối bạn với những bữa ăn đáng mong chờ.
            </p>
            <span className="footer-signature">Một chút Hà Nội. Một ngày thật vui.</span>
          </div>
          <div>
            <h2>Khám phá</h2>
            <Link to="/restaurants">Nhà hàng & thực đơn</Link>
            <a href="/#how-it-works">Cách đặt món</a>
            <Link to="/">Trang chủ</Link>
          </div>
          <div>
            <h2>Không gian của bạn</h2>
            <Link to="/register">Tạo tài khoản khách hàng</Link>
            <Link to="/account">Thông tin tài khoản</Link>
            <Link to="/account/change-password">Bảo mật tài khoản</Link>
          </div>
          <div className="footer-note">
            <span>
              <MapPin size={22} />
            </span>
            <div>
              <strong>Hương vị gần gũi</strong>
              <p>
                Khám phá những quán ăn
                <br />
                và hương vị trên HanoiFood.
              </p>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} HanoiFood. Ngon trọn hôm nay.</span>
          <span>Được làm bằng sự chỉn chu, phục vụ bằng sự tận tâm.</span>
        </div>
      </footer>
    </>
  );
}
