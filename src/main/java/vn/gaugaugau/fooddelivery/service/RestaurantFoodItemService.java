
package vn.gaugaugau.fooddelivery.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.FoodItem;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.RestaurantFoodItem;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantFoodItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantFoodItemResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantFoodItemUpdateDTO;
import vn.gaugaugau.fooddelivery.repository.FoodItemRepository;
import vn.gaugaugau.fooddelivery.repository.RestaurantFoodItemRepository;
import vn.gaugaugau.fooddelivery.repository.RestaurantRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class RestaurantFoodItemService {

	private final RestaurantFoodItemRepository restaurantFoodItemRepository;
	private final RestaurantRepository restaurantRepository;
	private final FoodItemRepository foodItemRepository;

	public RestaurantFoodItemResponseDTO convertToRestaurantFoodItemResponseDTO(RestaurantFoodItem restaurantFoodItem) {
		RestaurantFoodItemResponseDTO.RestaurantOutputDTO restaurantOutputDTO = RestaurantFoodItemResponseDTO.RestaurantOutputDTO
				.builder()
				.restaurantId(restaurantFoodItem.getRestaurant().getRestaurantId())
				.name(restaurantFoodItem.getRestaurant().getName())
				.address(restaurantFoodItem.getRestaurant().getAddress())
				.phoneNumber(restaurantFoodItem.getRestaurant().getPhoneNumber())
				.build();
		RestaurantFoodItemResponseDTO.FoodItemOutputDTO foodItemOutputDTO = RestaurantFoodItemResponseDTO.FoodItemOutputDTO
				.builder()
				.itemId(restaurantFoodItem.getFoodItem().getItemId())
				.name(restaurantFoodItem.getFoodItem().getName())
				.category(restaurantFoodItem.getFoodItem().getCategory())
				.description(restaurantFoodItem.getFoodItem().getDescription())
				.build();
		return RestaurantFoodItemResponseDTO.builder()
				.restaurantFoodItemId(restaurantFoodItem.getRestaurantFoodItemId())
				.price(restaurantFoodItem.getPrice())
				.isAvailable(restaurantFoodItem.getIsAvailable())
				.restaurant(restaurantOutputDTO)
				.foodItem(foodItemOutputDTO)
				.build();
	}

	public RestaurantFoodItemResponseDTO createRestaurantFoodItem(RestaurantFoodItemRequestDTO request) {
		Restaurant restaurant = this.restaurantRepository.findById(request.getRestaurantId()).orElseThrow(
				() -> new ResourceNotFoundException("Restaurant not found with ID: " + request.getRestaurantId()));
		FoodItem foodItem = this.foodItemRepository.findById(request.getFoodItemId()).orElseThrow(
				() -> new ResourceNotFoundException("Food item not found with ID: " + request.getFoodItemId()));
		if (this.restaurantFoodItemRepository.existsByRestaurant_RestaurantIdAndFoodItem_ItemId(
				restaurant.getRestaurantId(), foodItem.getItemId())) {
			throw new ResourceNotFoundException("Restaurant food item already exists");
		}
		RestaurantFoodItem restaurantFoodItem = RestaurantFoodItem.builder()
				.price(request.getPrice())
				.isAvailable(request.getIsAvailable() != null ? request.getIsAvailable() : true)
				.restaurant(restaurant)
				.foodItem(foodItem)
				.build();
		return convertToRestaurantFoodItemResponseDTO(this.restaurantFoodItemRepository.save(restaurantFoodItem));
	}

	public List<RestaurantFoodItemResponseDTO> getAllRestaurantFoodItems() {
		List<RestaurantFoodItem> restaurantFoodItems = this.restaurantFoodItemRepository.findAll();
		return restaurantFoodItems.stream().map(this::convertToRestaurantFoodItemResponseDTO)
				.collect(Collectors.toList());
	}

	public RestaurantFoodItemResponseDTO getRestaurantFoodItemById(Long restaurantFoodItemId) {
		RestaurantFoodItem restaurantFoodItem = this.restaurantFoodItemRepository.findById(restaurantFoodItemId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Restaurant food item not found with ID: " + restaurantFoodItemId));
		return convertToRestaurantFoodItemResponseDTO(restaurantFoodItem);
	}

	public RestaurantFoodItemResponseDTO updateRestaurantFoodItemById(Long restaurantFoodItemId,
			RestaurantFoodItemUpdateDTO request) {
		RestaurantFoodItem restaurantFoodItem = this.restaurantFoodItemRepository.findById(restaurantFoodItemId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Restaurant food item not found with ID: " + restaurantFoodItemId));
		restaurantFoodItem.setPrice(request.getPrice());
		restaurantFoodItem.setIsAvailable(request.getIsAvailable() != null ? request.getIsAvailable() : true);
		return convertToRestaurantFoodItemResponseDTO(this.restaurantFoodItemRepository.save(restaurantFoodItem));
	}

	public RestaurantFoodItemResponseDTO deleteRestaurantFoodItemById(Long restaurantFoodItemId) {
		RestaurantFoodItem restaurantFoodItem = this.restaurantFoodItemRepository.findById(restaurantFoodItemId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Restaurant food item not found with ID: " + restaurantFoodItemId));
		RestaurantFoodItemResponseDTO response = convertToRestaurantFoodItemResponseDTO(restaurantFoodItem);
		this.restaurantFoodItemRepository.delete(restaurantFoodItem);
		return response;
	}

}