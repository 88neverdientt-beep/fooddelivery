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
import vn.gaugaugau.fooddelivery.model.Delivery;
import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.OrderDetail;
import vn.gaugaugau.fooddelivery.model.Payment;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.dto.OrderDetailResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.OrderRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.OrderResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.OrderUpdateDeliveryAddressRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.PaymentResponseDTO;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.model.enums.PaymentStatus;
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
    private final vn.gaugaugau.fooddelivery.repository.RestaurantFoodItemRepository restaurantFoodItemRepository;
	private final CustomerRepository customerRepository;
	private final RestaurantRepository restaurantRepository;
	private final CartItemRepository cartItemRepository;
	private final OrderRepository orderRepository;
	private final PaymentService paymentService;
	private final DeliveryService deliveryService;
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

	public OrderResponseDTO.DeliveryOutputDTO convertToDeliveryOutputDTO(Delivery delivery) {
		if (delivery == null) return null;
		return OrderResponseDTO.DeliveryOutputDTO.builder()
				.deliveryId(delivery.getDeliveryId())
				.deliveryStatus(delivery.getDeliveryStatus())
				.pickupTime(delivery.getPickupTime() != null ? delivery.getPickupTime() : null)
				.deliveredTime(delivery.getDeliveredTime() != null ? delivery.getDeliveredTime() : null)
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
				.deliveryOutputDTO(convertToDeliveryOutputDTO(order.getDelivery()))
				.paymentResponseDTO(this.paymentService.convertToPaymentResponseDTO(order.getPayment()))
				.build();
	}

	@Transactional
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#customerId,false)")

	public OrderResponseDTO createOrder(Long customerId, OrderRequestDTO orderRequestDTO) {
		Customer customer = this.customerRepository.findLockedById(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
		Cart cart = this.cartRepository.findByCustomer_CustomerId(customerId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Cart not found with ID of customer: " + customerId));
		if (cart.getRestaurant() == null) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Cart is empty");
		}
		Restaurant restaurant = this.restaurantRepository.findById(cart.getRestaurant().getRestaurantId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Restaurant not found with ID: " + cart.getRestaurant().getRestaurantId()));
		List<CartItem> cartItems = this.cartItemRepository.findLockedByCartId(cart.getCartId());
		if (cartItems.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Cart is empty");
		}
		if (!Boolean.TRUE.equals(restaurant.getRestaurantStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Restaurant is inactive");
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
            if (cartItem.getRestaurantFoodItem() == null)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cart item has no menu item");
            var menuItem = restaurantFoodItemRepository.findById(cartItem.getRestaurantFoodItem().getRestaurantFoodItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Menu item not found"));
            cartItem.setRestaurantFoodItem(menuItem);
			if (cartItem.getQuantity() == null || cartItem.getQuantity() <= 0
                || cartItem.getRestaurantFoodItem() == null
                || !Boolean.TRUE.equals(cartItem.getRestaurantFoodItem().getIsAvailable())
                || !restaurant.getRestaurantId().equals(cartItem.getRestaurantFoodItem().getRestaurant().getRestaurantId())
                || cartItem.getRestaurantFoodItem().getPrice() == null
                || cartItem.getRestaurantFoodItem().getPrice().signum() <= 0)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Invalid or unavailable cart item");
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

	@Transactional(readOnly = true)
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#customerId,true)")

	public List<OrderResponseDTO> getAllOrders(Long customerId) {
		List<Order> orders = this.orderRepository.findByCustomer_CustomerId(customerId);
		return orders.stream()
				.map(order -> convertToOrderResponseDTO(order))
				.collect(Collectors.toList());
	}

	@Transactional(readOnly = true)
    @org.springframework.security.access.prepost.PreAuthorize("@access.readOrder(#orderId)")

	public OrderResponseDTO getOrderByOrderId(Long orderId) {
		Order order = this.orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

		return convertToOrderResponseDTO(order);
	}

	@Transactional
    @org.springframework.security.access.prepost.PreAuthorize("@access.customerOrder(#orderId)")

	public OrderResponseDTO updateDeliveryAddress(Long orderId,
			OrderUpdateDeliveryAddressRequestDTO orderUpdateDeliveryAddressRequestDTO) {
		Order order = this.orderRepository.findLockedById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
		if (order.getOrderStatus() != OrderStatus.PENDING && order.getOrderStatus() != OrderStatus.CONFIRMED) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"Cannot update delivery address for order " + orderId);
		}
		order.setDeliveryAddress(orderUpdateDeliveryAddressRequestDTO.getDeliveryAddress());
		Order updatedOrder = this.orderRepository.save(order);
		return convertToOrderResponseDTO(updatedOrder);
	}

	@Transactional
    @org.springframework.security.access.prepost.PreAuthorize("@access.restaurantOrder(#orderId)")

	public OrderResponseDTO updateOrderStatus(Long orderId, OrderStatus newStatus) {
		Order order = orderRepository.findLockedById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Order not found with ID: " + orderId));
		if (newStatus == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        OrderStatus currentStatus = order.getOrderStatus();
        if (currentStatus == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Order has no status");
		boolean validTransition = switch (currentStatus) {
			case PENDING -> newStatus == OrderStatus.CONFIRMED;
			case CONFIRMED -> newStatus == OrderStatus.PREPARING;
			case PREPARING -> newStatus == OrderStatus.READY;
			case READY -> false;
			case DELIVERING -> false;
			case COMPLETED, CANCELLED -> false;
		};
		if (!validTransition) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"Cannot change order status from " + currentStatus + " to " + newStatus);
		}
		if (order.getPayment() == null
            || (order.getPayment().getPaymentStatus() != PaymentStatus.PENDING
                && order.getPayment().getPaymentStatus() != PaymentStatus.SUCCESS)
            || order.getPayment().getAmount() == null || order.getTotalAmount() == null
            || order.getPayment().getAmount().compareTo(order.getTotalAmount()) != 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Order requires a matching valid payment");
        order.setOrderStatus(newStatus);
		this.orderRepository.save(order);
		if (newStatus.equals(OrderStatus.CONFIRMED)) {
			this.deliveryService.createDelivery(orderId);
		}
		return convertToOrderResponseDTO(order);
	}

	@Transactional
    @org.springframework.security.access.prepost.PreAuthorize("@access.cancelOrder(#orderId)")

	public OrderResponseDTO cancelOrder(Long orderId) {
		Order order = orderRepository.findLockedById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Order not found with ID: " + orderId));
		if (order.getOrderStatus() != OrderStatus.PENDING && order.getOrderStatus() != OrderStatus.CONFIRMED) {
			throw new ResponseStatusException(HttpStatus.CONFLICT,
					"Cannot cancel order when status is " + order.getOrderStatus());
		}
		Delivery delivery = order.getDelivery();
		if (delivery != null) {
			if (delivery.getDeliveryStatus() != DeliveryStatus.PENDING) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery cannot be cancelled");
			}
			delivery.setDeliveryStatus(DeliveryStatus.CANCELLED);
		}
		Payment payment = order.getPayment();
		if (payment != null) {
			if (payment.getPaymentStatus() == PaymentStatus.PENDING) {
				payment.setPaymentStatus(PaymentStatus.CANCELLED);
			} else if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
				// Chưa tích hợp hoàn tiền online.
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Paid order requires refund processing");
			}
		}
		order.setOrderStatus(OrderStatus.CANCELLED);
		this.orderRepository.save(order);
		return convertToOrderResponseDTO(order);
	}

}