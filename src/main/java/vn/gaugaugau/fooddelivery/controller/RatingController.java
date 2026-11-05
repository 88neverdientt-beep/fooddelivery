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
import vn.gaugaugau.fooddelivery.model.dto.RatingRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.RatingResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.RatingUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.service.RatingService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class RatingController {

	private final RatingService ratingService;

	@PostMapping("restaurants/{restaurantId}/ratings")
	public ResponseEntity<ApiResponse<RatingResponseDTO>> createRating(@PathVariable Long restaurantId,
			@Valid @RequestBody RatingRequestDTO request) {
		RatingResponseDTO ratingResponseDTO = this.ratingService.createRating(restaurantId, request);
		return ApiResponse.created(ratingResponseDTO);
	}

	@GetMapping("/restaurants/{restaurantId}/ratings")
	public ResponseEntity<ApiResponse<List<RatingResponseDTO>>> getRatingsByRestaurantId(
			@PathVariable Long restaurantId) {
		List<RatingResponseDTO> ratings = this.ratingService.getRatingsByRestaurantId(restaurantId);
		return ApiResponse.success(ratings);
	}

	@GetMapping("/restaurants/{restaurantId}/ratings/average")
	public ResponseEntity<ApiResponse<Double>> getAverageRating(@PathVariable Long restaurantId) {
		Double averageRating = this.ratingService.getAverageRatingByRestaurantId(restaurantId);
		return ApiResponse.success(averageRating);
	}

	@PutMapping("/ratings/{ratingId}/customers/{customerId}")
	public ResponseEntity<ApiResponse<RatingResponseDTO>> updateRating(
			@PathVariable Long ratingId, @PathVariable Long customerId,
			@Valid @RequestBody RatingUpdateRequestDTO request) {
		RatingResponseDTO response = this.ratingService.updateRating(ratingId, customerId, request);
		return ApiResponse.success(response);
	}

	@DeleteMapping("/ratings/{ratingId}/customers/{customerId}")
	public ResponseEntity<ApiResponse<String>> deleteRating(@PathVariable Long ratingId,
			@PathVariable Long customerId) {
		this.ratingService.deleteRating(ratingId, customerId);
		return ApiResponse.success("Delete succesfully!");
	}

}
