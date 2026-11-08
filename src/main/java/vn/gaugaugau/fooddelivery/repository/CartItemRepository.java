package vn.gaugaugau.fooddelivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.CartItem;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from CartItem i where i.cart.cartId = :id")
    List<CartItem> findLockedByCartId(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from CartItem i where i.cartItemId = :id")
    java.util.Optional<CartItem> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Query("select i.cart.customer.customerId from CartItem i where i.cartItemId = :id")
    java.util.Optional<Long> findCustomerId(@org.springframework.data.repository.query.Param("id") Long id);

	List<CartItem> findByCart_CartId(Long cartId);

}
