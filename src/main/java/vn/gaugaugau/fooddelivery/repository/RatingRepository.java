package vn.gaugaugau.fooddelivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Rating;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

	List<Rating> findByRestaurant_RestaurantId(Long restaurantId);

	@Query("""
				SELECT AVG(r.ratingScore)
				FROM Rating r
				WHERE r.restaurant.restaurantId = :restaurantId
			""")
	Double getAverageRatingByRestaurantId(@Param("restaurantId") Long restaurantId);
}
