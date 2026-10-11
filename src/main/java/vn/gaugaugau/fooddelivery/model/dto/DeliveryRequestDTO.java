package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.NotNull;
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
public class DeliveryRequestDTO {

    @NotNull(message = "Order ID cannot be null")
    private Long orderId;

    private Long driverId;

    private LocalDateTime pickupTime;

    private LocalDateTime deliveredTime;

    private DeliveryStatus deliveryStatus;
}
