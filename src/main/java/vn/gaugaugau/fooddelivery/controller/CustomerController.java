package vn.gaugaugau.fooddelivery.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.CustomerRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.CustomerResponseDTO;
import vn.gaugaugau.fooddelivery.service.CustomerService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping("/customers")
    public ResponseEntity<ApiResponse<CustomerResponseDTO>> createCustomer(
            @Valid @RequestBody CustomerRequestDTO request) {
        CustomerResponseDTO response = customerService.createCustomer(request);
        return ApiResponse.created(response);
    }

    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<List<CustomerResponseDTO>>> getAllCustomers() {
        List<CustomerResponseDTO> response = customerService.getAllCustomers();
        return ApiResponse.success(response);
    }
}
