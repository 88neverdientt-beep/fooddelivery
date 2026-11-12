package vn.gaugaugau.fooddelivery.web;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import vn.gaugaugau.fooddelivery.controller.*;
import vn.gaugaugau.fooddelivery.service.*;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.utils.GlobalExceptionHandler;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

// Integrates HTTP binding, Bean Validation, controllers and advice; no datasource or app startup.
class ApiBindingUnitTest {
    final CustomerService customers=mock(CustomerService.class);
    final RestaurantFoodItemService menus=mock(RestaurantFoodItemService.class);
    final CartItemService items=mock(CartItemService.class);
    final OrderService orders=mock(OrderService.class);
    MockMvc mvc;
    @BeforeEach void setup() {
        mvc=MockMvcBuilders.standaloneSetup(new CustomerController(customers,mock(vn.gaugaugau.fooddelivery.auth.service.AuthService.class)),
            new RestaurantFoodItemController(menus),new CartItemController(items),new OrderController(orders))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }
    @Test void invalidEmailIs400() throws Exception {
        var response=mvc.perform(post("/customers").contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"User\",\"email\":\"invalid\",\"password\":\"secret\",\"phoneNumber\":\"123\",\"address\":\"Address\"}"))
            .andReturn().getResponse();
        assertEquals(400,response.getStatus()); assertTrue(response.getContentAsString().contains("VALIDATION_ERROR"));
        verifyNoInteractions(customers);
    }
    @Test void missingRequiredFieldsIs400() throws Exception {
        assertEquals(400,mvc.perform(post("/customers").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andReturn().getResponse().getStatus());
        verifyNoInteractions(customers);
    }
    @Test void invalidPricesAndPrecisionAre400() throws Exception {
        for (String price : new String[]{"-1","0","1.001","10000000000"}) {
            assertEquals(400,mvc.perform(post("/restaurant-food-items").contentType(MediaType.APPLICATION_JSON)
                .content("{\"restaurantId\":1,\"foodItemId\":2,\"price\":"+price+"}"))
                .andReturn().getResponse().getStatus());
        }
        verifyNoInteractions(menus);
    }
    @Test void invalidQuantitiesAre400() throws Exception {
        for (String quantity : new String[]{"-1","0","null"}) {
            assertEquals(400,mvc.perform(post("/1/cart-items").contentType(MediaType.APPLICATION_JSON)
                .content("{\"restaurantFoodItemId\":2,\"quantity\":"+quantity+"}"))
                .andReturn().getResponse().getStatus());
        }
        verifyNoInteractions(items);
    }
    @Test void malformedJsonAndEnumAre400() throws Exception {
        assertEquals(400,mvc.perform(post("/customers").contentType(MediaType.APPLICATION_JSON).content("{"))
            .andReturn().getResponse().getStatus());
        assertEquals(400,mvc.perform(patch("/orders/1/status").contentType(MediaType.APPLICATION_JSON).content("\"UNKNOWN\""))
            .andReturn().getResponse().getStatus());
    }
    @Test void missingResourceIs404() throws Exception {
        when(orders.getOrderByOrderId(999L)).thenThrow(new ResourceNotFoundException("Order not found"));
        assertEquals(404,mvc.perform(get("/orders/999")).andReturn().getResponse().getStatus());
    }
    @Test void invalidTransitionIs409() throws Exception {
        when(orders.updateOrderStatus(eq(1L),any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,"Invalid transition"));
        assertEquals(409,mvc.perform(patch("/orders/1/status").contentType(MediaType.APPLICATION_JSON).content("\"COMPLETED\""))
            .andReturn().getResponse().getStatus());
    }
    @Test void internalErrorDoesNotLeakDetails() throws Exception {
        when(orders.getOrderByOrderId(1L)).thenThrow(new IllegalStateException("jdbc:mysql://private-host password=secret"));
        var response=mvc.perform(get("/orders/1")).andReturn().getResponse();
        assertEquals(500,response.getStatus());
        assertFalse(response.getContentAsString().contains("private-host"));
        assertFalse(response.getContentAsString().contains("secret"));
    }
    @Test void validMenuRequestReachesService() throws Exception {
        when(menus.createRestaurantFoodItem(any())).thenReturn(new RestaurantFoodItemResponseDTO());
        assertEquals(201,mvc.perform(post("/restaurant-food-items").contentType(MediaType.APPLICATION_JSON)
            .content("{\"restaurantId\":1,\"foodItemId\":2,\"price\":20000.50}"))
            .andReturn().getResponse().getStatus());
        verify(menus).createRestaurantFoodItem(any());
    }
    @Test void fractionalOrOverflowingCartQuantityNeverReachesEitherWriter()throws Exception {
        for(String quantity:new String[]{"1.5","1.0","1e0","2147483648","9223372036854775808"}) {
            assertEquals(400,mvc.perform(post("/1/cart-items").contentType(MediaType.APPLICATION_JSON).content("{\"restaurantFoodItemId\":2,\"quantity\":"+quantity+"}")).andReturn().getResponse().getStatus());
            assertEquals(400,mvc.perform(put("/cart-items/1").contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":"+quantity+"}")).andReturn().getResponse().getStatus());
        }verifyNoInteractions(items);
    }
    @Test void integralCartQuantityStillReachesTheExistingWriter()throws Exception {
        assertEquals(201,mvc.perform(post("/1/cart-items").contentType(MediaType.APPLICATION_JSON).content("{\"restaurantFoodItemId\":2,\"quantity\":2}")).andReturn().getResponse().getStatus());
        verify(items).addCartItemToCart(eq(1L),argThat(input->input.getQuantity()==2));
    }
    @Test void fractionalCheckoutReferencesNeverReachBusinessWriters()throws Exception {
        for(String id:new String[]{"1.5","1.0","1e0","9223372036854775808"}) {
            assertEquals(400,mvc.perform(post("/customers/1/orders").contentType(MediaType.APPLICATION_JSON).content("{\"deliveryAddress\":\"Hà Nội\",\"paymentMethodId\":"+id+"}")).andReturn().getResponse().getStatus());
            assertEquals(400,mvc.perform(post("/1/cart-items").contentType(MediaType.APPLICATION_JSON).content("{\"restaurantFoodItemId\":"+id+",\"quantity\":1}")).andReturn().getResponse().getStatus());
        }verifyNoInteractions(orders,items);
    }
}
