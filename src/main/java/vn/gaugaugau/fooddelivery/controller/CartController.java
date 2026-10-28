package vn.gaugaugau.fooddelivery.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.CartResponseDTO;
import vn.gaugaugau.fooddelivery.service.CartService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class CartController {
	private final CartService cartService;

	@GetMapping("/cart/{customerId}")
	public ResponseEntity<ApiResponse<CartResponseDTO>> getAllCartItems(@PathVariable Long customerId) {
		CartResponseDTO responseDTO = this.cartService.getAllCartItems(customerId);
		return ApiResponse.success(responseDTO);
	}
}
