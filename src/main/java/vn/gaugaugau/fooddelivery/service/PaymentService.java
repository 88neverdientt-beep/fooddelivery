package vn.gaugaugau.fooddelivery.service;

import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.Payment;
import vn.gaugaugau.fooddelivery.model.PaymentMethod;
import vn.gaugaugau.fooddelivery.model.dto.PaymentResponseDTO;
import vn.gaugaugau.fooddelivery.model.enums.PaymentStatus;
import vn.gaugaugau.fooddelivery.repository.OrderRepository;
import vn.gaugaugau.fooddelivery.repository.PaymentMethodRepository;
import vn.gaugaugau.fooddelivery.repository.PaymentRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

	private final PaymentRepository paymentRepository;
	private final PaymentMethodRepository paymentMethodRepository;
	private final OrderRepository orderRepository;

	public PaymentResponseDTO convertToPaymentResponseDTO(Payment payment) {
		return PaymentResponseDTO.builder()
				.paymentId(payment.getPaymentId())
				.paymentMethod(payment.getPaymentMethod().getPaymentMethodCode())
				.paymentStatus(payment.getPaymentStatus())
				.amount(payment.getAmount())
				.paidAt(payment.getPaidAt())
				.refundedAt(payment.getRefundedAt())
				.build();
	}

	public PaymentResponseDTO createPayment(Long paymentMethodId, Long orderId) {
		PaymentMethod paymentMethod = this.paymentMethodRepository.findById(paymentMethodId).orElseThrow(
				() -> new ResourceNotFoundException("Payment Method not found with ID = " + paymentMethodId));
		if (!Boolean.TRUE.equals(paymentMethod.getIsActive())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Payment Method " + paymentMethod.getPaymentMethodCode() + " is not active");
		}
		Order order = this.orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID = " + orderId));
		if (order.getPayment() != null) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Order already has a payment");
		}
		Payment payment = Payment.builder()
				.amount(order.getTotalAmount())
				.paymentStatus(PaymentStatus.PENDING)
				.order(order)
				.paymentMethod(paymentMethod)
				.build();
		Payment savedPayment = this.paymentRepository.save(payment);
		order.setPayment(savedPayment);
		this.orderRepository.save(order);
		return convertToPaymentResponseDTO(savedPayment);
	}

	public PaymentResponseDTO getPaymentByOrderId(Long orderId) {
		Order order = this.orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID = " + orderId));
		return convertToPaymentResponseDTO(order.getPayment());
	}

	public void confirmCashPayment(Order order) {
		Payment payment = order.getPayment();
		if (payment == null) {
			throw new ResourceNotFoundException("Payment not found for order ID: " + order.getOrderId());
		}
		if (!"COD".equals(payment.getPaymentMethod().getPaymentMethodCode())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment method is not COD");
		}
		if (payment.getPaymentStatus() != PaymentStatus.PENDING) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment is not pending");
		}
		payment.setPaymentStatus(PaymentStatus.SUCCESS);
		payment.setPaidAt(LocalDateTime.now());
		this.paymentRepository.save(payment);
	}
}
