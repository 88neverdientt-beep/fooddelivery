package vn.gaugaugau.fooddelivery.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantFoodItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantFoodItemResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantFoodItemUpdateDTO;
import vn.gaugaugau.fooddelivery.service.RestaurantFoodItemService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class RestaurantFoodItemController {

	private final RestaurantFoodItemService restaurantFoodItemService;

	@PostMapping("/restaurant-food-items")
	public ResponseEntity<ApiResponse<RestaurantFoodItemResponseDTO>> createRestaurantFoodItem(
			@Valid @RequestBody RestaurantFoodItemRequestDTO request) {
		RestaurantFoodItemResponseDTO response = this.restaurantFoodItemService.createRestaurantFoodItem(request);
		return ApiResponse.created(response);
	}

	@GetMapping("/restaurant-food-items")
	public ResponseEntity<ApiResponse<List<RestaurantFoodItemResponseDTO>>> getAllRestaurantFoodItems() {
		List<RestaurantFoodItemResponseDTO> response = this.restaurantFoodItemService.getAllRestaurantFoodItems();
		return ApiResponse.success(response);
	}

	@GetMapping("/restaurant-food-items/{restaurantFoodItemId}")
	public ResponseEntity<ApiResponse<RestaurantFoodItemResponseDTO>> getRestaurantFoodItemById(
			@PathVariable Long restaurantFoodItemId) {
		RestaurantFoodItemResponseDTO response = this.restaurantFoodItemService
				.getRestaurantFoodItemById(restaurantFoodItemId);
		return ApiResponse.success(response);
	}

	@PutMapping("/restaurant-food-items/{restaurantFoodItemId}")
	public ResponseEntity<ApiResponse<RestaurantFoodItemResponseDTO>> updateRestaurantFoodItemById(
			@PathVariable Long restaurantFoodItemId, @Valid @RequestBody RestaurantFoodItemUpdateDTO request) {
		RestaurantFoodItemResponseDTO response = this.restaurantFoodItemService
				.updateRestaurantFoodItemById(restaurantFoodItemId, request);
		return ApiResponse.success(response);
	}

	@DeleteMapping("/restaurant-food-items/{restaurantFoodItemId}")
	public ResponseEntity<ApiResponse<String>> deleteRestaurantFoodItemById(@PathVariable Long restaurantFoodItemId) {
		this.restaurantFoodItemService.deleteRestaurantFoodItemById(restaurantFoodItemId);
		return ApiResponse.success("delete successful");
	}

}
