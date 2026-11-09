import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { FoodImage } from '@/components/ui/FoodImage';
import type { MenuItem } from '@/types/domain';
import { money } from './api';
import './customer-menu.css';

export function FoodCard({ item }: { item: MenuItem }) {
  return (
    <article className="customer-food-card">
      <Link
        to={`/restaurants/${item.restaurant.restaurantId}/food/${item.restaurantFoodItemId}`}
        className="customer-food-card-photo"
        tabIndex={-1}
        aria-hidden="true"
      >
        <FoodImage
          kind={/cơm|rice/i.test(item.foodItem.category || '') ? 'rice' : 'pho'}
          alt=""
          sizes="(max-width:600px) calc(100vw - 32px), (max-width:1023px) 45vw, 350px"
        />
        <span>Ảnh minh họa</span>
      </Link>
      <div className="customer-food-card-content">
        <div className="customer-food-card-title">
          <h3>{item.foodItem.name}</h3>
          <Badge tone={item.isAvailable ? 'success' : 'neutral'}>
            {item.isAvailable ? 'Còn bán' : 'Tạm hết'}
          </Badge>
        </div>
        {item.foodItem.category && <small className="muted">{item.foodItem.category}</small>}
        {item.foodItem.description && <p>{item.foodItem.description}</p>}
        <div className="customer-food-card-bottom">
          <strong className="price">{money(item.price)}</strong>
          <Link
            to={`/restaurants/${item.restaurant.restaurantId}/food/${item.restaurantFoodItemId}`}
            aria-label={`Xem món ${item.foodItem.name}`}
          >
            Xem món <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
