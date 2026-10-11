package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodItemResponseDTO {

    private Long itemId;
    private String name;
    private String category;
    private BigDecimal price;
    private Boolean isAvailable;
    private List<RestaurantOutputDTO> restaurants;
    private List<RatingOutputDTO> ratings;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RestaurantOutputDTO {
        private Long restaurantId;
        private String name;
        private String address;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RatingOutputDTO {
        private Long ratingId;
        private Integer ratingScore;
        private String comment;
        private LocalDateTime createdAt;
    }
}
