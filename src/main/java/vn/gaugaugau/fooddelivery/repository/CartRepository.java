package vn.gaugaugau.fooddelivery.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.gaugaugau.fooddelivery.model.Cart;

public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByCustomer_CustomerId(Long customerId);

}
