package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantResponseDTO {

	private Long restaurantId;
	private String name;
	private String email;
	private String phoneNumber;
	private String address;
	private Boolean restaurantStatus;
	private LocalDateTime createdAt;

}
