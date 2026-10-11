package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;

import java.time.LocalDateTime;
import java.util.List;

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
    private List<DeliveryOutputDTO> deliveries;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeliveryOutputDTO {
        private Long deliveryId;
        private LocalDateTime pickupTime;
        private LocalDateTime deliveredTime;
        private DeliveryStatus deliveryStatus;
    }
}
