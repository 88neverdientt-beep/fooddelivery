package vn.gaugaugau.fooddelivery.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.PaymentResponseDTO;
import vn.gaugaugau.fooddelivery.service.PaymentService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class PaymentController {

	private final PaymentService paymentService;

	@GetMapping("/orders/{orderId}/payment")
	public ResponseEntity<ApiResponse<PaymentResponseDTO>> getPaymentByOrderId(@PathVariable Long orderId) {
		PaymentResponseDTO payment = this.paymentService.getPaymentByOrderId(orderId);
		return ApiResponse.success(payment);
	}
}
