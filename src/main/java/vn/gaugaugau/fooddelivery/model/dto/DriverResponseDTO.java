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
public class DriverResponseDTO {

	private Long driverId;
	private String name;
	private String email;
	private String phoneNumber;
	private String address;
	private String licensePlate;
	private Boolean driveStatus;
	private LocalDateTime createdAt;

}
