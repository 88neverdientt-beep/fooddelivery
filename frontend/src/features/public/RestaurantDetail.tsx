import { lazy, Suspense, useEffect } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search, ShoppingBag, Utensils } from 'lucide-react';
import { Badge, Button, Input, Pagination, Select, Tabs } from '@/components/ui';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Alert, EmptyState, ErrorState, Skeleton, Spinner } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
import { publicApi, type MenuFilters } from './api';
import { pageFrom, validId } from './model';
import { FoodCard } from './FoodCard';
import './customer-menu.css';

const RestaurantRatings = lazy(() =>
  import('@/features/ratings/RatingPages').then((module) => ({
    default: function LoadedRestaurantRatings({ restaurantId }: { restaurantId: number }) {
      const location = useLocation();
      useEffect(() => {
        if (location.hash !== '#restaurant-ratings') return;
        document.getElementById('restaurant-ratings')?.scrollIntoView?.({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
          block: 'start',
        });
      }, [location.hash, restaurantId]);
      return <module.RestaurantRatings restaurantId={restaurantId} />;
    },
  })),
);
export function RestaurantDetailPage() {
  const { id = '' } = useParams();
  const [search, setSearch] = useSearchParams();
  const valid = validId(id);
  const selectedSort = search.get('sort');
  const sort: MenuFilters['sort'] =
    selectedSort === 'price-asc' || selectedSort === 'price-desc' ? selectedSort : 'name';
  const filters: MenuFilters = {
    q: (search.get('q') || '').trim().slice(0, 100),
    category: (search.get('category') || '').trim().slice(0, 150),
    available: search.get('available') === 'true' ? true : undefined,
    sort,
    page: pageFrom(search),
    size: 12,
  };
  const restaurant = useQuery({
    queryKey: ['public', 'restaurant', id],
    queryFn: ({ signal }) => publicApi.restaurant(id, signal),
    enabled: valid,
  });
  const menu = useQuery({
    queryKey: ['public', 'restaurant-menu', id, filters],
    queryFn: ({ signal }) => publicApi.menuPage(id, filters, signal),
    enabled: valid,
  });
  const categories = useQuery({
    queryKey: ['public', 'category-suggestions'],
    queryFn: ({ signal }) => publicApi.categories(signal),
    enabled: valid,
  });
  const changeFilters = (changes: Record<string, string>) => {
    const next = new URLSearchParams(search);
    if (!('page' in changes)) next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // In particular, preserve reviewOrder when a completed-order customer opens the form below.
    setSearch(next);
  };
  if (!valid)
    return (
      <section className="container section-space">
        <ErrorState error={new ApiError(404, '404')} />
      </section>
    );
  if (restaurant.isPending)
    return (
      <section className="container section-space">
        <Skeleton count={1} />
      </section>
    );
  if (restaurant.isError)
    return (
      <section className="container section-space">
        <ErrorState error={restaurant.error} onRetry={() => void restaurant.refetch()} />
      </section>
    );
  const current = restaurant.data;
  if (current.restaurantId !== Number(id))
    return (
      <section className="container section-space">
        <ErrorState error={new ApiError(404, '404')} />
      </section>
    );
  return (
    <section className="container section-space customer-restaurant-detail">
      <Breadcrumb items={[{ label: 'Nhà hàng', to: '/restaurants' }, { label: current.name }]} />
      <div className="restaurant-detail-header">
        <div className="restaurant-detail-icon">
          <Utensils size={50} />
        </div>
        <div>
          <Badge tone={current.restaurantStatus ? 'success' : 'neutral'}>
            {current.restaurantStatus ? 'Đang mở cửa' : 'Đang nghỉ'}
          </Badge>
          <h1>{current.name}</h1>
          <p>
            <MapPin size={16} />
            {current.address}
          </p>
        </div>
      </div>
      {!current.restaurantStatus && (
        <Alert tone="info">
          Nhà hàng hiện đang nghỉ. Bạn vẫn có thể xem thực đơn và quay lại đặt món khi nhà hàng mở
          cửa.
        </Alert>
      )}
      <div className="section-heading">
        <h2>Thực đơn của quán</h2>
        <Tabs
          label="Lọc thực đơn"
          value={filters.available ? 'available' : 'all'}
          onChange={(value) => changeFilters({ available: value === 'available' ? 'true' : '' })}
          items={[
            { value: 'all', label: 'Tất cả' },
            { value: 'available', label: 'Đang có bán' },
          ]}
        />
      </div>
      <form
        className="customer-menu-search"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          changeFilters({
            q: String(form.get('q') || '')
              .trim()
              .slice(0, 100),
            category: String(form.get('category') || '')
              .trim()
              .slice(0, 150),
          });
        }}
      >
        <Input
          key={'q:' + filters.q}
          name="q"
          label="Tìm món trong thực đơn"
          defaultValue={filters.q}
          maxLength={100}
          placeholder="Tên món bạn muốn tìm…"
        />
        <Input
          key={'category:' + filters.category}
          name="category"
          label="Danh mục món"
          defaultValue={filters.category}
          maxLength={150}
          list="menu-category-suggestions"
          placeholder="Tất cả danh mục"
          hint="Gợi ý từ API; có thể nhập tên nhóm khác."
        />
        <datalist id="menu-category-suggestions">
          {categories.data?.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <Button type="submit">
          <Search size={17} /> Tìm món
        </Button>
      </form>
      <div className="customer-menu-toolbar">
        <p className="muted">
          {menu.data ? `${menu.data.totalElements} món trong kết quả` : 'Đang tải thực đơn…'}
        </p>
        <Select
          label="Sắp xếp món"
          value={sort}
          onChange={(event) => changeFilters({ sort: event.target.value })}
        >
          <option value="name">Tên món A–Z</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </Select>
      </div>
      <div
        className="menu-panel"
        role="tabpanel"
        aria-label={filters.available ? 'Món đang có bán' : 'Tất cả món ăn'}
      >
        {menu.isPending ? (
          <Skeleton />
        ) : menu.isError ? (
          <ErrorState error={menu.error} onRetry={() => void menu.refetch()} />
        ) : menu.data.items.length === 0 ? (
          <EmptyState
            title="Chưa có món phù hợp"
            description={
              menu.data.totalElements > 0
                ? 'Trang này chưa có món. Hãy quay lại trang đầu của kết quả.'
                : 'Thử đổi từ khóa, danh mục hoặc bộ lọc món đang bán.'
            }
            action={
              <Button
                variant="secondary"
                onClick={() => changeFilters({ page: '', q: '', category: '', available: '' })}
              >
                Xem lại thực đơn
              </Button>
            }
          />
        ) : (
          <div className="customer-food-grid">
            {menu.data.items.map((item) => (
              <FoodCard key={item.restaurantFoodItemId} item={item} />
            ))}
          </div>
        )}
      </div>
      {menu.data && menu.data.items.length > 0 && (
        <Pagination
          page={(filters.page || 0) + 1}
          count={menu.data.totalPages}
          onChange={(page) => changeFilters({ page: String(page) })}
        />
      )}
      <div className="feature-note customer-menu-cart-note">
        <ShoppingBag size={20} />
        <p>Chọn một món để xem chi tiết và thêm vào giỏ. Mỗi giỏ chỉ nhận món từ một nhà hàng.</p>
        <Link to="/customer/cart" className="text-link">
          Xem giỏ hàng
        </Link>
      </div>
      <Suspense fallback={<Spinner label="Đang tải đánh giá…" />}>
        <RestaurantRatings restaurantId={current.restaurantId} />
      </Suspense>
    </section>
  );
}
