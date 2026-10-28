package vn.gaugaugau.fooddelivery.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.model.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponseDTO {

	private Long paymentId;
	private LocalDateTime paidAt;
	private String transactionCode;
	private PaymentStatus paymentStatus;
	private OrderOutputDTO order;
	private PaymentMethodOutputDTO paymentMethod;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class OrderOutputDTO {
		private Long orderId;
		private BigDecimal totalAmount;
		private OrderStatus orderStatus;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class PaymentMethodOutputDTO {
		private Long methodId;
		private String methodName;
		private String methodCode;
	}
}
