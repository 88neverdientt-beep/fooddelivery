package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
public class CartItemRequestDTO extends StrictRequest {

	@NotNull(message = "Restaurant food item ID cannot be null")
	@jakarta.validation.constraints.Positive
	private Long restaurantFoodItemId;

	@NotNull(message = "Quantity cannot be null")
	@Positive(message = "Quantity must be greater than 0")
	private Integer quantity;

	@Size(max = 255, message = "Note cannot exceed 255 characters")
	private String note;
}
