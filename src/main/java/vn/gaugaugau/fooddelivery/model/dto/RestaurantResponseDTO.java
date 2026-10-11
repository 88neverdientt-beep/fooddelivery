package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantResponseDTO {

    private Long restaurantId;
    private String name;
    private String email;
    private String phoneNumber;
    private String address;
    private Boolean restaurantStatus;
    private LocalDateTime createdAt;
    private List<OrderOutputDTO> orders;
    private List<FoodItemOutputDTO> foodItems;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderOutputDTO {
        private Long orderId;
        private String deliveryAddress;
        private BigDecimal totalAmount;
        private OrderStatus orderStatus;
        private LocalDateTime createdAt;
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
        private BigDecimal price;
        private Boolean isAvailable;
    }
}
