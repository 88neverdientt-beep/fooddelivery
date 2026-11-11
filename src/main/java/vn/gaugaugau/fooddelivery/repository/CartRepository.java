package vn.gaugaugau.fooddelivery.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Cart;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {
	Optional<Cart> findByCustomer_CustomerId(Long customerId);

    // Materialize the unique customer row before taking a locking current read.
    // A locking lookup of a missing row would hold an unnecessary gap lock.
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "INSERT INTO carts (customer_id) VALUES (:customerId) AS incoming ON DUPLICATE KEY UPDATE customer_id = incoming.customer_id", nativeQuery = true)
    int ensureCustomerCart(@org.springframework.data.repository.query.Param("customerId") Long customerId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Cart c where c.customer.customerId = :customerId")
    Optional<Cart> findLockedByCustomerId(@org.springframework.data.repository.query.Param("customerId") Long customerId);

}
