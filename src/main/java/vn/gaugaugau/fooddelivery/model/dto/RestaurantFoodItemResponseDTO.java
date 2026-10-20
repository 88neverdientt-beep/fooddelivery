package vn.gaugaugau.fooddelivery.model.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantFoodItemResponseDTO {

    private Long restaurantFoodItemId;
    private BigDecimal price;
    private Boolean isAvailable;
    private RestaurantOutputDTO restaurant;
    private FoodItemOutputDTO foodItem;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RestaurantOutputDTO {
        private Long restaurantId;
        private String name;
        private String address;
        private String phoneNumber;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FoodItemOutputDTO {
        private Long itemId;
        private String name;
        private String category;
        private String description;
    }
}
