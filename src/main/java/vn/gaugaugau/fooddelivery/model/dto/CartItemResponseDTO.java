package vn.gaugaugau.fooddelivery.model.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class CartItemResponseDTO {
    private Long cartItemId;
    private Long restaurantFoodItemId;
    private String foodItemName;
    private Integer quantity;
    private String note;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}
