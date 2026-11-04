package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class OrderRequestDTO {

	@NotBlank(message = "Delivery address cannot be blank")
	@Size(max = 255, message = "Delivery address must not exceed 255 characters")
	private String deliveryAddress;

	@NotNull(message = "Payment method ID cannot be null")
	private Long paymentMethodId;
}
