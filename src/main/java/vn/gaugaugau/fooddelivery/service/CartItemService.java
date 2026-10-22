package vn.gaugaugau.fooddelivery.service;

import java.math.BigDecimal;
import java.util.Optional;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Cart;
import vn.gaugaugau.fooddelivery.model.CartItem;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.model.RestaurantFoodItem;
import vn.gaugaugau.fooddelivery.model.dto.CartItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartItemResponseDTO;
import vn.gaugaugau.fooddelivery.repository.CartItemRepository;
import vn.gaugaugau.fooddelivery.repository.CartRepository;
import vn.gaugaugau.fooddelivery.repository.CustomerRepository;
import vn.gaugaugau.fooddelivery.repository.RestaurantFoodItemRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
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
        CartItem cartItem = new CartItem();
        cartItem.builder()
                .quantity(request.getQuantity())
                .note(request.getNote())
                .cart(cart)
                .restaurantFoodItem(restaurantFoodItem)
                .build();
        return convertToCartItemResponseDTO(this.cartItemRepository.save(cartItem));
    }

}
