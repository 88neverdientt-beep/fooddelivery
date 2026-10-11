package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequestDTO {

    @NotNull(message = "Customer ID cannot be null")
    private Long customerId;

    @NotNull(message = "Restaurant ID cannot be null")
    private Long restaurantId;

    @NotBlank(message = "Delivery address cannot be blank")
    @Size(max = 255, message = "Delivery address must not exceed 255 characters")
    private String deliveryAddress;

    @DecimalMin(value = "0.0", inclusive = true, message = "Shipping fee must be greater than or equal to 0")
    private BigDecimal shippingFee;

    @NotEmpty(message = "Order details cannot be empty")
    @Valid
    private List<OrderDetailInputDTO> orderDetails;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderDetailInputDTO {

        @NotNull(message = "Food item ID cannot be null")
        private Long foodItemId;

        @NotNull(message = "Quantity cannot be null")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        @Size(max = 255, message = "Note must not exceed 255 characters")
        private String note;
    }
}
