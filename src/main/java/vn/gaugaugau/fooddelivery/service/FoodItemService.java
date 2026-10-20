package vn.gaugaugau.fooddelivery.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.FoodItem;
import vn.gaugaugau.fooddelivery.model.dto.FoodItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.FoodItemResponseDTO;
import vn.gaugaugau.fooddelivery.repository.FoodItemRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceAlreadyExistsException;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class FoodItemService {

    private final FoodItemRepository foodItemRepository;

    private FoodItemResponseDTO foodItemToFoodItemResponseDTO(FoodItem foodItem) {
        return FoodItemResponseDTO.builder()
                .itemId(foodItem.getItemId())
                .name(foodItem.getName())
                .category(foodItem.getCategory())
                .description(foodItem.getDescription())
                .build();
    }

    public FoodItemResponseDTO createFoodItem(FoodItemRequestDTO request) {
        if (this.foodItemRepository.existsByName(request.getName().toUpperCase())) {
            throw new ResourceAlreadyExistsException("Food item name already exists!");
        }
        FoodItem foodItem = FoodItem.builder()
                .name(request.getName().toUpperCase())
                .category(request.getCategory())
                .description(request.getDescription())
                .build();
        return foodItemToFoodItemResponseDTO(this.foodItemRepository.save(foodItem));
    }

    public List<FoodItemResponseDTO> getAllFoodItems() {
        List<FoodItem> foodItems = this.foodItemRepository.findAll();
        return foodItems.stream().map(this::foodItemToFoodItemResponseDTO).collect(Collectors.toList());
    }

    public FoodItemResponseDTO getFoodItemById(Long itemId) {
        FoodItem foodItem = this.foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));
        return foodItemToFoodItemResponseDTO(foodItem);
    }

    public FoodItemResponseDTO updateFoodItemById(Long itemId, FoodItemRequestDTO request) {
        FoodItem foodItem = this.foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));

        if (this.foodItemRepository.existsByNameAndItemIdNot(request.getName().trim().toUpperCase(), itemId)) {
            throw new ResourceAlreadyExistsException("Food item name already exists!");
        }
        foodItem.setName(request.getName().toUpperCase());
        foodItem.setCategory(request.getCategory());
        foodItem.setDescription(request.getDescription());
        return foodItemToFoodItemResponseDTO(this.foodItemRepository.save(foodItem));
    }

    public FoodItemResponseDTO deleteFoodItemById(Long itemId) {
        FoodItem foodItem = this.foodItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));
        this.foodItemRepository.delete(foodItem);
        return foodItemToFoodItemResponseDTO(foodItem);
    }

}
