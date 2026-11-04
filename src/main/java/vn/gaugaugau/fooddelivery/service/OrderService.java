package vn.gaugaugau.fooddelivery.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Cart;
import vn.gaugaugau.fooddelivery.model.CartItem;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.OrderDetail;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.dto.OrderDetailResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.OrderRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.OrderResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.PaymentResponseDTO;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.repository.CartItemRepository;
import vn.gaugaugau.fooddelivery.repository.CartRepository;
import vn.gaugaugau.fooddelivery.repository.CustomerRepository;
import vn.gaugaugau.fooddelivery.repository.OrderRepository;
import vn.gaugaugau.fooddelivery.repository.RestaurantRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class OrderService {

	private final CartRepository cartRepository;
	private final CustomerRepository customerRepository;
	private final RestaurantRepository restaurantRepository;
	private final CartItemRepository cartItemRepository;
	private final OrderRepository orderRepository;
	private final PaymentService paymentService;
	private static final BigDecimal SHIPPING_FEE = BigDecimal.valueOf(15000);

	public OrderResponseDTO.CustomerOutputDTO convertToCustomerOutputDTO(Customer customer) {
		return OrderResponseDTO.CustomerOutputDTO.builder()
				.customerId(customer.getCustomerId())
				.name(customer.getName())
				.build();
	}

	public OrderResponseDTO.RestaurantOutputDTO convertToRestaurantOutputDTO(Restaurant restaurant) {
		return OrderResponseDTO.RestaurantOutputDTO.builder()
				.restaurantId(restaurant.getRestaurantId())
				.name(restaurant.getName())
				.build();
	}

	public OrderResponseDTO convertToOrderResponseDTO(Order order) {
		return OrderResponseDTO.builder()
				.orderId(order.getOrderId())
				.deliveryAddress(order.getDeliveryAddress())
				.subtotal(order.getSubtotal())
				.shippingFee(order.getShippingFee())
				.totalAmount(order.getTotalAmount())
				.orderStatus(order.getOrderStatus())
				.createdAt(order.getCreatedAt())
				.customer(convertToCustomerOutputDTO(order.getCustomer()))
				.restaurant(convertToRestaurantOutputDTO(order.getRestaurant()))
				.orderDetails(order.getOrderDetails()
						.stream()
						.map(orderDetail -> OrderDetailResponseDTO.builder()
								.orderDetailId(orderDetail.getOrderDetailId())
								.foodItemName(orderDetail.getRestaurantFoodItem().getFoodItem().getName())
								.quantity(orderDetail.getQuantity())
								.unitPrice(orderDetail.getUnitPrice())
								.subtotalItem(orderDetail.getSubtotal())
								.note(orderDetail.getNote())
								.build())
						.collect(Collectors.toList()))
				.paymentResponseDTO(this.paymentService.convertToPaymentResponseDTO(order.getPayment()))
				.build();
	}

	@Transactional
	public OrderResponseDTO createOrder(Long customerId, OrderRequestDTO orderRequestDTO) {
		Customer customer = this.customerRepository.findById(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
		Cart cart = this.cartRepository.findByCustomer_CustomerId(customerId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Cart not found with ID of customer: " + customerId));
		if (cart.getRestaurant() == null) {
			throw new ResourceNotFoundException("Cart does not belong to any restaurant");
		}
		Restaurant restaurant = this.restaurantRepository.findById(cart.getRestaurant().getRestaurantId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Restaurant not found with ID: " + cart.getRestaurant().getRestaurantId()));
		List<CartItem> cartItems = this.cartItemRepository.findByCart_CartId(cart.getCartId());
		if (cartItems.isEmpty()) {
			throw new ResourceNotFoundException("Cart items not found in cart: " + cart.getCartId());
		}
		Order order = Order.builder()
				.deliveryAddress(orderRequestDTO.getDeliveryAddress())
				.orderStatus(OrderStatus.PENDING)
				.customer(customer)
				.restaurant(restaurant)
				.shippingFee(SHIPPING_FEE)
				.build();
		BigDecimal subtotal = BigDecimal.ZERO;
		List<OrderDetail> orderDetails = new ArrayList<>();
		for (CartItem cartItem : cartItems) {
			BigDecimal quantity = BigDecimal.valueOf(cartItem.getQuantity());
			BigDecimal unitPrice = cartItem.getRestaurantFoodItem().getPrice();
			BigDecimal subtotalItem = quantity.multiply(unitPrice);
			subtotal = subtotal.add(subtotalItem);
			OrderDetail orderDetail = OrderDetail.builder()
					.order(order)
					.restaurantFoodItem(cartItem.getRestaurantFoodItem())
					.quantity(cartItem.getQuantity())
					.unitPrice(unitPrice)
					.subtotal(subtotalItem)
					.note(cartItem.getNote())
					.build();
			orderDetails.add(orderDetail);
		}
		order.setSubtotal(subtotal);
		order.setTotalAmount(subtotal.add(SHIPPING_FEE));
		order.setOrderDetails(orderDetails);
		Order savedOrder = this.orderRepository.save(order);
		PaymentResponseDTO paymentResponseDTO = this.paymentService.createPayment(orderRequestDTO.getPaymentMethodId(),
				savedOrder.getOrderId());
		this.cartItemRepository.deleteAll(cartItems);
		cart.setRestaurant(null);
		this.cartRepository.save(cart);
		List<OrderDetailResponseDTO> orderDetailResponseDTOs = savedOrder.getOrderDetails().stream()
				.map(orderDetail -> OrderDetailResponseDTO.builder()
						.orderDetailId(orderDetail.getOrderDetailId())
						.foodItemName(orderDetail.getRestaurantFoodItem().getFoodItem().getName())
						.quantity(orderDetail.getQuantity())
						.unitPrice(orderDetail.getUnitPrice())
						.subtotalItem(orderDetail.getSubtotal())
						.note(orderDetail.getNote())
						.build())
				.collect(Collectors.toList());
		return OrderResponseDTO.builder()
				.orderId(savedOrder.getOrderId())
				.deliveryAddress(savedOrder.getDeliveryAddress())
				.subtotal(savedOrder.getSubtotal())
				.shippingFee(savedOrder.getShippingFee())
				.totalAmount(savedOrder.getTotalAmount())
				.orderStatus(savedOrder.getOrderStatus())
				.createdAt(savedOrder.getCreatedAt())
				.customer(convertToCustomerOutputDTO(customer))
				.restaurant(convertToRestaurantOutputDTO(restaurant))
				.orderDetails(orderDetailResponseDTOs)
				.paymentResponseDTO(paymentResponseDTO)
				.build();
	}

	@Transactional
	public List<OrderResponseDTO> getAllOrders(Long customerId) {
		List<Order> orders = this.orderRepository.findByCustomer_CustomerId(customerId);
		return orders.stream()
				.map(order -> convertToOrderResponseDTO(order))
				.collect(Collectors.toList());
	}

	@Transactional
	public OrderResponseDTO getOrderByOrderId(Long orderId) {
		Order order = this.orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

		return convertToOrderResponseDTO(order);
	}

	@Transactional
	public OrderResponseDTO updateDeliveryAddress(Long orderId, OrderRequestDTO orderRequestDTO) {
		Order order = this.orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
		if (order.getOrderStatus() != OrderStatus.PENDING && order.getOrderStatus() != OrderStatus.CONFIRMED) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Cannot update delivery address for order " + orderId);
		}
		order.setDeliveryAddress(orderRequestDTO.getDeliveryAddress());
		Order updatedOrder = this.orderRepository.save(order);
		return convertToOrderResponseDTO(updatedOrder);
	}

	@Transactional
	public OrderResponseDTO updateOrderStatus(Long orderId, OrderStatus newStatus) {
		Order order = orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Order not found with ID: " + orderId));
		OrderStatus currentStatus = order.getOrderStatus();
		boolean validTransition = switch (currentStatus) {
			case PENDING -> newStatus == OrderStatus.CONFIRMED;
			case CONFIRMED -> newStatus == OrderStatus.PREPARING;
			case PREPARING -> newStatus == OrderStatus.READY;
			case READY -> newStatus == OrderStatus.DELIVERING;
			case DELIVERING -> newStatus == OrderStatus.COMPLETED;
			case COMPLETED, CANCELLED -> false;
		};
		if (!validTransition) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Cannot change order status from " + currentStatus + " to " + newStatus);
		}
		order.setOrderStatus(newStatus);
		this.orderRepository.save(order);
		return convertToOrderResponseDTO(order);
	}

	@Transactional
	public OrderResponseDTO cancelOrder(Long orderId) {
		Order order = orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Order not found with ID: " + orderId));
		if (order.getOrderStatus() != OrderStatus.PENDING && order.getOrderStatus() != OrderStatus.CONFIRMED) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Cannot cancel order when status is " + order.getOrderStatus());
		}
		order.setOrderStatus(OrderStatus.CANCELLED);
		this.orderRepository.save(order);
		return convertToOrderResponseDTO(order);
	}

}