package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingResponseDTO {

    private Long ratingId;
    private Integer ratingScore;
    private String comment;
    private LocalDateTime createdAt;
    private CustomerOutputDTO customer;
    private FoodItemOutputDTO foodItem;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerOutputDTO {
        private Long customerId;
        private String name;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FoodItemOutputDTO {
        private Long itemId;
        private String name;
    }
}
