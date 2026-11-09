package vn.gaugaugau.fooddelivery.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.service.CustomerReadService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

/** Additive read APIs; all existing collection contracts remain unchanged. */
@RestController
@RequiredArgsConstructor
public class CustomerReadController {
    private final CustomerReadService read;

    @GetMapping("/payment-methods")
    public ResponseEntity<ApiResponse<List<PaymentMethodResponseDTO>>> methods() {
        return ApiResponse.success(read.methods());
    }

    @GetMapping("/restaurants/search")
    public ResponseEntity<ApiResponse<PageResponse<PublicRestaurant>>> restaurants(
            @RequestParam(defaultValue = "") String q, @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "name") String sort) {
        return ApiResponse.success(read.restaurants(q, active, page, size, sort));
    }

    @GetMapping("/restaurants/{restaurantId}/menu")
    public ResponseEntity<ApiResponse<PageResponse<RestaurantFoodItemResponseDTO>>> menu(
            @PathVariable Long restaurantId, @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String category, @RequestParam(required = false) Boolean available,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "name") String sort) {
        return ApiResponse.success(read.menu(restaurantId, q, category, available, page, size, sort));
    }

    @GetMapping("/food-categories")
    public ResponseEntity<ApiResponse<PageResponse<String>>> categories(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.success(read.categories(page, size));
    }

    @GetMapping("/customers/{customerId}/orders/page")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponseDTO>>> orders(
            @PathVariable Long customerId, @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.success(read.orders(customerId, status, page, size));
    }

    @GetMapping("/restaurants/{restaurantId}/ratings/page")
    public ResponseEntity<ApiResponse<PageResponse<RatingResponseDTO>>> ratings(
            @PathVariable Long restaurantId, @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
        return ApiResponse.success(read.ratings(restaurantId, mine, page, size));
    }
}
