package vn.gaugaugau.fooddelivery.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Delivery;
import vn.gaugaugau.fooddelivery.model.Driver;
import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.dto.DeliveryRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.DeliveryResponseDTO;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.repository.DeliveryRepository;
import vn.gaugaugau.fooddelivery.repository.DriverRepository;
import vn.gaugaugau.fooddelivery.repository.OrderRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
@Transactional
public class DeliveryService {

	private final DeliveryRepository deliveryRepository;
	private final OrderRepository orderRepository;
	private final DriverRepository driverRepository;
	private final PaymentService paymentService;

	public DeliveryResponseDTO.OrderOutputDTO convertToOrderOutputDTO(Order order) {
		return DeliveryResponseDTO.OrderOutputDTO.builder()
				.orderId(order.getOrderId())
				.deliveryAddress(order.getDeliveryAddress())
				.build();
	}

	public DeliveryResponseDTO.DriverOutputDTO convertToDriverOutputDTO(Driver driver) {
		return DeliveryResponseDTO.DriverOutputDTO.builder()
				.driverId(driver.getDriverId())
				.name(driver.getName())
				.phoneNumber(driver.getPhoneNumber())
				.licensePlate(driver.getLicensePlate())
				.build();
	}

	public DeliveryResponseDTO convertToDeliveryResponseDTO(Delivery delivery) {
		return DeliveryResponseDTO.builder()
				.deliveryId(delivery.getDeliveryId())
				.pickupTime(delivery.getPickupTime())
				.deliveredTime(delivery.getDeliveredTime())
				.deliveryStatus(delivery.getDeliveryStatus())
				.order(convertToOrderOutputDTO(delivery.getOrder()))
				.driver(delivery.getDriver() != null ? convertToDriverOutputDTO(delivery.getDriver()) : null)
				.build();
	}

	public DeliveryResponseDTO createDelivery(Long orderId) {
		Order order = this.orderRepository.findById(orderId)
				.orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));
		if (order.getOrderStatus() != OrderStatus.CONFIRMED) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order must be CONFIRMED");
		}
		if (order.getDelivery() != null) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery already exists for this order");
		}
		Delivery delivery = Delivery.builder()
				.deliveryStatus(DeliveryStatus.PENDING)
				.order(order)
				.build();
		order.setDelivery(delivery);
		this.orderRepository.save(order);
		Delivery savedDelivery = this.deliveryRepository.save(delivery);
		return convertToDeliveryResponseDTO(savedDelivery);
	}

	@Transactional(readOnly = true)
	public List<DeliveryResponseDTO> getAvailableDeliveries() {
		List<Delivery> listDeliveries = this.deliveryRepository
				.findByDeliveryStatusAndDriverIsNull(DeliveryStatus.PENDING);
		return listDeliveries.stream()
				.map(this::convertToDeliveryResponseDTO)
				.collect(Collectors.toList());
	}

	public DeliveryResponseDTO acceptDelivery(Long deliveryId, DeliveryRequestDTO deliveryRequestDTO) {
		Delivery delivery = this.deliveryRepository.findById(deliveryId)
				.orElseThrow(() -> new ResourceNotFoundException("Delivery not found with ID: " + deliveryId));
		if (delivery.getDeliveryStatus() != DeliveryStatus.PENDING) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery is not available to accept");
		}
		if (delivery.getDriver() != null) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Delivery is already accepted by another driver");
		}
		Driver driver = this.driverRepository.findById(deliveryRequestDTO.getDriverId())
				.orElseThrow(() -> new ResourceNotFoundException(
						"Driver not found with ID: " + deliveryRequestDTO.getDriverId()));
		delivery.setDriver(driver);
		Delivery savedDelivery = this.deliveryRepository.save(delivery);
		return convertToDeliveryResponseDTO(savedDelivery);
	}

	public DeliveryResponseDTO updateDeliveryStatus(Long deliveryId, DeliveryStatus newStatus) {
		Delivery delivery = this.deliveryRepository.findById(deliveryId)
				.orElseThrow(() -> new ResourceNotFoundException("Delivery not found with ID: " + deliveryId));
		if (delivery.getDriver() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Delivery hasn't accepted by any driver yet");
		}
		DeliveryStatus currentDeliveryStatus = delivery.getDeliveryStatus();
		boolean validTransition = switch (currentDeliveryStatus) {
			case PENDING -> newStatus == DeliveryStatus.PICKED_UP;
			case PICKED_UP -> newStatus == DeliveryStatus.DELIVERING;
			case DELIVERING -> newStatus == DeliveryStatus.DELIVERED;
			case DELIVERED, CANCELLED -> false;
		};
		if (!validTransition) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Can not change delivery status from " + currentDeliveryStatus + " to " + newStatus);
		}
		if (newStatus == DeliveryStatus.PICKED_UP) {
			if (delivery.getOrder().getOrderStatus() != OrderStatus.READY) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order is not ready for pickup");
			}
			delivery.setPickupTime(LocalDateTime.now());
		}
		if (newStatus == DeliveryStatus.DELIVERING) {
			delivery.getOrder().setOrderStatus(OrderStatus.DELIVERING);
		}
		if (newStatus == DeliveryStatus.DELIVERED) {
			Order order = delivery.getOrder();
			if (order.getOrderStatus() != OrderStatus.DELIVERING) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
						"Order must be DELIVERING to complete delivery");
			}
			if ("COD".equals(order.getPayment().getPaymentMethod().getPaymentMethodCode())) {
				paymentService.confirmCashPayment(order);
			}
			delivery.setDeliveredTime(LocalDateTime.now());
			delivery.getOrder().setOrderStatus(OrderStatus.COMPLETED);
		}
		delivery.setDeliveryStatus(newStatus);
		Delivery savedDelivery = this.deliveryRepository.save(delivery);
		return convertToDeliveryResponseDTO(savedDelivery);
	}

}
