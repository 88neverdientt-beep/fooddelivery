package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDetailRequestDTO {

    @NotNull(message = "Order ID cannot be null")
    private Long orderId;

    @NotNull(message = "Food item ID cannot be null")
    private Long foodItemId;

    @NotNull(message = "Quantity cannot be null")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotNull(message = "Unit price cannot be null")
    @DecimalMin(value = "0.0", inclusive = false, message = "Unit price must be greater than 0")
    private BigDecimal unitPrice;

    @DecimalMin(value = "0.0", inclusive = false, message = "Subtotal must be greater than 0")
    private BigDecimal subtotal;

    @Size(max = 255, message = "Note must not exceed 255 characters")
    private String note;
}
