package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryResponseDTO {

	private Long deliveryId;
	private LocalDateTime pickupTime;
	private LocalDateTime deliveredTime;
	private DeliveryStatus deliveryStatus;
	private OrderOutputDTO order;
	private DriverOutputDTO driver;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class OrderOutputDTO {
		private Long orderId;
		private String deliveryAddress;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class DriverOutputDTO {
		private Long driverId;
		private String name;
		private String phoneNumber;
		private String licensePlate;
	}
}
