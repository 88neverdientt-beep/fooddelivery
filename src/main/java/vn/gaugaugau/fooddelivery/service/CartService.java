package vn.gaugaugau.fooddelivery.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Cart;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.dto.CartItemResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartResponseDTO;
import vn.gaugaugau.fooddelivery.repository.CartRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class CartService {

	private final CartRepository cartRepository;
	private final CartItemService cartItemService;
	private static final BigDecimal SHIPPING_FEE = BigDecimal.valueOf(15000);

	public CartResponseDTO.RestaurantResponseDTO convertToRestaurantResponseDTO(Restaurant restaurant) {
		return CartResponseDTO.RestaurantResponseDTO.builder()
				.restaurantId(restaurant.getRestaurantId())
				.name(restaurant.getName())
				.build();
	}

	@Transactional
	public CartResponseDTO getAllCartItems(Long customerId) {
		Cart cart = this.cartRepository.findByCustomer_CustomerId(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Customer doesn't have a cart!"));

		CartResponseDTO.RestaurantResponseDTO restaurant = convertToRestaurantResponseDTO(cart.getRestaurant());
		List<CartItemResponseDTO> cartItems = this.cartItemService.getAllCartItems(customerId);

		BigDecimal subtotal = cartItems.stream()
				.map(CartItemResponseDTO::getSubtotal)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal totalAmount = subtotal.add(SHIPPING_FEE);

		return CartResponseDTO.builder()
				.cartId(cart.getCartId())
				.restaurant(restaurant)
				.cartItems(cartItems)
				.totalItems(cartItems.size())
				.subtotal(subtotal)
				.shippingFee(SHIPPING_FEE)
				.totalAmount(totalAmount)
				.build();
	}

}
