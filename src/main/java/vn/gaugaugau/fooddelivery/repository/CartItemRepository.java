package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.CartItem;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

}
