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
public class CartItemUpdateRequestDTO extends StrictRequest {

	@NotNull(message = "Quantity cannot be null")
	@Positive(message = "Quantity must be greater than 0")
	@tools.jackson.databind.annotation.JsonDeserialize(using=CartQuantityDeserializer.class)
	private Integer quantity;

	@Size(max = 255, message = "Note cannot exceed 255 characters")
	private String note;
}
