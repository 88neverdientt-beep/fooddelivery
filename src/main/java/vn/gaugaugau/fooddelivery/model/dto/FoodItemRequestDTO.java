package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
public class FoodItemRequestDTO {

    @NotBlank(message = "Name cannot be blank")
    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;

    @Size(max = 150, message = "Category must not exceed 150 characters")
    private String category;

    @NotNull(message = "Price cannot be null")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    private BigDecimal price;

    private Boolean isAvailable;

    private List<Long> restaurantIds;
}
