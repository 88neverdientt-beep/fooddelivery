package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponseDTO {

    private Long customerId;
    private String name;
    private String email;
    private String phoneNumber;
    private String address;
    private LocalDateTime createdAt;
    private List<OrderOutputDTO> orders;
    private List<RatingOutputDTO> ratings;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderOutputDTO {
        private Long orderId;
        private String deliveryAddress;
        private BigDecimal totalAmount;
        private OrderStatus orderStatus;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RatingOutputDTO {
        private Long ratingId;
        private Integer ratingScore;
        private String comment;
        private LocalDateTime createdAt;
    }
}
