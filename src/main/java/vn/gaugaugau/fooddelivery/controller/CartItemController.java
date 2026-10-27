package vn.gaugaugau.fooddelivery.controller;

import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.CartItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartItemResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartItemUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.service.CartItemService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequiredArgsConstructor
public class CartItemController {

    private final CartItemService cartItemService;

    @PostMapping("/{customerId}/cart-items")
    public ResponseEntity<ApiResponse<CartItemResponseDTO>> addCartItemToCart(@PathVariable Long customerId,
            @Valid @RequestBody CartItemRequestDTO request) {
        CartItemResponseDTO cartItemResponseDTO = this.cartItemService.addCartItemToCart(customerId, request);
        return ApiResponse.created(cartItemResponseDTO);
    }

    @PutMapping("/cart-items/{cartItemId}")
    public ResponseEntity<ApiResponse<CartItemResponseDTO>> updateCartItem(@PathVariable Long cartItemId,
            @Valid @RequestBody CartItemUpdateRequestDTO request) {
        CartItemResponseDTO cartItemResponseDTO = this.cartItemService.updateCartItem(cartItemId, request);
        return ApiResponse.success(cartItemResponseDTO);
    }

    @DeleteMapping("/cart-items/{cartItemId}")
    public ResponseEntity<ApiResponse<String>> deleteCartItem(@PathVariable Long cartItemId) {
        this.cartItemService.deleteCartItem(cartItemId);
        return ApiResponse.success("Delete successfully!");
    }

}
