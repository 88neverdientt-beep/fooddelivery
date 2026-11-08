package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class DeliveryRequestDTO extends StrictRequest {

	@NotNull(message = "Driver ID cannot be null")
	@Positive(message = "Driver ID must be positive")
	private Long driverId;
}
