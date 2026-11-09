package vn.gaugaugau.fooddelivery.model.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;

public final class DriverManagementDtos {
    private DriverManagementDtos() {}
    public record Pickup(Long restaurantId, String name, String address) {}
    public record AssignedDelivery(Long deliveryId, Long orderId, Long driverId,
            DeliveryStatus deliveryStatus, OrderStatus orderStatus, LocalDateTime orderCreatedAt,
            LocalDateTime pickupTime, LocalDateTime deliveredTime, Pickup pickup,
            String deliveryAddress, BigDecimal totalAmount, String paymentMethod, String paymentStatus) {}
    public record Detail(Long deliveryId, Long driverId, DeliveryStatus deliveryStatus,
            LocalDateTime pickupTime, LocalDateTime deliveredTime, Pickup pickup, OrderResponseDTO order) {}
    public record DayCount(LocalDate date, long count) {}
    public record Analytics(LocalDate from, LocalDate to, long totalAssignedAllTime, long activeNow,
            Map<String, Long> statesAllTime, long completedInPeriod, long pickedUpInPeriod,
            List<DayCount> completedByDay, List<DayCount> pickedUpByDay,
            Double averagePickupToDeliveredMinutes) {}
}
