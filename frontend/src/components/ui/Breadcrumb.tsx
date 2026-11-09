import { Link } from 'react-router-dom';
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="breadcrumb" aria-label="Đường dẫn">
      {items.map((item, index) => (
        <span key={index}>
          {index > 0 && <span aria-hidden="true"> / </span>}
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
