import { useState } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { roleHome, roleName } from '@/types/domain';
import { Avatar } from '@/components/ui';
import { useToast } from '@/components/feedback';
import { normalizeError } from '@/lib/api/http';
export function AccountMenu() {
  const { account } = useAuth();
  const session = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!account) return null;
  const logout = async () => {
    setBusy(true);
    try {
      await session.logout();
      navigate('/login', { replace: true });
      toast('Bạn đã đăng xuất an toàn.');
    } catch (error) {
      toast('Chưa đăng xuất: ' + normalizeError(error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="account-trigger" aria-label="Menu tài khoản">
        <Avatar name={account.email} />
        <span className="account-role">{roleName[account.role]}</span>
        <ChevronDown size={16} />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="dropdown-content" align="end" sideOffset={12}>
          <Dropdown.Label className="dropdown-label">
            <strong>{roleName[account.role]}</strong>
            <span>{account.email}</span>
          </Dropdown.Label>
          <Dropdown.Separator />
          <Dropdown.Item asChild>
            <Link to={roleHome[account.role]}>
              <LayoutDashboard size={17} />
              Không gian của tôi
            </Link>
          </Dropdown.Item>
          <Dropdown.Item asChild>
            <Link to="/account">
              <User size={17} />
              Thông tin tài khoản
            </Link>
          </Dropdown.Item>
          <Dropdown.Item asChild>
            <Link to="/account/change-password">
              <ShieldCheck size={17} />
              Đổi mật khẩu
            </Link>
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            disabled={busy}
            onSelect={() => {
              void logout();
            }}
          >
            <LogOut size={17} />
            {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
