package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.RestaurantFoodItem;

@Repository
public interface RestaurantFoodItemRepository extends JpaRepository<RestaurantFoodItem, Long> {
    @org.springframework.data.jpa.repository.Query("select m from RestaurantFoodItem m join fetch m.restaurant join fetch m.foodItem")
    java.util.List<RestaurantFoodItem> findAllWithDetails();

    @org.springframework.data.jpa.repository.Query("select m from RestaurantFoodItem m join fetch m.restaurant join fetch m.foodItem where m.restaurantFoodItemId = :id")
    java.util.Optional<RestaurantFoodItem> findByIdWithDetails(@org.springframework.data.repository.query.Param("id") Long id);

	boolean existsByRestaurant_RestaurantIdAndFoodItem_ItemId(Long restaurantId, Long itemId);
}
