package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.model.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponseDTO {

    private Long orderId;
    private String deliveryAddress;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private OrderStatus orderStatus;
    private LocalDateTime createdAt;
    private CustomerOutputDTO customer;
    private RestaurantOutputDTO restaurant;
    private List<OrderDetailOutputDTO> orderDetails;
    private DeliveryOutputDTO delivery;
    private PaymentOutputDTO payment;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerOutputDTO {
        private Long customerId;
        private String name;
        private String phoneNumber;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RestaurantOutputDTO {
        private Long restaurantId;
        private String name;
        private String address;
        private String phoneNumber;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderDetailOutputDTO {
        private Long orderDetailId;
        private Long foodItemId;
        private String foodItemName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
        private String note;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeliveryOutputDTO {
        private Long deliveryId;
        private DeliveryStatus deliveryStatus;
        private LocalDateTime pickupTime;
        private LocalDateTime deliveredTime;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentOutputDTO {
        private Long paymentId;
        private PaymentStatus paymentStatus;
        private String transactionCode;
        private LocalDateTime paidAt;
    }
}
