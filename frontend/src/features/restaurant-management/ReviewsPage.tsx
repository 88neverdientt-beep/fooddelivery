import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Button, Pagination } from '@/components/ui';
import { ErrorState, Skeleton, EmptyState } from '@/components/feedback';
import { RatingCard } from '@/features/ratings/RatingPages';
import { pageFrom } from '@/features/public/model';
import { restaurantApi } from './api';
import { ManagementSection, useRestaurant } from './shared';
export function RestaurantReviewsPage() {
  const { key } = useRestaurant();
  const [params, setParams] = useSearchParams();
  const page = pageFrom(params);
  const data = useQuery({
    queryKey: [...key, 'reviews', page],
    queryFn: ({ signal }) => restaurantApi.reviews(page, signal),
  });
  const stats = useQuery({
    queryKey: [...key, 'analytics', undefined, undefined],
    queryFn: ({ signal }) => restaurantApi.analytics({}, signal),
  });
  return (
    <ManagementSection>
      <PageHeader
        title="Đánh giá của khách hàng"
        description="Đọc đánh giá liên quan đến nhà hàng; không sửa, xóa hoặc tạo đánh giá thay khách."
        action={
          <Button variant="secondary" onClick={() => void data.refetch()}>
            Làm mới đánh giá
          </Button>
        }
      />
      {stats.data && (
        <p className="management-stat-list">
          {stats.data.ratingsCount} đánh giá ·{' '}
          {stats.data.averageRating === null
            ? 'Chưa có điểm trung bình'
            : `Điểm trung bình toàn bộ: ${stats.data.averageRating.toFixed(2)} / 5`}
        </p>
      )}
      {data.isPending ? (
        <Skeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <>
          {!data.data.items.length ? (
            <EmptyState
              title="Chưa có đánh giá"
              description="Đánh giá của khách đủ điều kiện sẽ xuất hiện tại đây."
            />
          ) : (
            data.data.items.map((rating) => (
              <RatingCard key={rating.ratingId} rating={rating} own={false} />
            ))
          )}
          <Pagination
            page={data.data.page + 1}
            count={data.data.totalPages}
            onChange={(n) => setParams({ page: String(n) })}
          />
        </>
      )}
    </ManagementSection>
  );
}
