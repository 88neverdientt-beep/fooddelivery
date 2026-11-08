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
import vn.gaugaugau.fooddelivery.model.dto.RestaurantRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.service.RestaurantService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class RestaurantController {

	private final RestaurantService restaurantService;
    private final vn.gaugaugau.fooddelivery.auth.service.AuthService authService;

	@PostMapping("/restaurants")
	public ResponseEntity<?> createRestaurant(
			@Valid @RequestBody RestaurantRequestDTO request) {
		var response = this.authService.createRestaurant(request);
		return ApiResponse.created(response);
	}

	@GetMapping("/restaurants")
	public ResponseEntity<?> getAllRestaurants() {
		List<RestaurantResponseDTO> response = this.restaurantService.getAllRestaurants();
		return ApiResponse.success(response.stream().map(vn.gaugaugau.fooddelivery.model.dto.PublicRestaurant::from).toList());
	}

	@GetMapping("/restaurants/{restaurantId}")
	public ResponseEntity<?> getRestaurantById(@PathVariable Long restaurantId) {
		RestaurantResponseDTO response = this.restaurantService.getRestaurantById(restaurantId);
		return ApiResponse.success(vn.gaugaugau.fooddelivery.model.dto.PublicRestaurant.from(response));
	}

	@PutMapping("/restaurants/{restaurantId}")
	public ResponseEntity<ApiResponse<RestaurantResponseDTO>> updateRestaurantById(@PathVariable Long restaurantId,
			@Valid @RequestBody RestaurantUpdateRequestDTO request) {
		RestaurantResponseDTO response = this.restaurantService.updateRestaurantById(restaurantId, request);
		return ApiResponse.success(response);
	}

	@DeleteMapping("/restaurants/{restaurantId}")
	public ResponseEntity<ApiResponse<String>> deleteRestaurantById(@PathVariable Long restaurantId) {
		this.restaurantService.deleteRestaurantById(restaurantId);
		return ApiResponse.success("delete succesful");
	}
}
