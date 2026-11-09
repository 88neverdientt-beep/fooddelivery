package vn.gaugaugau.fooddelivery.service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.gaugaugau.fooddelivery.auth.security.AccessRules;
import vn.gaugaugau.fooddelivery.auth.security.CurrentActor;
import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.repository.*;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

/** Read-only projections for the customer UI. No pricing or lifecycle mutation lives here. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerReadService {
    private final RestaurantRepository restaurants;
    private final RestaurantFoodItemRepository menus;
    private final FoodItemRepository foods;
    private final PaymentMethodRepository methods;
    private final OrderRepository orders;
    private final RatingRepository ratings;
    private final RestaurantFoodItemService menuMapping;
    private final OrderService orderMapping;
    private final RatingService ratingMapping;
    private final AccessRules access;

    @PreAuthorize("hasRole('CUSTOMER')")
    public List<PaymentMethodResponseDTO> methods() {
        // COD is the only implemented customer payment flow. Unique method_code bounds this to one row.
        return methods.findByIsActiveTrueAndPaymentMethodCodeOrderByPaymentMethodIdAsc("COD").stream()
            .filter(method -> "COD".equals(method.getPaymentMethodCode()))
            .map(method -> PaymentMethodResponseDTO.builder().paymentMethodId(method.getPaymentMethodId())
                .paymentMethodName(method.getPaymentMethodName()).paymentMethodCode(method.getPaymentMethodCode()).build())
            .toList();
    }

    public PageResponse<PublicRestaurant> restaurants(String q, Boolean active, int page, int size, String sort) {
        var result = restaurants.searchPublic(ReadQuery.literalPattern(q), active,
            ReadQuery.page(page, size, ReadQuery.restaurantSort(sort)));
        return PageResponse.from(result, result.stream().map(restaurant -> new PublicRestaurant(
            restaurant.getRestaurantId(), restaurant.getName(), restaurant.getAddress(), restaurant.getRestaurantStatus())).toList());
    }

    public PageResponse<RestaurantFoodItemResponseDTO> menu(Long restaurantId, String q, String category,
            Boolean available, int page, int size, String sort) {
        var request = ReadQuery.page(page, size, ReadQuery.menuSort(sort));
        var pattern = ReadQuery.literalPattern(q);
        var normalizedCategory = ReadQuery.category(category);
        requireRestaurant(restaurantId);
        var result = menus.searchRestaurantMenu(restaurantId, pattern, normalizedCategory, available, request);
        return PageResponse.from(result, result.stream().map(menuMapping::convertToRestaurantFoodItemResponseDTO).toList());
    }

    public PageResponse<String> categories(int page, int size) {
        var result = foods.findPublicCategories(ReadQuery.page(page, size, Sort.unsorted()));
        return PageResponse.from(result, result.getContent());
    }

    @PreAuthorize("@access.profile('CUSTOMER',#customerId,true)")
    public PageResponse<OrderResponseDTO> orders(Long customerId, OrderStatus status, int page, int size) {
        var ids = orders.findCustomerOrderPage(customerId, status,
            ReadQuery.page(page, size, Sort.by("orderId").descending()));
        if (ids.isEmpty()) return PageResponse.from(ids, List.of());
        Map<Long, Order> details = orders.findPageDetails(ids.getContent()).stream()
            .collect(Collectors.toMap(Order::getOrderId, Function.identity()));
        return PageResponse.from(ids, ids.stream().map(id -> orderMapping.convertToOrderResponseDTO(details.get(id))).toList());
    }

    public PageResponse<RatingResponseDTO> ratings(Long restaurantId, boolean mine, int page, int size) {
        var request = ReadQuery.page(page, size, Sort.by("ratingId").descending());
        Long customerId = null;
        if (mine) {
            var actor = CurrentActor.get();
            access.profile("CUSTOMER", actor.customerId(), false);
            customerId = actor.customerId();
        }
        requireRestaurant(restaurantId);
        var result = ratings.findRestaurantPage(restaurantId, customerId, request);
        return PageResponse.from(result, result.stream().map(ratingMapping::convertToRatingResponseDTO).toList());
    }

    private void requireRestaurant(Long restaurantId) {
        if (!restaurants.existsById(restaurantId)) throw new ResourceNotFoundException("Restaurant not found");
    }
}
