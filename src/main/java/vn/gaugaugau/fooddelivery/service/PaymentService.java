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
// Locking reads and ORM refresh must see the latest committed relationship state.
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class PaymentService {

	private final PaymentRepository paymentRepository;
	private final PaymentMethodRepository paymentMethodRepository;
	private final OrderRepository orderRepository;

	public PaymentResponseDTO convertToPaymentResponseDTO(Payment payment) {
		if (payment == null) return null;
		return PaymentResponseDTO.builder()
				.paymentId(payment.getPaymentId())
				.paymentMethod(payment.getPaymentMethod() == null ? null : payment.getPaymentMethod().getPaymentMethodCode())
				.paymentStatus(payment.getPaymentStatus())
				.amount(payment.getAmount())
				.paidAt(payment.getPaidAt())
				.refundedAt(payment.getRefundedAt())
				.build();
	}
    @org.springframework.security.access.prepost.PreAuthorize("@access.customerOrder(#orderId)")


	public PaymentResponseDTO createPayment(Long paymentMethodId, Long orderId) {
		PaymentMethod paymentMethod = this.paymentMethodRepository.findById(paymentMethodId).orElseThrow(
				() -> new ResourceNotFoundException("Payment Method not found with ID = " + paymentMethodId));
		if (!Boolean.TRUE.equals(paymentMethod.getIsActive())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"Payment Method " + paymentMethod.getPaymentMethodCode() + " is not active");
		}
		Order order = this.orderRepository.findLockedById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID = " + orderId));
		if (order.getPayment() != null) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Order already has a payment");
		}
		if (order.getOrderStatus() != vn.gaugaugau.fooddelivery.model.enums.OrderStatus.PENDING
            || order.getTotalAmount() == null || order.getTotalAmount().signum() <= 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Order cannot be paid");
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

	@Transactional(readOnly = true)
    @org.springframework.security.access.prepost.PreAuthorize("@access.readOrder(#orderId)")

	public PaymentResponseDTO getPaymentByOrderId(Long orderId) {
		Order order = this.orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID = " + orderId));
		if (order.getPayment() == null) throw new ResourceNotFoundException("Payment not found");
		return convertToPaymentResponseDTO(order.getPayment());
	}
    @org.springframework.security.access.prepost.PreAuthorize("@access.driverOrder(#order.orderId)")


	public void confirmCashPayment(Order order) {
		Order lockedOrder = orderRepository.findLockedById(order.getOrderId())
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        Payment payment = lockedOrder.getPayment();
		if (payment == null) {
			throw new ResourceNotFoundException("Payment not found for order ID: " + order.getOrderId());
		}
		if (payment.getPaymentMethod() == null || !"COD".equals(payment.getPaymentMethod().getPaymentMethodCode())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment method is not COD");
		}
		if (payment.getPaymentStatus() != PaymentStatus.PENDING) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment is not pending");
		}
		if (lockedOrder.getOrderStatus() != vn.gaugaugau.fooddelivery.model.enums.OrderStatus.DELIVERING
            || payment.getAmount() == null || lockedOrder.getTotalAmount() == null
            || payment.getAmount().compareTo(lockedOrder.getTotalAmount()) != 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment does not match delivering order");
        payment.setPaymentStatus(PaymentStatus.SUCCESS);
		payment.setPaidAt(LocalDateTime.now());
		this.paymentRepository.save(payment);
	}
}
