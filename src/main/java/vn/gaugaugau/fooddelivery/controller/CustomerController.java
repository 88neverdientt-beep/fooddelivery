package vn.gaugaugau.fooddelivery.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.CustomerRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.CustomerResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.CustomerUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.service.CustomerService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class CustomerController {

	private final CustomerService customerService;
    private final vn.gaugaugau.fooddelivery.auth.service.AuthService authService;

	@PostMapping("/customers")
	public ResponseEntity<?> createCustomer(
			@Valid @RequestBody CustomerRequestDTO request) {
		var response = this.authService.registerCustomer(request);
		return ApiResponse.created(response);
	}

	@GetMapping("/customers")
	public ResponseEntity<ApiResponse<List<CustomerResponseDTO>>> getAllCustomers() {
		List<CustomerResponseDTO> response = this.customerService.getAllCustomers();
		return ApiResponse.success(response);
	}

	@GetMapping("/customers/{customerId}")
	public ResponseEntity<ApiResponse<CustomerResponseDTO>> getCustomerById(@PathVariable Long customerId) {
		CustomerResponseDTO response = this.customerService.getCustomerById(customerId);
		return ApiResponse.success(response);
	}

	@PutMapping("/customers/{customerId}")
	public ResponseEntity<ApiResponse<CustomerResponseDTO>> updateCustomerById(@PathVariable Long customerId,
			@Valid @RequestBody CustomerUpdateRequestDTO request) {
		CustomerResponseDTO response = this.customerService.updateCustomerById(customerId, request);
		return ApiResponse.success(response);
	}

	@DeleteMapping("/customers/{customerId}")
	public ResponseEntity<ApiResponse<String>> deleteCustomerById(@PathVariable Long customerId) {
		this.customerService.deleteCustomerById(customerId);
		return ApiResponse.success("delete succesful");
	}
}
