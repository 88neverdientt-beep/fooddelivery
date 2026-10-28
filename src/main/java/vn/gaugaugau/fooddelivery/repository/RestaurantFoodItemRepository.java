package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.RestaurantFoodItem;

@Repository
public interface RestaurantFoodItemRepository extends JpaRepository<RestaurantFoodItem, Long> {
	boolean existsByRestaurant_RestaurantIdAndFoodItem_ItemId(Long restaurantId, Long itemId);
}
