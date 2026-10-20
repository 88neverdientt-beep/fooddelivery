package vn.gaugaugau.fooddelivery.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.FoodItem;
import vn.gaugaugau.fooddelivery.model.Rating;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.dto.FoodItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.FoodItemResponseDTO;
import vn.gaugaugau.fooddelivery.repository.FoodItemRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class FoodItemService {

    private final FoodItemRepository foodItemRepository;

    public FoodItemResponseDTO.RestaurantOutputDTO restaurantToDTO(Restaurant restaurant) {
        if (restaurant == null) {
            return null;
        }

        return FoodItemResponseDTO.RestaurantOutputDTO.builder()
                .restaurantId(restaurant.getRestaurantId())
                .name(restaurant.getName())
                .address(restaurant.getAddress())
                .build();
    }

    public FoodItemResponseDTO.RatingOutputDTO ratingToDTO(Rating rating) {
        return FoodItemResponseDTO.RatingOutputDTO.builder()
                .ratingId(rating.getRatingId())
                .ratingScore(rating.getRatingScore())
                .comment(rating.getComment())
                .createdAt(rating.getCreatedAt())
                .build();
    }

    public FoodItemResponseDTO foodItemToFoodItemResponseDTO(FoodItem foodItem) {
        return FoodItemResponseDTO.builder()
                .itemId(foodItem.getItemId())
                .name(foodItem.getName())
                .category(foodItem.getCategory())
                .build();
    }

    public List<FoodItemResponseDTO> getAllFoodItems() {
        return this.foodItemRepository.findAll().stream()
                .map(foodItem -> foodItemToFoodItemResponseDTO(foodItem))
                .collect(Collectors.toList());
    }

    public FoodItemResponseDTO getFoodItemById(Long itemId) {
        FoodItem foodItem = this.foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));
        return foodItemToFoodItemResponseDTO(foodItem);
    }

    public FoodItemResponseDTO updateFoodItemById(Long itemId, FoodItemRequestDTO request) {
        FoodItem foodItem = this.foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));
        foodItem.builder()
                .name(request.getName())
                .category(request.getCategory())
                .build();
        return foodItemToFoodItemResponseDTO(this.foodItemRepository.save(foodItem));
    }

    public FoodItemResponseDTO deleteFoodItemById(Long itemId) {
        FoodItem foodItem = this.foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));
        this.foodItemRepository.delete(foodItem);
        return foodItemToFoodItemResponseDTO(foodItem);
    }

}
