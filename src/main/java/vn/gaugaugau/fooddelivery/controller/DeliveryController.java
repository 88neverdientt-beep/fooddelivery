
package vn.gaugaugau.fooddelivery.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.DeliveryRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.DeliveryResponseDTO;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import vn.gaugaugau.fooddelivery.service.DeliveryService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequestMapping("/deliveries")
@RequiredArgsConstructor
public class DeliveryController {

	private final DeliveryService deliveryService;

	@GetMapping("/available")
	public ResponseEntity<ApiResponse<List<vn.gaugaugau.fooddelivery.model.dto.AvailableDelivery>>> getAvailableDeliveries() {
		List<vn.gaugaugau.fooddelivery.model.dto.AvailableDelivery> listAvailableDeliveries = this.deliveryService.getAvailableDeliveries();
		return ApiResponse.success(listAvailableDeliveries);
	}

	@PostMapping("/{deliveryId}/accept")
	public ResponseEntity<ApiResponse<DeliveryResponseDTO>> acceptDelivery(@PathVariable long deliveryId,
			@Valid @RequestBody DeliveryRequestDTO deliveryRequestDTO) {
		DeliveryResponseDTO deliveryResponseDTO = this.deliveryService.acceptDelivery(deliveryId, deliveryRequestDTO);
		return ApiResponse.success(deliveryResponseDTO);
	}

	@PutMapping("/{deliveryId}/status")
	public ResponseEntity<ApiResponse<DeliveryResponseDTO>> updateDeliveryStatus(@PathVariable long deliveryId,
			@Valid @RequestBody DeliveryStatus deliveryStatus) {
		DeliveryResponseDTO deliveryResponseDTO = this.deliveryService.updateDeliveryStatus(deliveryId,
				deliveryStatus);
		return ApiResponse.success(deliveryResponseDTO);
	}
}
