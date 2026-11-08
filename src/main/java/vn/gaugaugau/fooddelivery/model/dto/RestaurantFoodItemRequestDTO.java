package vn.gaugaugau.fooddelivery.model.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
public class RestaurantFoodItemRequestDTO {

	@NotNull(message = "Price cannot be null")
	@DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
	@jakarta.validation.constraints.Digits(integer = 10, fraction = 2)
	private BigDecimal price;

	private Boolean isAvailable;

	@NotNull(message = "Restaurant ID cannot be null")
	@jakarta.validation.constraints.Positive
	private Long restaurantId;

	@NotNull(message = "Food item ID cannot be null")
	@jakarta.validation.constraints.Positive
	private Long foodItemId;
}
