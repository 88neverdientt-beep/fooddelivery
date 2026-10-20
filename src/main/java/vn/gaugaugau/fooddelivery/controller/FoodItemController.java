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
import vn.gaugaugau.fooddelivery.model.dto.FoodItemRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.FoodItemResponseDTO;
import vn.gaugaugau.fooddelivery.service.FoodItemService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class FoodItemController {

    private final FoodItemService foodItemService;

    @PostMapping("/food-items")
    public ResponseEntity<ApiResponse<FoodItemResponseDTO>> createFoodItem(
            @Valid @RequestBody FoodItemRequestDTO request) {
        FoodItemResponseDTO response = this.foodItemService.createFoodItem(request);
        return ApiResponse.created(response);
    }

    @GetMapping("/food-items")
    public ResponseEntity<ApiResponse<List<FoodItemResponseDTO>>> getAllFoodItems() {
        List<FoodItemResponseDTO> response = this.foodItemService.getAllFoodItems();
        return ApiResponse.success(response);
    }

    @GetMapping("/food-items/{itemId}")
    public ResponseEntity<ApiResponse<FoodItemResponseDTO>> getFoodItemById(@PathVariable Long itemId) {
        FoodItemResponseDTO response = this.foodItemService.getFoodItemById(itemId);
        return ApiResponse.success(response);
    }

    @PutMapping("/food-items/{itemId}")
    public ResponseEntity<ApiResponse<FoodItemResponseDTO>> updateFoodItemById(
            @PathVariable Long itemId,
            @Valid @RequestBody FoodItemRequestDTO request) {
        FoodItemResponseDTO response = this.foodItemService.updateFoodItemById(itemId, request);
        return ApiResponse.success(response);
    }

    @DeleteMapping("/food-items/{itemId}")
    public ResponseEntity<ApiResponse<String>> deleteFoodItemById(@PathVariable Long itemId) {
        this.foodItemService.deleteFoodItemById(itemId);
        return ApiResponse.success("delete succesful");
    }
}
