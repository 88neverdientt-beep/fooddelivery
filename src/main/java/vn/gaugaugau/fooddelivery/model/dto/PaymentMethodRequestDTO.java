package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.NotBlank;
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
public class PaymentMethodRequestDTO {

	@NotBlank(message = "Method name cannot be blank")
	@Size(max = 50, message = "Method name must not exceed 50 characters")
	private String methodName;

	@NotBlank(message = "Method code cannot be blank")
	@Size(max = 30, message = "Method code must not exceed 30 characters")
	private String methodCode;
}
