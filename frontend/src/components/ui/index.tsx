import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
export function Button({
  variant = 'primary',
  className = '',
  busy,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
export function Input({
  label,
  error,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const generated = useId();
  const field = id || generated;
  return (
    <div className="field">
      <label htmlFor={field}>{label}</label>
      <input
        id={field}
        aria-invalid={!!error}
        aria-describedby={error ? field + '-error' : hint ? field + '-hint' : undefined}
        {...props}
      />
      {hint && !error && <small id={field + '-hint'}>{hint}</small>}
      {error && (
        <small className="field-error" id={field + '-error'}>
          {error}
        </small>
      )}
    </div>
  );
}
export function PasswordInput({
  label,
  error,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const generated = useId();
  const field = id || generated;
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={field}>{label}</label>
      <div className="password-wrap">
        <input
          id={field}
          type={visible ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error ? field + '-error' : hint ? field + '-hint' : undefined}
          {...props}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={visible ? 'Ẩn ' + label.toLowerCase() : 'Hiện ' + label.toLowerCase()}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {hint && !error && <small id={field + '-hint'}>{hint}</small>}
      {error && (
        <small className="field-error" id={field + '-error'}>
          {error}
        </small>
      )}
    </div>
  );
}
export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>
        {children}
      </select>
    </div>
  );
}
export function Checkbox({ children, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...props} />
      <span>{children}</span>
    </label>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Pagination({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (page: number) => void;
}) {
  return count > 1 ? (
    <nav className="pagination" aria-label="Phân trang">
      <Button
        variant="secondary"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft size={18} />
      </Button>
      <span>
        Trang {page} / {count}
      </span>
      <Button
        variant="secondary"
        disabled={page === count}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight size={18} />
      </Button>
    </nav>
  ) : null;
}
export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="tabs">
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (direction || event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? items.length - 1
                    : (index + direction + items.length) % items.length;
              onChange(items[next].value);
              (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
            }
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
