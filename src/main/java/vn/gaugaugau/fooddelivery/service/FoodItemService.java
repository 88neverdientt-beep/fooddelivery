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

@org.springframework.transaction.annotation.Transactional
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
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")


	public FoodItemResponseDTO createFoodItem(FoodItemRequestDTO request) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.GONE,"Tạo món trực tiếp bằng tài khoản nhà hàng tại /restaurant-management/dishes; catalog chung đã ngừng sử dụng");
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
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")


	public FoodItemResponseDTO updateFoodItemById(Long itemId, FoodItemRequestDTO request) {
		FoodItem foodItem = this.foodItemRepository.findById(itemId)
				.orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));

        // Linked content is private to its menu; all edits must take that menu's revision lock.
        if(foodItem.getRestaurantFoodItems()!=null && !foodItem.getRestaurantFoodItems().isEmpty())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Món thuộc thực đơn riêng; chỉnh sửa bằng tài khoản nhà hàng qua API dishes");

		if (this.foodItemRepository.existsByNameAndItemIdNot(request.getName().trim().toUpperCase(), itemId)) {
			throw new ResourceAlreadyExistsException("Food item name already exists!");
		}
		foodItem.setName(request.getName().toUpperCase());
		foodItem.setCategory(request.getCategory());
		foodItem.setDescription(request.getDescription());
		return foodItemToFoodItemResponseDTO(this.foodItemRepository.save(foodItem));
	}
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")


	public FoodItemResponseDTO deleteFoodItemById(Long itemId) {
		FoodItem foodItem = this.foodItemRepository.findById(itemId)
				.orElseThrow(() -> new ResourceNotFoundException("Food item not found with ID: " + itemId));
		this.foodItemRepository.delete(foodItem);
		return foodItemToFoodItemResponseDTO(foodItem);
	}

}
