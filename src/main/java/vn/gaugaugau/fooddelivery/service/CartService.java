package vn.gaugaugau.fooddelivery.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Cart;
import vn.gaugaugau.fooddelivery.model.dto.CartItemResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.CartResponseDTO.RestaurantResponseDTO;
import vn.gaugaugau.fooddelivery.repository.CartRepository;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private static final BigDecimal SHIPPING_FEE = BigDecimal.valueOf(15000);

    // public CartResponseDTO getCart(Cart cart) {
    // RestaurantResponseDTO restaurantResponseDTO = new RestaurantResponseDTO();
    // List<CartItemResponseDTO> cartItemResponseDTOs = new
    // ArrayList<CartItemResponseDTO>();

    // }

}
