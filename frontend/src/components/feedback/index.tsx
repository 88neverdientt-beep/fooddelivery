import {
  Component,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Inbox, WifiOff, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, normalizeError } from '@/lib/api/http';
import { Button } from '@/components/ui';
export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
export function Skeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="restaurant-grid" role="status" aria-label="Đang tải nội dung">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-card" aria-hidden="true" key={i}>
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function Alert({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info';
}) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  title = 'Chưa có thông tin',
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel">
      <span className="state-icon">
        <Inbox size={29} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const normalized = normalizeError(error);
  return (
    <div className="state-panel" role="alert">
      <span className="state-icon">{normalized.status === 0 ? <WifiOff /> : <AlertCircle />}</span>
      <h2>{normalized.status === 404 ? 'Không tìm thấy thông tin' : 'Chưa thể tải nội dung'}</h2>
      <p>{normalized.message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* No exception payload or user data is logged. */
  }
  render() {
    return this.state.failed ? (
      <main className="container error-page">
        <ErrorState error={new ApiError(500, 'UI')} />
        <a className="button button-primary" href="/">
          Về trang chủ
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
type Notice = { id: number; text: string; tone: 'success' | 'error' };
const ToastContext = createContext<(text: string, tone?: Notice['tone']) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notice[]>([]);
  const counter = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const notify = (text: string, tone: Notice['tone'] = 'success') => {
    const id = ++counter.current;
    setItems((old) => [...old.slice(-2), { id, text, tone }]);
    timers.current.push(
      setTimeout(() => setItems((old) => old.filter((item) => item.id !== id)), 6000),
    );
  };
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`}>
            <CheckCircle2 size={19} />
            <span>{item.text}</span>
            <button
              className="icon-button"
              aria-label="Đóng thông báo"
              onClick={() => setItems((old) => old.filter((i) => i.id !== item.id))}
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
export function StatusPage({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <section className="container error-page">
      <p className="error-number">{forbidden ? '403' : '404'}</p>
      <h1>{forbidden ? 'Lối này dành cho vai trò khác' : 'Có vẻ bạn đã đi lạc một chút'}</h1>
      <p>
        {forbidden
          ? 'Tài khoản của bạn không có quyền truy cập trang này.'
          : 'Trang bạn tìm không tồn tại hoặc đường dẫn đã thay đổi.'}
      </p>
      <Link to="/" className="button button-primary">
        Về trang chủ
      </Link>
      <Link to="/account" className="text-link">
        Tài khoản của tôi
      </Link>
    </section>
  );
}
