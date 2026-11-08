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
                .restaurantFoodItemId(cartItem.getRestaurantFoodItem().getRestaurantFoodItemId())
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
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#customerId,false)")



	public CartItemResponseDTO addCartItemToCart(Long customerId, CartItemRequestDTO request) {
		Customer customer = this.customerRepository.findLockedById(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
		Cart cart = this.getOrCreateCart(customer);
        List<CartItem> existingItems = cartItemRepository.findLockedByCartId(cart.getCartId());
        if (existingItems.isEmpty()) cart.setRestaurant(null);
        else {
            var expected = existingItems.get(0).getRestaurantFoodItem().getRestaurant();
            if (existingItems.stream().anyMatch(i -> !expected.getRestaurantId().equals(
                    i.getRestaurantFoodItem().getRestaurant().getRestaurantId())))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cart contains mixed restaurants");
            cart.setRestaurant(expected);
        }
		RestaurantFoodItem restaurantFoodItem = this.restaurantFoodItemRepository
				.findById(request.getRestaurantFoodItemId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Restaurant food item not found with ID: " + request.getRestaurantFoodItemId()));
		if (!Boolean.TRUE.equals(restaurantFoodItem.getRestaurant().getRestaurantStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Restaurant is inactive");
        if (!Boolean.TRUE.equals(restaurantFoodItem.getIsAvailable())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Food item is not available");
		}
		if (cart.getRestaurant() != null && !cart.getRestaurant().getRestaurantId()
				.equals(restaurantFoodItem.getRestaurant().getRestaurantId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Cannot add food items from different restaurants to the same cart");
		}
		if (request.getQuantity() == null || request.getQuantity() <= 0) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
		}
		if (cart.getRestaurant() == null) {
			cart.setRestaurant(restaurantFoodItem.getRestaurant());
			this.cartRepository.save(cart);
		}
		List<CartItem> cartItems = this.cartItemRepository.findLockedByCartId(cart.getCartId());
		CartItem newCartItem = new CartItem();
		if (cartItems.isEmpty()) {
			newCartItem = CartItem.builder()
					.quantity(request.getQuantity())
					.note(request.getNote())
					.cart(cart)
					.restaurantFoodItem(restaurantFoodItem)
					.build();
		} else {
			CartItem cartItemTmp = null;
			for (CartItem cartItem : cartItems) {
				if (Long.compare(cartItem.getRestaurantFoodItem().getRestaurantFoodItemId(),
						request.getRestaurantFoodItemId()) == 0) {
					cartItemTmp = cartItem;
					break;
				}
			}
			if (cartItemTmp == null) {
				newCartItem = CartItem.builder()
						.quantity(request.getQuantity())
						.note(request.getNote())
						.cart(cart)
						.restaurantFoodItem(restaurantFoodItem)
						.build();
			} else {
				if ((long) cartItemTmp.getQuantity() + request.getQuantity() > Integer.MAX_VALUE)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity is too large");
                cartItemTmp.setQuantity(cartItemTmp.getQuantity() + request.getQuantity());
				if (request.getNote() != null && !request.getNote().isBlank()) {
					cartItemTmp.setNote(request.getNote());
				}
				this.cartItemRepository.save(cartItemTmp);
				return convertToCartItemResponseDTO(cartItemTmp);
			}
		}
		return convertToCartItemResponseDTO(this.cartItemRepository.save(newCartItem));
	}
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#customerId,false)")



	public List<CartItemResponseDTO> getAllCartItems(Long customerId) {
        if (!customerRepository.existsById(customerId)) throw new ResourceNotFoundException("Customer not found");
        Cart cart = this.cartRepository.findByCustomer_CustomerId(customerId)
				.orElse(null);
        if (cart == null) return List.of();

		return this.cartItemRepository.findByCart_CartId(cart.getCartId())
				.stream()
				.map(this::convertToCartItemResponseDTO)
				.collect(Collectors.toList());
	}
    @org.springframework.security.access.prepost.PreAuthorize("@access.cartItem(#cartItemId)")



	public CartItemResponseDTO updateCartItem(Long cartItemId, CartItemUpdateRequestDTO request) {
        lockCartOwner(cartItemId);
		CartItem cartItem = this.cartItemRepository.findLockedById(cartItemId)
				.orElseThrow(() -> new ResourceNotFoundException("Cart item not found with ID: " + cartItemId));
		if (request.getQuantity() == null || request.getQuantity() <= 0) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
		}
		cartItem.setQuantity(request.getQuantity());
		if (request.getNote() != null && !request.getNote().isBlank()) {
			cartItem.setNote(request.getNote());
		}
		return convertToCartItemResponseDTO(this.cartItemRepository.save(cartItem));
	}

    private void lockCartOwner(Long itemId) {
        Long customerId = cartItemRepository.findCustomerId(itemId)
            .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));
        customerRepository.findLockedById(customerId)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }
    @org.springframework.security.access.prepost.PreAuthorize("@access.cartItem(#cartItemId)")



	public void deleteCartItem(Long cartItemId) {
        lockCartOwner(cartItemId);
		CartItem cartItem = this.cartItemRepository.findLockedById(cartItemId)
				.orElseThrow(() -> new ResourceNotFoundException("Cart item not found with ID: " + cartItemId));
		Cart cart = cartItem.getCart();
		this.cartItemRepository.delete(cartItem);
		if (this.cartItemRepository.findLockedByCartId(cart.getCartId()).isEmpty()) {
			cart.setRestaurant(null);
			this.cartRepository.save(cart);
		}
	}

}
