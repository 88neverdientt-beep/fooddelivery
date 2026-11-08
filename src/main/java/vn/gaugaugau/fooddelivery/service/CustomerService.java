package vn.gaugaugau.fooddelivery.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.model.dto.CustomerRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.CustomerResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.CustomerUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.repository.CustomerRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceAlreadyExistsException;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@org.springframework.transaction.annotation.Transactional
@Service
@RequiredArgsConstructor
public class CustomerService {

	private final CustomerRepository customerRepository;
	private final PasswordEncoder passwordEncoder;
    private final vn.gaugaugau.fooddelivery.auth.service.AuthService authService;

	private CustomerResponseDTO customerToCustomerResponseDTO(Customer customer) {
		CustomerResponseDTO response = new CustomerResponseDTO();
		response.setCustomerId(customer.getCustomerId());
		response.setName(customer.getName());
		response.setEmail(customer.getEmail());
		response.setPhoneNumber(customer.getPhoneNumber());
		response.setAddress(customer.getAddress());
		response.setCreatedAt(customer.getCreatedAt());
		return response;
	}
    @org.springframework.security.access.prepost.PreAuthorize("denyAll()")


	public CustomerResponseDTO createCustomer(CustomerRequestDTO request) {
		if (customerRepository.existsByEmail(request.getEmail())) {
			throw new ResourceAlreadyExistsException("Email already exists!");
		}
		Customer customer = new Customer();
		customer.setName(request.getName());
		customer.setEmail(request.getEmail());
		customer.setPassword(this.passwordEncoder.encode(request.getPassword()));
		customer.setPhoneNumber(request.getPhoneNumber());
		customer.setAddress(request.getAddress());
		customer.setCreatedAt(LocalDateTime.now());
		Customer savedCustomer = customerRepository.save(customer);
		return customerToCustomerResponseDTO(savedCustomer);
	}
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")


	public List<CustomerResponseDTO> getAllCustomers() {
		List<CustomerResponseDTO> customers = this.customerRepository.findAll().stream()
				.map(customer -> customerToCustomerResponseDTO(customer))
				.collect(Collectors.toList());
		return customers;
	}
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#customerId,true)")


	public CustomerResponseDTO getCustomerById(Long customerId) {
		Customer customer = customerRepository.findById(customerId).orElse(null);
		if (customer == null) {
			throw new ResourceNotFoundException("Customer not found with ID: " + customerId);
		}
		return customerToCustomerResponseDTO(customer);
	}
    @org.springframework.security.access.prepost.PreAuthorize("@access.profile('CUSTOMER',#customerId,true)")


	public CustomerResponseDTO updateCustomerById(Long customerId, CustomerUpdateRequestDTO request) {
		Customer customer = customerRepository.findById(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

		customer.setName(request.getName());
		customer.setPhoneNumber(request.getPhoneNumber());
		customer.setAddress(request.getAddress());

		Customer updatedCustomer = customerRepository.save(customer);
		return customerToCustomerResponseDTO(updatedCustomer);
	}
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")


	public CustomerResponseDTO deleteCustomerById(Long customerId) {
		Customer customer = customerRepository.findById(customerId)
				.orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
		authService.disableProfile(vn.gaugaugau.fooddelivery.auth.model.Role.CUSTOMER, customerId);
		return customerToCustomerResponseDTO(customer);
	}

}
