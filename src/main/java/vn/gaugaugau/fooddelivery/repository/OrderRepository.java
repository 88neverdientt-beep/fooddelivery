package vn.gaugaugau.fooddelivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
	List<Order> findByCustomer_CustomerId(Long customerId);

	List<Order> findByRestaurant_RestaurantId(Long restaurantId);

	boolean existsByCustomer_CustomerIdAndRestaurant_RestaurantIdAndOrderStatus(Long customerId, Long restaurantId,
			OrderStatus orderStatus);
}
