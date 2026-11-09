import { FoodImage } from '@/components/ui/FoodImage';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  Utensils,
  ShoppingBag,
  Bike,
  Leaf,
  SlidersHorizontal,
  Soup,
  CookingPot,
  CupSoda,
  Sandwich,
  Salad,
  IceCreamBowl,
  ChefHat,
} from 'lucide-react';
import { publicApi } from './api';
import { restaurantFilters } from './model';
import type { Restaurant } from '@/types/domain';
import { Badge, Button, PageHeader, Pagination, Select } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
export function RestaurantCard({
  restaurant,
  index = 0,
}: {
  restaurant: Restaurant;
  index?: number;
}) {
  return (
    <Link to={`/restaurants/${restaurant.restaurantId}`} className="restaurant-card">
      <div className="restaurant-art">
        <FoodImage
          kind={index % 2 === 0 ? 'pho' : 'rice'}
          alt=""
          sizes="(max-width:600px) calc(100vw - 32px), (max-width:1000px) 45vw, 380px"
        />
        <span className="restaurant-monogram" aria-hidden="true">
          {restaurant.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="photo-caption">Ảnh minh họa</span>
      </div>
      <div className="restaurant-card-body">
        <div className="card-topline">
          <Badge tone={restaurant.restaurantStatus ? 'success' : 'neutral'}>
            {restaurant.restaurantStatus ? 'Đang mở cửa' : 'Đang nghỉ'}
          </Badge>
          <span className="card-arrow" aria-hidden="true">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <h3>{restaurant.name}</h3>
        <p>
          <MapPin size={15} />
          {restaurant.address}
        </p>
        <span className="card-menu-link">
          Xem thực đơn <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
export function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const restaurants = useQuery({
    queryKey: ['public', 'restaurants'],
    queryFn: ({ signal }) => publicApi.restaurants(signal),
  });
  const categories = useQuery({
    queryKey: ['public', 'food-categories'],
    queryFn: ({ signal }) => publicApi.categories(signal),
  });
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span />
              TỪ GÓC PHỐ ĐẾN BỮA ĂN CỦA BẠN
            </div>
            <h1>
              Một chút Hà Nội,
              <br />
              ngon trọn <em>hôm nay.</em>
            </h1>
            <p>
              Quán quen góc phố hay hương vị mới lạ?
              <br className="desktop-break" /> Bữa ngon tiếp theo đang chờ bạn khám phá.
            </p>
            <form
              className="hero-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate('/restaurants' + (search ? '?q=' + encodeURIComponent(search) : ''));
              }}
            >
              <MapPin size={20} />
              <input
                aria-label="Tìm nhà hàng theo tên hoặc địa chỉ"
                placeholder="Bạn muốn ăn ở đâu hôm nay?"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button type="submit" aria-label="Khám phá nhà hàng">
                <Search size={20} />
                <span>Khám phá</span>
              </Button>
            </form>
            <div className="hero-detail">
              <span>
                <Leaf size={16} />
                Hương vị gần gũi
              </span>
              <span className="dot-separator" />
              <span>Nhà hàng trên HanoiFood</span>
            </div>
          </div>
          <div className="hero-visual">
            <span className="hero-orbit orbit-one" />
            <span className="hero-orbit orbit-two" />
            <div className="hero-photo-frame">
              <FoodImage alt="Phở bò và nem rán — ảnh món ăn minh họa" priority />
              <span className="hero-photo-label">HƯƠNG VỊ VIỆT · ẢNH MINH HỌA</span>
            </div>
            <div className="hero-cuisine-tag">
              <ChefHat size={19} />
              <span>Mỗi bữa ăn, một niềm vui</span>
            </div>
            <div className="taste-note">
              <span className="taste-icon">
                <Utensils size={23} />
              </span>
              <div>
                <strong>Thương một vị quen</strong>
                <span>Bắt đầu từ những điều giản dị</span>
              </div>
              <span className="taste-note-dot" />
            </div>
          </div>
        </div>
      </section>
      <section className="values-strip">
        <div className="container values-inner">
          <span>
            <Utensils />
            Hương vị đa dạng
          </span>
          <span>
            <MapPin />
            Khám phá quán ngon
          </span>
          <span>
            <ShoppingBag />
            Bữa ăn theo cách bạn thích
          </span>
        </div>
      </section>
      <section className="container category-section">
        <div className="category-heading">
          <div>
            <p className="eyebrow">MỖI HƯƠNG VỊ, MỘT CÂU CHUYỆN</p>
            <h2>Khám phá thêm một vị ngon</h2>
            <p className="muted">Những phân nhóm món ăn trong danh mục công khai.</p>
          </div>
          <Link className="text-link" to="/restaurants">
            Ghé thăm nhà hàng <ArrowRight size={18} />
          </Link>
        </div>
        <ul className="category-inspiration" aria-label="Gợi ý hương vị">
          {[
            { title: 'Cơm', icon: CookingPot, tone: 'rice' },
            { title: 'Bún / Phở', icon: Soup, tone: 'noodle' },
            { title: 'Đồ uống', icon: CupSoda, tone: 'drink' },
            { title: 'Đồ ăn nhanh', icon: Sandwich, tone: 'fast' },
            { title: 'Món Việt', icon: Salad, tone: 'green' },
            { title: 'Tráng miệng', icon: IceCreamBowl, tone: 'sweet' },
          ].map((item) => (
            <li key={item.title} className={`category-guide category-${item.tone}`}>
              <span>
                <item.icon size={30} strokeWidth={1.6} />
              </span>
              <strong>{item.title}</strong>
            </li>
          ))}
        </ul>
        <p className="category-disclaimer">
          Gợi ý ẩm thực mang tính giới thiệu, không phải bộ lọc tìm kiếm.
        </p>
        <div className="live-category-heading">
          <span />
          Nhóm món trong danh mục công khai
        </div>
        {categories.isPending ? (
          <div className="category-loading" role="status" aria-label="Đang tải danh mục món ăn">
            <span />
            <span />
            <span />
          </div>
        ) : categories.isError ? (
          <ErrorState
            error={categories.error}
            onRetry={() => {
              void categories.refetch();
            }}
          />
        ) : categories.data.length ? (
          <ul className="category-list" aria-label="Danh mục món ăn">
            {categories.data.slice(0, 12).map((category) => (
              <li key={category}>
                <Utensils size={18} />
                {category}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted category-empty">
            Danh mục món ăn đang được bổ sung. Bạn vẫn có thể khám phá thực đơn của từng nhà hàng.
          </p>
        )}
      </section>
      <section className="container section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ĐI MỘT VÒNG, GẶP MỘT VỊ NGON</p>
            <h2>Hôm nay, ghé quán nào?</h2>
            <p>Những nhà hàng hiện có trên HanoiFood.</p>
          </div>
          <Link className="text-link" to="/restaurants">
            Xem tất cả <ArrowRight size={18} />
          </Link>
        </div>
        {restaurants.isPending ? (
          <Skeleton />
        ) : restaurants.isError ? (
          <ErrorState
            error={restaurants.error}
            onRetry={() => {
              void restaurants.refetch();
            }}
          />
        ) : restaurants.data.length ? (
          <div className="restaurant-grid">
            {restaurants.data.slice(0, 3).map((r, i) => (
              <RestaurantCard key={r.restaurantId} restaurant={r} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Quán ngon đang được chuẩn bị"
            description="Chưa có nhà hàng công khai. Hãy quay lại sau để khám phá."
          />
        )}
      </section>
      <section id="how-it-works" className="how-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ĐƠN GIẢN THÔI, NGON LÀ ĐƯỢC</p>
              <h2>Từ một ý thích đến một bữa ngon</h2>
            </div>
            <span className="handwritten">Ăn ngon mỗi ngày ↗</span>
          </div>
          <div className="steps-grid">
            {[
              {
                icon: MapPin,
                title: 'Chọn nhà hàng',
                text: 'Khám phá nhà hàng và thực đơn công khai để tìm hương vị bạn thích.',
              },
              {
                icon: ShoppingBag,
                title: 'Chọn món ăn',
                text: 'Chọn số lượng, xem giỏ hàng và kiểm tra tổng tiền từ nhà hàng.',
              },
              {
                icon: Bike,
                title: 'Đặt hàng và nhận món',
                text: 'Xác nhận địa chỉ, chọn COD và theo dõi trạng thái đơn trong tài khoản.',
              },
            ].map((step, i) => (
              <div className="step" key={step.title}>
                <span className="step-index" aria-hidden="true">
                  0{i + 1}
                </span>
                <span className="step-icon">
                  <step.icon size={27} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container section-space">
        <div className="join-banner">
          <div>
            <span className="eyebrow">HẸN BẠN Ở MỘT BỮA NGON</span>
            <h2>
              Thêm vị ngon.
              <br />
              Thêm niềm vui.
            </h2>
            <p>Tạo tài khoản để sẵn sàng cho hành trình cùng HanoiFood.</p>
          </div>
          <Link className="button button-cream" to="/register">
            Bắt đầu cùng HanoiFood <ArrowUpRight size={19} />
          </Link>
          <span className="banner-decoration" aria-hidden="true">
            ✳
          </span>
        </div>
      </section>
    </>
  );
}
function RestaurantSearch({
  query,
  onSearch,
}: {
  query: string;
  onSearch: (query: string) => void;
}) {
  const [draft, setDraft] = useState(query);
  return (
    <form
      className="restaurant-search-form"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
    >
      <div className="search-field">
        <Search size={19} />
        <input
          type="search"
          aria-label="Lọc nhà hàng theo tên hoặc địa chỉ"
          placeholder="Tìm theo tên quán, địa chỉ…"
          maxLength={100}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      <Button type="submit">Tìm nhà hàng</Button>
    </form>
  );
}
export function RestaurantListPage() {
  const [params, setParams] = useSearchParams();
  const filters = restaurantFilters(params);
  const result = useQuery({
    queryKey: ['public', 'restaurant-page', filters],
    queryFn: ({ signal }) => publicApi.restaurantPage(filters, signal),
  });
  const update = (key: string, value: string) => {
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };
  return (
    <section className="container section-space">
      <PageHeader
        eyebrow="TÌM HƯƠNG VỊ CỦA BẠN"
        title="Một thành phố, nhiều vị ngon"
        description="Khám phá nhà hàng, chọn món và đặt bữa ăn của bạn."
      />
      <div className="discovery-toolbar customer-discovery-toolbar">
        <RestaurantSearch
          key={filters.q}
          query={filters.q}
          onSearch={(query) => update('q', query)}
        />
        <Select
          label="Trạng thái nhà hàng"
          value={params.get('status') || 'all'}
          onChange={(event) => update('status', event.target.value)}
        >
          <option value="all">Tất cả nhà hàng</option>
          <option value="open">Đang mở cửa</option>
          <option value="closed">Đang nghỉ</option>
        </Select>
        <Select
          label="Sắp xếp nhà hàng"
          value={filters.sort}
          onChange={(event) => update('sort', event.target.value)}
        >
          <option value="name">Tên A–Z</option>
          <option value="name-desc">Tên Z–A</option>
        </Select>
      </div>
      <p className="filter-note">
        <SlidersHorizontal size={14} /> Tìm kiếm và phân trang trên hệ thống, 12 nhà hàng mỗi trang.
      </p>
      {result.isPending ? (
        <Skeleton count={6} />
      ) : result.isError ? (
        <ErrorState
          error={result.error}
          onRetry={() => {
            void result.refetch();
          }}
        />
      ) : !result.data.items.length ? (
        <EmptyState
          title={
            result.data.totalElements
              ? 'Trang này chưa có nhà hàng'
              : filters.q
                ? 'Chưa tìm thấy quán phù hợp'
                : 'Chưa có nhà hàng'
          }
          description="Thử bỏ bớt bộ lọc hoặc quay lại trang đầu."
          action={
            <Button variant="secondary" onClick={() => setParams({})}>
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <>
          <div className="results-heading">
            <span>{result.data.totalElements} nhà hàng</span>
            <span>
              Chọn một quán để xem thực đơn <ArrowRight size={15} />
            </span>
          </div>
          <div className="restaurant-grid">
            {result.data.items.map((restaurant, index) => (
              <RestaurantCard key={restaurant.restaurantId} restaurant={restaurant} index={index} />
            ))}
          </div>
          <Pagination
            page={result.data.page + 1}
            count={result.data.totalPages}
            onChange={(page) => update('page', String(page))}
          />
        </>
      )}
    </section>
  );
}
