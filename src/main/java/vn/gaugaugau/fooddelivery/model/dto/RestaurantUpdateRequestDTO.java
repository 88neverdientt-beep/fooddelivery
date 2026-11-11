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
public class RestaurantUpdateRequestDTO extends StrictRequest {

    @jakarta.validation.constraints.PositiveOrZero
    private Long expectedVersion;

	@NotBlank(message = "Name cannot be blank")
	@Size(max = 150, message = "Name must not exceed 150 characters")
	private String name;

	@NotBlank(message = "Phone number cannot be blank")
	@Size(max = 15, message = "Phone number must not exceed 15 characters")
	private String phoneNumber;

	@NotBlank(message = "Address cannot be blank")
	@Size(max = 255, message = "Address must not exceed 255 characters")
	private String address;

	private Boolean restaurantStatus;
}
