package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.RestaurantFoodItem;

@Repository
public interface RestaurantFoodItemRepository extends JpaRepository<RestaurantFoodItem, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from RestaurantFoodItem m where m.restaurantFoodItemId=:id")
    java.util.Optional<RestaurantFoodItem> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from RestaurantFoodItem m where m.restaurantFoodItemId=:id and m.restaurant.restaurantId=:restaurantId")
    java.util.Optional<RestaurantFoodItem> findLockedOwnedById(@org.springframework.data.repository.query.Param("id") Long id,
        @org.springframework.data.repository.query.Param("restaurantId") Long restaurantId);
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically=true)
    @org.springframework.data.jpa.repository.Query("update RestaurantFoodItem m set m.price=:price,m.isAvailable=:available,m.version=m.version+1 where m.restaurantFoodItemId=:id and m.price=:expectedPrice and m.isAvailable=:expectedAvailable")
    int compareAndUpdate(@org.springframework.data.repository.query.Param("id") Long id,
        @org.springframework.data.repository.query.Param("price") java.math.BigDecimal price,
        @org.springframework.data.repository.query.Param("available") Boolean available,
        @org.springframework.data.repository.query.Param("expectedPrice") java.math.BigDecimal expectedPrice,
        @org.springframework.data.repository.query.Param("expectedAvailable") Boolean expectedAvailable);
    @org.springframework.data.jpa.repository.Query(value = """
        select m from RestaurantFoodItem m join fetch m.restaurant join fetch m.foodItem f
        where m.restaurant.restaurantId = :restaurantId
          and (:available is null or m.isAvailable = :available)
          and (:category = '' or lower(trim(f.category)) = lower(:category))
          and (lower(f.name) like :pattern escape '!' or lower(coalesce(f.description, '')) like :pattern escape '!')
        """, countQuery = """
        select count(m) from RestaurantFoodItem m join m.foodItem f
        where m.restaurant.restaurantId = :restaurantId
          and (:available is null or m.isAvailable = :available)
          and (:category = '' or lower(trim(f.category)) = lower(:category))
          and (lower(f.name) like :pattern escape '!' or lower(coalesce(f.description, '')) like :pattern escape '!')
        """)
    org.springframework.data.domain.Page<RestaurantFoodItem> searchRestaurantMenu(
        @org.springframework.data.repository.query.Param("restaurantId") Long restaurantId,
        @org.springframework.data.repository.query.Param("pattern") String pattern,
        @org.springframework.data.repository.query.Param("category") String category,
        @org.springframework.data.repository.query.Param("available") Boolean available,
        org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("select m from RestaurantFoodItem m join fetch m.restaurant join fetch m.foodItem")
    java.util.List<RestaurantFoodItem> findAllWithDetails();

    @org.springframework.data.jpa.repository.Query("select m from RestaurantFoodItem m join fetch m.restaurant join fetch m.foodItem where m.restaurantFoodItemId = :id")
    java.util.Optional<RestaurantFoodItem> findByIdWithDetails(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Query("select m from RestaurantFoodItem m join fetch m.restaurant join fetch m.foodItem where m.restaurant.restaurantId=:restaurantId and m.foodItem.itemId=:foodItemId")
    java.util.Optional<RestaurantFoodItem> findOwnByFoodId(
        @org.springframework.data.repository.query.Param("restaurantId") Long restaurantId,
        @org.springframework.data.repository.query.Param("foodItemId") Long foodItemId);

	java.util.Optional<RestaurantFoodItem> findByCreationKey(String creationKey);

	boolean existsByRestaurant_RestaurantIdAndFoodItem_ItemId(Long restaurantId, Long itemId);
}
