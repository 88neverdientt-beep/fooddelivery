package vn.gaugaugau.fooddelivery.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.model.Rating;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.dto.RatingRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.RatingResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.RatingUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.repository.CustomerRepository;
import vn.gaugaugau.fooddelivery.repository.OrderRepository;
import vn.gaugaugau.fooddelivery.repository.RatingRepository;
import vn.gaugaugau.fooddelivery.repository.RestaurantRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
@Transactional
public class RatingService {

	private final RatingRepository ratingRepository;
	private final CustomerRepository customerRepository;
	private final RestaurantRepository restaurantRepository;
	private final OrderRepository orderRepository;

	public RatingResponseDTO.CustomerOutputDTO convertToCustomerOutputDTO(Customer customer) {
		return RatingResponseDTO.CustomerOutputDTO.builder()
				.customerId(customer.getCustomerId())
				.name("Customer")
				.build();
	}

	public RatingResponseDTO convertToRatingResponseDTO(Rating rating) {
		return RatingResponseDTO.builder()
				.ratingId(rating.getRatingId())
				.ratingScore(rating.getRatingScore())
				.comment(rating.getComment())
				.createdAt(rating.getCreatedAt())
				.customerOutputDTO(convertToCustomerOutputDTO(rating.getCustomer()))
				.build();
	}
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#request.customerId,false)")


	public RatingResponseDTO createRating(Long restaurantId, RatingRequestDTO request) {
		Customer customer = this.customerRepository.findById(request.getCustomerId())
				.orElseThrow(
						() -> new ResourceNotFoundException("Customer not found with ID = " + request.getCustomerId()));
		Restaurant restaurant = this.restaurantRepository.findById(restaurantId)
				.orElseThrow(() -> new ResourceNotFoundException("Restaurant not found with ID = " + restaurantId));
		boolean hasCompletedOrder = this.orderRepository
				.existsByCustomer_CustomerIdAndRestaurant_RestaurantIdAndOrderStatus(request.getCustomerId(),
						restaurantId,
						OrderStatus.COMPLETED);
		if (!hasCompletedOrder) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Customer must complete at least one order at this restaurant before rating");
		}
		Rating rating = Rating.builder()
				.ratingScore(request.getRatingScore())
				.comment(request.getComment())
				.customer(customer)
				.restaurant(restaurant)
				.build();
		Rating savedRating = this.ratingRepository.save(rating);
		return convertToRatingResponseDTO(savedRating);
	}

	@Transactional(readOnly = true)
	public List<RatingResponseDTO> getRatingsByRestaurantId(Long restaurantId) {
		if (!this.restaurantRepository.existsById(restaurantId)) {
			throw new ResourceNotFoundException(
					"Restaurant not found with ID = " + restaurantId);
		}
		return this.ratingRepository
				.findByRestaurant_RestaurantId(restaurantId)
				.stream()
				.map(this::convertToRatingResponseDTO)
				.toList();
	}

	@Transactional(readOnly = true)
	public Double getAverageRatingByRestaurantId(Long restaurantId) {
		if (!this.restaurantRepository.existsById(restaurantId)) {
			throw new ResourceNotFoundException("Restaurant not found with ID = " + restaurantId);
		}
		Double averageRating = this.ratingRepository.getAverageRatingByRestaurantId(restaurantId);
		return averageRating == null ? 0.0 : averageRating;
	}

	@Transactional
    @org.springframework.security.access.prepost.PreAuthorize("@access.rating(#ratingId,#customerId,false)")

	public RatingResponseDTO updateRating(Long ratingId, Long customerId, RatingUpdateRequestDTO request) {
		Rating rating = this.ratingRepository.findById(ratingId).orElseThrow(() -> new ResourceNotFoundException(
				"Rating not found with ID = " + ratingId));
		if (!rating.getCustomer().getCustomerId().equals(customerId)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN,
					"You are not allowed to update this rating");
		}
		rating.setRatingScore(request.getRatingScore());
		rating.setComment(request.getComment());
		Rating savedRating = this.ratingRepository.save(rating);
		return convertToRatingResponseDTO(savedRating);
	}

	@Transactional
    @org.springframework.security.access.prepost.PreAuthorize("@access.rating(#ratingId,#customerId,true)")

	public void deleteRating(Long ratingId, Long customerId) {
		Rating rating = this.ratingRepository.findById(ratingId).orElseThrow(() -> new ResourceNotFoundException(
				"Rating not found with ID = " + ratingId));
		if (!rating.getCustomer().getCustomerId().equals(customerId)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to delete this rating");
		}
		this.ratingRepository.delete(rating);
	}

}
