package vn.gaugaugau.fooddelivery.model.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CartResponseDTO {
    private Long cartId;
    private RestaurantResponseDTO restaurant;
    private List<CartItemResponseDTO> cartItems;
    private Integer totalItems;
    private BigDecimal subtotal;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RestaurantResponseDTO {
        private Long restaurantId;
        private String name;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CartItemResponseDTO {
        private Long cartItemId;
        private Long restaurantFoodItemId;
        private String foodItemName;
        private Integer quantity;
        private String note;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
}
