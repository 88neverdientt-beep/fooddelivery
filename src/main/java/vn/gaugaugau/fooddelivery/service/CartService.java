package vn.gaugaugau.fooddelivery.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
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
    private final vn.gaugaugau.fooddelivery.repository.CustomerRepository customerRepository;
	private final CartItemService cartItemService;
	private static final BigDecimal SHIPPING_FEE = BigDecimal.valueOf(15000);

	public CartResponseDTO.RestaurantResponseDTO convertToRestaurantResponseDTO(Restaurant restaurant) {
		if (restaurant == null) return null;
		return CartResponseDTO.RestaurantResponseDTO.builder()
				.restaurantId(restaurant.getRestaurantId())
				.name(restaurant.getName())
				.build();
	}

	@Transactional(readOnly = true)
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#customerId,false)")


	public CartResponseDTO getAllCartItems(Long customerId) {
		if (!customerRepository.existsById(customerId)) throw new ResourceNotFoundException("Customer not found");
		Cart cart = this.cartRepository.findByCustomer_CustomerId(customerId)
				.orElse(null);
        if (cart == null) return CartResponseDTO.builder().cartItems(List.of()).totalItems(0)
            .subtotal(BigDecimal.ZERO).shippingFee(BigDecimal.ZERO).totalAmount(BigDecimal.ZERO).build();

		CartResponseDTO.RestaurantResponseDTO restaurant = convertToRestaurantResponseDTO(cart.getRestaurant());
		List<CartItemResponseDTO> cartItems = this.cartItemService.getAllCartItems(customerId);

		if (!cartItems.isEmpty() && cart.getRestaurant() == null)
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "Cart restaurant is missing");
        if (cartItems.isEmpty()) restaurant = null;
        BigDecimal subtotal = cartItems.stream()
				.map(CartItemResponseDTO::getSubtotal)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		BigDecimal shippingFee = cartItems.isEmpty() ? BigDecimal.ZERO : SHIPPING_FEE;
        BigDecimal totalAmount = subtotal.add(shippingFee);

		return CartResponseDTO.builder()
				.cartId(cart.getCartId())
				.restaurant(restaurant)
				.cartItems(cartItems)
				.totalItems(cartItems.size())
				.subtotal(subtotal)
				.shippingFee(shippingFee)
				.totalAmount(totalAmount)
				.build();
	}

}
