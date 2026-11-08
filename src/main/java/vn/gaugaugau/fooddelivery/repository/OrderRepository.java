package vn.gaugaugau.fooddelivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Order e where e.orderId = :id")
    java.util.Optional<Order> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

	List<Order> findByCustomer_CustomerId(Long customerId);

	List<Order> findByRestaurant_RestaurantId(Long restaurantId);

	boolean existsByCustomer_CustomerIdAndRestaurant_RestaurantIdAndOrderStatus(Long customerId, Long restaurantId,
			OrderStatus orderStatus);
}
