package vn.gaugaugau.fooddelivery.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.OrderRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.OrderResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.OrderUpdateDeliveryAddressRequestDTO;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.service.OrderService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class OrderController {

	private final OrderService orderService;

	@PostMapping("/customers/{customerId}/orders")
	public ResponseEntity<ApiResponse<OrderResponseDTO>> createOrder(@PathVariable Long customerId,
			@Valid @RequestBody OrderRequestDTO orderRequestDTO) {
		OrderResponseDTO orderResponseDTO = this.orderService.createOrder(customerId, orderRequestDTO);
		return ApiResponse.created(orderResponseDTO);
	}

	@GetMapping("/customers/{customerId}/orders")
	public ResponseEntity<ApiResponse<List<OrderResponseDTO>>> getAllOrders(@PathVariable Long customerId) {
		List<OrderResponseDTO> orderResponseDTOs = this.orderService.getAllOrders(customerId);
		return ApiResponse.success(orderResponseDTOs);
	}

	@GetMapping("/orders/{orderId}")
	public ResponseEntity<ApiResponse<OrderResponseDTO>> getOrderByOrderId(@PathVariable Long orderId) {
		OrderResponseDTO orderResponseDTO = this.orderService.getOrderByOrderId(orderId);
		return ApiResponse.success(orderResponseDTO);
	}

	@PutMapping("/orders/{orderId}/delivery-address")
	public ResponseEntity<ApiResponse<OrderResponseDTO>> updateDeliveryAddress(@PathVariable Long orderId,
			@Valid @RequestBody OrderUpdateDeliveryAddressRequestDTO orderUpdateDeliveryAddressRequestDTO) {
		OrderResponseDTO orderResponseDTO = this.orderService.updateDeliveryAddress(orderId,
				orderUpdateDeliveryAddressRequestDTO);
		return ApiResponse.success(orderResponseDTO);
	}

	@PatchMapping("/orders/{orderId}/status")
	public ResponseEntity<ApiResponse<OrderResponseDTO>> updateOrderStatus(@PathVariable Long orderId,
			@Valid @RequestBody OrderStatus orderStatus) {
		OrderResponseDTO updatedOrderStatus = this.orderService.updateOrderStatus(orderId, orderStatus);
		return ApiResponse.success(updatedOrderStatus);
	}

	@PatchMapping("/orders/{orderId}/cancel")
	public ResponseEntity<ApiResponse<OrderResponseDTO>> cancelOrder(@PathVariable Long orderId) {
		OrderResponseDTO updatedOrderStatus = this.orderService.cancelOrder(orderId);
		return ApiResponse.success(updatedOrderStatus);
	}
}
