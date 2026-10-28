package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.gaugaugau.fooddelivery.model.enums.PaymentStatus;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequestDTO {

	@NotNull(message = "Order ID cannot be null")
	private Long orderId;

	@NotNull(message = "Payment method ID cannot be null")
	private Long methodId;

	@Size(max = 100, message = "Transaction code must not exceed 100 characters")
	private String transactionCode;

	private PaymentStatus paymentStatus;
}
