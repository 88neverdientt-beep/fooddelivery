package vn.gaugaugau.fooddelivery.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.repository.RestaurantRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceAlreadyExistsException;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final PasswordEncoder passwordEncoder;

    private RestaurantResponseDTO restaurantToRestaurantResponseDTO(Restaurant restaurant) {
        RestaurantResponseDTO response = new RestaurantResponseDTO();
        response.setRestaurantId(restaurant.getRestaurantId());
        response.setName(restaurant.getName());
        response.setEmail(restaurant.getEmail());
        response.setPhoneNumber(restaurant.getPhoneNumber());
        response.setAddress(restaurant.getAddress());
        response.setRestaurantStatus(restaurant.getRestaurantStatus());
        response.setCreatedAt(restaurant.getCreatedAt());
        return response;
    }

    public RestaurantResponseDTO createRestaurant(RestaurantRequestDTO request) {
        if (restaurantRepository.existsByEmail(request.getEmail())) {
            throw new ResourceAlreadyExistsException("Email already exists!");
        }
        Restaurant restaurant = new Restaurant();
        restaurant.setName(request.getName());
        restaurant.setEmail(request.getEmail());
        restaurant.setPassword(this.passwordEncoder.encode(request.getPassword()));
        restaurant.setPhoneNumber(request.getPhoneNumber());
        restaurant.setAddress(request.getAddress());
        restaurant.setRestaurantStatus(request.getRestaurantStatus() != null ? request.getRestaurantStatus() : Boolean.TRUE);
        restaurant.setCreatedAt(LocalDateTime.now());

        Restaurant savedRestaurant = restaurantRepository.save(restaurant);
        return restaurantToRestaurantResponseDTO(savedRestaurant);
    }

    public List<RestaurantResponseDTO> getAllRestaurants() {
        List<RestaurantResponseDTO> restaurants = this.restaurantRepository.findAll().stream()
                .map(restaurant -> restaurantToRestaurantResponseDTO(restaurant))
                .collect(Collectors.toList());
        return restaurants;
    }

    public RestaurantResponseDTO getRestaurantById(Long restaurantId) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
        if (restaurant == null) {
            throw new ResourceNotFoundException("Restaurant not found with ID: " + restaurantId);
        }
        return restaurantToRestaurantResponseDTO(restaurant);
    }

    public RestaurantResponseDTO updateRestaurantById(Long restaurantId, RestaurantUpdateRequestDTO request) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found with ID: " + restaurantId));

        restaurant.setName(request.getName());
        restaurant.setPhoneNumber(request.getPhoneNumber());
        restaurant.setAddress(request.getAddress());
        if (request.getRestaurantStatus() != null) {
            restaurant.setRestaurantStatus(request.getRestaurantStatus());
        }

        Restaurant updatedRestaurant = restaurantRepository.save(restaurant);
        return restaurantToRestaurantResponseDTO(updatedRestaurant);
    }

    public RestaurantResponseDTO deleteRestaurantById(Long restaurantId) {
        Restaurant restaurant = restaurantRepository.findById(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found with ID: " + restaurantId));
        this.restaurantRepository.delete(restaurant);
        return restaurantToRestaurantResponseDTO(restaurant);
    }
}
