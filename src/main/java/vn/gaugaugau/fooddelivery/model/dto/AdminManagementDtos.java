package vn.gaugaugau.fooddelivery.model.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Explicit ADMIN read projections. Credentials and session material are never selected. */
public final class AdminManagementDtos {
    private AdminManagementDtos() {}
    public record Ref(Long id,String name) {}
    public record AccountRow(Long accountId,String email,String role,String status,LocalDateTime createdAt,Long customerId,Long restaurantId,Long driverId,String name,Long version) {}
    public record CustomerRow(Long customerId,String name,String email,LocalDateTime createdAt,Long accountId,String accountStatus,long orderCount) {}
    public record RestaurantRow(Long restaurantId,String name,String address,Boolean restaurantStatus,LocalDateTime createdAt,Long accountId,String accountStatus,long orderCount,long menuCount) {}
    public record RestaurantDetail(Long restaurantId,String name,String email,String phoneNumber,String address,Boolean restaurantStatus,LocalDateTime createdAt,Long accountId,String accountStatus,long orderCount,long menuCount,Long version) {}
    public record DriverRow(Long driverId,String name,String email,String licensePlate,Boolean driveStatus,LocalDateTime createdAt,Long accountId,String accountStatus,long deliveryCount,long activeDeliveryCount) {}
    public record OrderRow(Long orderId,Ref customer,Ref restaurant,LocalDateTime createdAt,BigDecimal subtotal,BigDecimal shippingFee,BigDecimal totalAmount,String orderStatus,Long paymentId,String paymentStatus,Long deliveryId,String deliveryStatus) {}
    public record DeliveryRow(Long deliveryId,Long orderId,Ref driver,Ref restaurant,String orderStatus,String deliveryStatus,LocalDateTime pickupTime,LocalDateTime deliveredTime,LocalDateTime orderCreatedAt) {}
    public record DeliveryDetail(DeliveryRow delivery,String pickupAddress,String deliveryAddress,String licensePlate,OrderResponseDTO order) {}
    public record PaymentRow(Long paymentId,Long orderId,String methodCode,String methodName,BigDecimal amount,String paymentStatus,LocalDateTime createdAt,LocalDateTime paidAt,LocalDateTime refundedAt,String orderStatus) {}
    public record ReviewRow(Long ratingId,int score,String comment,LocalDateTime createdAt,Ref customer,Ref restaurant) {}
    public record DayCount(LocalDate date,long count) {}
    public record DayMoney(LocalDate date,BigDecimal amount) {}
    public record OrderCohort(long total,Map<String,Long> states,BigDecimal nonCancelledOrderValue,List<DayCount> days) {}
    public record RecordedPayments(long count,BigDecimal foodValue,BigDecimal shippingValue,BigDecimal totalValue,List<DayMoney> days) {}
    public record DeliveryCohort(Map<String,Long> states,long terminalCount,long deliveredCount,BigDecimal deliveredSharePercent) {}
    public record MethodCount(String methodCode,String methodName,long count,long successfulCount) {}
    public record Ranked(Ref subject,long count,long completedCount) {}
    public record Analytics(LocalDate from,LocalDate to,LocalDate businessToday,String timeZone,Map<String,Long> allTimeCounts,OrderCohort orderCohort,RecordedPayments recordedSuccessfulPayments,DeliveryCohort deliveryCohort,List<MethodCount> paymentMethods,List<Ranked> topRestaurants,List<Ranked> topDrivers) {}
}
