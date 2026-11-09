package vn.gaugaugau.fooddelivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @org.springframework.data.jpa.repository.Query("""
        select o.orderId from Order o where o.customer.customerId = :customerId
          and (:status is null or o.orderStatus = :status)
        """)
    org.springframework.data.domain.Page<Long> findCustomerOrderPage(
        @org.springframework.data.repository.query.Param("customerId") Long customerId,
        @org.springframework.data.repository.query.Param("status") OrderStatus status,
        org.springframework.data.domain.Pageable pageable);

    /** Pagination is applied to IDs above, never to the fetched orderDetails collection. */
    @org.springframework.data.jpa.repository.Query("""
        select distinct o from Order o
        join fetch o.customer c left join fetch c.cart join fetch o.restaurant
        left join fetch o.orderDetails d left join fetch d.restaurantFoodItem m left join fetch m.foodItem
        left join fetch o.delivery left join fetch o.payment p left join fetch p.paymentMethod
        where o.orderId in :ids
        """)
    java.util.List<Order> findPageDetails(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Order e where e.orderId = :id")
    java.util.Optional<Order> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

	List<Order> findByCustomer_CustomerId(Long customerId);

	List<Order> findByRestaurant_RestaurantId(Long restaurantId);

	boolean existsByCustomer_CustomerIdAndRestaurant_RestaurantIdAndOrderStatus(Long customerId, Long restaurantId,
			OrderStatus orderStatus);
}
