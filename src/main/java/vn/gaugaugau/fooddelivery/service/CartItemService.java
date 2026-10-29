package vn.gaugaugau.fooddelivery.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Cart;
import vn.gaugaugau.fooddelivery.model.CartItem;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.model.RestaurantFoodItem;
import vn.gaugaugau.fooddelivery.model.dto.CartItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartItemResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartItemUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.repository.CartItemRepository;
import vn.gaugaugau.fooddelivery.repository.CartRepository;
import vn.gaugaugau.fooddelivery.repository.CustomerRepository;
import vn.gaugaugau.fooddelivery.repository.RestaurantFoodItemRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
@Transactional
public class CartItemService {

	private final CartItemRepository cartItemRepository;
	private final CartRepository cartRepository;
	private final CustomerRepository customerRepository;
	private final RestaurantFoodItemRepository restaurantFoodItemRepository;

	public CartItemResponseDTO convertToCartItemResponseDTO(CartItem cartItem) {
		return CartItemResponseDTO.builder()
				.cartItemId(cartItem.getCartItemId())
				.foodItemName(cartItem.getRestaurantFoodItem().getFoodItem().getName())
				.quantity(cartItem.getQuantity())
				.note(cartItem.getNote())
				.unitPrice(cartItem.getRestaurantFoodItem().getPrice())
				.subtotal(cartItem.getRestaurantFoodItem().getPrice()
						.multiply(BigDecimal.valueOf(cartItem.getQuantity())))
				.build();
	}

	public Cart getOrCreateCart(Customer customer) {
		Optional<Cart> cart = this.cartRepository.findByCustomer_CustomerId(customer.getCustomerId());
		if (cart.isPresent()) {
			return cart.get();
		} else {
			return this.cartRepository.save(Cart.builder().customer(customer).build());
		}
	}

	public CartItemResponseDTO addCartItemToCart(Long customerId, CartItemRequestDTO request) {
		Customer customer = this.customerRepository.findById(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
		Cart cart = this.getOrCreateCart(customer);
		RestaurantFoodItem restaurantFoodItem = this.restaurantFoodItemRepository
				.findById(request.getRestaurantFoodItemId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Restaurant food item not found with ID: " + request.getRestaurantFoodItemId()));
		if (!restaurantFoodItem.getIsAvailable()) {
			throw new ResourceNotFoundException("Food item is not available");
		}
		if (cart.getRestaurant() == null) {
			cart.setRestaurant(restaurantFoodItem.getRestaurant());
			this.cartRepository.save(cart);
		}
		if (cart.getRestaurant() != null && !cart.getRestaurant().getRestaurantId()
				.equals(restaurantFoodItem.getRestaurant().getRestaurantId())) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"Cannot add food items from different restaurants to the same cart");
		}
		CartItem cartItem = CartItem.builder()
				.quantity(request.getQuantity())
				.note(request.getNote())
				.cart(cart)
				.restaurantFoodItem(restaurantFoodItem)
				.build();
		return convertToCartItemResponseDTO(this.cartItemRepository.save(cartItem));
	}

	public List<CartItemResponseDTO> getAllCartItems(Long customerId) {
		Cart cart = this.cartRepository.findByCustomer_CustomerId(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Cart not found"));

		return this.cartItemRepository.findByCart_CartId(cart.getCartId())
				.stream()
				.map(this::convertToCartItemResponseDTO)
				.collect(Collectors.toList());
	}

	public CartItemResponseDTO updateCartItem(Long cartItemId, CartItemUpdateRequestDTO request) {
		CartItem cartItem = this.cartItemRepository.findById(cartItemId)
				.orElseThrow(() -> new ResourceNotFoundException("Cart item not found with ID: " + cartItemId));
		cartItem.setQuantity(request.getQuantity());
		cartItem.setNote(request.getNote());
		return convertToCartItemResponseDTO(this.cartItemRepository.save(cartItem));
	}

	public void deleteCartItem(Long cartItemId) {
		CartItem cartItem = this.cartItemRepository.findById(cartItemId)
				.orElseThrow(() -> new ResourceNotFoundException("Cart item not found with ID: " + cartItemId));
		this.cartItemRepository.delete(cartItem);
	}

}
