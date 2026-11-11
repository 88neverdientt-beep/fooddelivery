package vn.gaugaugau.fooddelivery.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.model.enums.*;
import vn.gaugaugau.fooddelivery.repository.*;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

class BackendServiceTest {
    final CustomerRepository customers = mock(CustomerRepository.class);
    final CartRepository carts = mock(CartRepository.class);
    final CartItemRepository items = mock(CartItemRepository.class);
    final RestaurantRepository restaurants = mock(RestaurantRepository.class);
    final RestaurantFoodItemRepository menus = mock(RestaurantFoodItemRepository.class);
    final OrderRepository orders = mock(OrderRepository.class);
    final DeliveryRepository deliveries = mock(DeliveryRepository.class);
    final DriverRepository drivers = mock(DriverRepository.class);
    final PaymentRepository payments = mock(PaymentRepository.class);
    final PaymentMethodRepository methods = mock(PaymentMethodRepository.class);
    final PaymentService paymentService = new PaymentService(payments, methods, orders);
    final jakarta.persistence.EntityManager entityManager = mock(jakarta.persistence.EntityManager.class);
    final DeliveryService deliveryService = new DeliveryService(deliveries, entityManager, orders, drivers, paymentService);
    final OrderService orderService = new OrderService(carts, menus, customers, restaurants, items, orders, paymentService, deliveryService, deliveries, entityManager);
    final CartItemService itemService = new CartItemService(items, carts, customers, menus);
    final CartService cartService = new CartService(carts, customers, itemService);
    Customer customer;
    Restaurant restaurant;
    RestaurantFoodItem menu;
    Cart cart;
    CartItem item;
    Order order;
    PaymentMethod method;
    Delivery delivery;

    @BeforeEach void setup() {
        customer = Customer.builder().customerId(1L).name("Customer").build();
        restaurant = Restaurant.builder().restaurantId(2L).name("Restaurant").restaurantStatus(true).build();
        menu = RestaurantFoodItem.builder().restaurantFoodItemId(3L).restaurant(restaurant)
            .foodItem(FoodItem.builder().itemId(4L).name("Food").build()).price(new BigDecimal("20000.00")).isAvailable(true).build();
        cart = Cart.builder().cartId(5L).customer(customer).restaurant(restaurant).build();
        item = CartItem.builder().cartItemId(6L).cart(cart).restaurantFoodItem(menu).quantity(2).build();
        method = PaymentMethod.builder().paymentMethodId(7L).paymentMethodCode("COD").isActive(true).build();
        order = Order.builder().orderId(8L).customer(customer).restaurant(restaurant).deliveryAddress("Address")
            .orderDetails(new ArrayList<>()).orderStatus(OrderStatus.PENDING).totalAmount(new BigDecimal("55000.00")).build();
        delivery = Delivery.builder().deliveryId(9L).order(order).deliveryStatus(DeliveryStatus.PENDING).build();
        when(customers.existsById(1L)).thenReturn(true);
        when(customers.findLockedById(1L)).thenReturn(Optional.of(customer));
        when(carts.findByCustomer_CustomerId(1L)).thenReturn(Optional.of(cart));
        when(carts.findLockedByCustomerId(1L)).thenReturn(Optional.of(cart));
        when(items.findByCart_CartId(5L)).thenReturn(new ArrayList<>(List.of(item)));
        when(items.findLockedByCartId(5L)).thenReturn(new ArrayList<>(List.of(item)));
        when(items.findLockedById(6L)).thenReturn(Optional.of(item));
        when(items.findCustomerId(6L)).thenReturn(Optional.of(1L));
        when(restaurants.findById(2L)).thenReturn(Optional.of(restaurant));
        when(menus.findById(3L)).thenReturn(Optional.of(menu));
        when(methods.findById(7L)).thenReturn(Optional.of(method));
        when(orders.findLockedById(8L)).thenReturn(Optional.of(order));
        when(orders.findById(8L)).thenReturn(Optional.of(order));
        when(orders.save(any(Order.class))).thenAnswer(i -> { Order o=i.getArgument(0); o.setOrderId(8L); return o; });
        when(payments.save(any(Payment.class))).thenAnswer(i -> i.getArgument(0));
        when(items.save(any(CartItem.class))).thenAnswer(i -> i.getArgument(0));
        when(deliveries.save(any(Delivery.class))).thenAnswer(i -> i.getArgument(0));
        when(deliveries.findOrderId(9L)).thenReturn(Optional.of(8L));
        when(deliveries.findLockedById(9L)).thenReturn(Optional.of(delivery));
        when(deliveries.findLockedByOrderId(8L)).thenAnswer(invocation -> Optional.ofNullable(order.getDelivery()));
    }
    OrderRequestDTO checkout() { return OrderRequestDTO.builder().deliveryAddress("Address").paymentMethodId(7L).build(); }
    void attachPayment() {
        order.setPayment(Payment.builder().order(order).paymentMethod(method).amount(order.getTotalAmount()).paymentStatus(PaymentStatus.PENDING).build());
    }
    void assignDriver() {
        delivery.setDriver(Driver.builder().driverId(10L).driveStatus(true).build());
        order.setDelivery(delivery);
    }
    @Test void cartWithoutRecordIsEmpty() {
        when(carts.findByCustomer_CustomerId(1L)).thenReturn(Optional.empty());
        var result=cartService.getAllCartItems(1L);
        assertTrue(result.getCartItems().isEmpty()); assertEquals(0, result.getTotalAmount().signum());
        verify(carts, never()).save(any());
    }
    @Test void cartWithNullRestaurantAndNoItemsIsEmpty() {
        cart.setRestaurant(null); when(items.findByCart_CartId(5L)).thenReturn(List.of()); when(items.findLockedByCartId(5L)).thenReturn(List.of());
        var result=cartService.getAllCartItems(1L);
        assertNull(result.getRestaurant()); assertEquals(0,result.getShippingFee().signum());
    }
    @Test void missingCustomerIs404Candidate() {
        assertThrows(ResourceNotFoundException.class, () -> cartService.getAllCartItems(99L));
    }
    @Test void cartTotalsAndMenuIdAreCorrect() {
        var result=cartService.getAllCartItems(1L);
        assertEquals(new BigDecimal("55000.00"),result.getTotalAmount());
        assertEquals(3L,result.getCartItems().get(0).getRestaurantFoodItemId());
    }
    @Test void addingSameMenuAccumulatesQuantity() {
        itemService.addCartItemToCart(1L,CartItemRequestDTO.builder().restaurantFoodItemId(3L).quantity(3).build());
        assertEquals(5,item.getQuantity());
    }
    @Test void addingFirstItemAssignsRestaurant() {
        cart.setRestaurant(null); when(items.findByCart_CartId(5L)).thenReturn(List.of()); when(items.findLockedByCartId(5L)).thenReturn(List.of());
        var result=itemService.addCartItemToCart(1L,CartItemRequestDTO.builder().restaurantFoodItemId(3L).quantity(1).build());
        assertSame(restaurant,cart.getRestaurant()); assertEquals(1,result.getQuantity());
    }
    @Test void mixedRestaurantsAreRejected() {
        var other=RestaurantFoodItem.builder().restaurantFoodItemId(11L).restaurant(Restaurant.builder().restaurantId(12L).restaurantStatus(true).build()).isAvailable(true).build();
        when(menus.findById(11L)).thenReturn(Optional.of(other));
        assertThrows(ResponseStatusException.class,()->itemService.addCartItemToCart(1L,CartItemRequestDTO.builder().restaurantFoodItemId(11L).quantity(1).build()));
    }
    @Test void unavailableMenuCannotBeAdded() {
        menu.setIsAvailable(false);
        assertThrows(ResponseStatusException.class,()->itemService.addCartItemToCart(1L,CartItemRequestDTO.builder().restaurantFoodItemId(3L).quantity(1).build()));
        verify(items,never()).save(any());
    }
    @Test void quantityUpdateAndInvalidQuantity() {
        itemService.updateCartItem(6L,CartItemUpdateRequestDTO.builder().quantity(4).build());
        assertEquals(4,item.getQuantity());
        assertThrows(ResponseStatusException.class,()->itemService.updateCartItem(6L,CartItemUpdateRequestDTO.builder().quantity(0).build()));
        assertThrows(ResponseStatusException.class,()->itemService.updateCartItem(6L,new CartItemUpdateRequestDTO()));
    }
    @Test void deletingLastItemClearsRestaurant() {
        when(items.findByCart_CartId(5L)).thenReturn(List.of()); when(items.findLockedByCartId(5L)).thenReturn(List.of());
        itemService.deleteCartItem(6L); verify(items).delete(item); assertNull(cart.getRestaurant());
    }
    @Test void pendingOrderWithoutDeliveryCanBeRead() {
        assertNull(orderService.getOrderByOrderId(8L).getDeliveryOutputDTO());
    }
    @Test void pendingOrderCanChangeAddress() {
        orderService.updateDeliveryAddress(8L,OrderUpdateDeliveryAddressRequestDTO.builder().deliveryAddress("New").build());
        assertEquals("New",order.getDeliveryAddress());
    }
    @Test void pendingOrderCanCancelWithoutDelivery() {
        attachPayment(); orderService.cancelOrder(8L);
        assertEquals(OrderStatus.CANCELLED,order.getOrderStatus());
        assertEquals(PaymentStatus.CANCELLED,order.getPayment().getPaymentStatus());
    }
    @Test void completedOrderCannotCancel() {
        order.setOrderStatus(OrderStatus.COMPLETED);
        assertThrows(ResponseStatusException.class,()->orderService.cancelOrder(8L));
    }
    @Test void checkoutRejectsEmptyCart() {
        when(items.findByCart_CartId(5L)).thenReturn(List.of()); when(items.findLockedByCartId(5L)).thenReturn(List.of());
        assertThrows(ResponseStatusException.class,()->orderService.createOrder(1L,checkout()));
        verify(orders,never()).save(any());
    }
    @Test void checkoutRejectsUnavailableItem() {
        menu.setIsAvailable(false);
        assertThrows(ResponseStatusException.class,()->orderService.createOrder(1L,checkout()));
        verify(orders,never()).save(any());
    }
    @Test void checkoutRejectsInactiveRestaurant() {
        restaurant.setRestaurantStatus(false);
        assertThrows(ResponseStatusException.class,()->orderService.createOrder(1L,checkout()));
        verify(orders,never()).save(any());
    }
    @Test void checkoutSnapshotsPriceAndKeepsShippingPolicy() {
        var payment=mock(PaymentService.class);
        var target=new OrderService(carts,menus,customers,restaurants,items,orders,payment,deliveryService,deliveries,entityManager);
        var result=target.createOrder(1L,checkout());
        assertEquals(new BigDecimal("55000.00"),result.getTotalAmount());
        assertEquals(new BigDecimal("15000"),result.getShippingFee());
        menu.setPrice(new BigDecimal("99999"));
        assertEquals(new BigDecimal("20000.00"),result.getOrderDetails().get(0).getUnitPrice());
        assertNull(cart.getRestaurant()); verify(items).deleteAll(anyList());
    }
    @Test void failedPaymentDoesNotClearCart() {
        method.setIsActive(false);
        assertThrows(ResponseStatusException.class,()->orderService.createOrder(1L,checkout()));
        verify(items,never()).deleteAll(anyList()); assertSame(restaurant,cart.getRestaurant());
    }
    @Test void directOrderCompletionAndDeliveryAreRejected() {
        order.setOrderStatus(OrderStatus.READY);
        assertThrows(ResponseStatusException.class,()->orderService.updateOrderStatus(8L,OrderStatus.DELIVERING));
        order.setOrderStatus(OrderStatus.DELIVERING);
        assertThrows(ResponseStatusException.class,()->orderService.updateOrderStatus(8L,OrderStatus.COMPLETED));
    }
    @Test void confirmingOrderCreatesDelivery() {
        attachPayment();
        orderService.updateOrderStatus(8L,OrderStatus.CONFIRMED);
        assertNotNull(order.getDelivery()); assertEquals(DeliveryStatus.PENDING,order.getDelivery().getDeliveryStatus());
    }
    @Test void driverAcceptsOnlyOnceAndLocksOrderFirst() {
        order.setOrderStatus(OrderStatus.READY);
        when(drivers.findById(10L)).thenReturn(Optional.of(Driver.builder().driverId(10L).driveStatus(true).build()));
        var request=DeliveryRequestDTO.builder().driverId(10L).build();
        deliveryService.acceptDelivery(9L,request);
        assertThrows(ResponseStatusException.class,()->deliveryService.acceptDelivery(9L,request));
        var sequence=inOrder(orders,deliveries);
        sequence.verify(deliveries).findOrderId(9L);
        sequence.verify(orders).findLockedById(8L);
        sequence.verify(deliveries).findLockedById(9L);
        verify(entityManager, times(2)).refresh(delivery,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    }
    @Test void inactiveDriverCannotAccept() {
        order.setOrderStatus(OrderStatus.READY);
        when(drivers.findById(10L)).thenReturn(Optional.of(Driver.builder().driverId(10L).driveStatus(false).build()));
        assertThrows(ResponseStatusException.class,()->deliveryService.acceptDelivery(9L,DeliveryRequestDTO.builder().driverId(10L).build()));
        assertNull(delivery.getDriver());
    }
    @Test void pickupRequiresReadyOrder() {
        assignDriver();
        assertThrows(ResponseStatusException.class,()->deliveryService.updateDeliveryStatus(9L,DeliveryStatus.PICKED_UP));
        order.setOrderStatus(OrderStatus.READY);
        deliveryService.updateDeliveryStatus(9L,DeliveryStatus.PICKED_UP); assertNotNull(delivery.getPickupTime());
    }
    @Test void deliveryCompletesOrderAndCodTogether() {
        assignDriver(); attachPayment(); order.setOrderStatus(OrderStatus.READY);
        deliveryService.updateDeliveryStatus(9L,DeliveryStatus.PICKED_UP);
        deliveryService.updateDeliveryStatus(9L,DeliveryStatus.DELIVERING);
        deliveryService.updateDeliveryStatus(9L,DeliveryStatus.DELIVERED);
        assertEquals(OrderStatus.COMPLETED,order.getOrderStatus());
        assertEquals(PaymentStatus.SUCCESS,order.getPayment().getPaymentStatus());
        assertNotNull(order.getPayment().getPaidAt()); assertNotNull(delivery.getDeliveredTime());
        assertThrows(ResponseStatusException.class,()->deliveryService.updateDeliveryStatus(9L,DeliveryStatus.DELIVERED));
    }
    @Test void unpaidOnlineOrderCannotComplete() {
        assignDriver(); attachPayment(); method.setPaymentMethodCode("ONLINE");
        order.setOrderStatus(OrderStatus.DELIVERING); delivery.setDeliveryStatus(DeliveryStatus.DELIVERING);
        assertThrows(ResponseStatusException.class,()->deliveryService.updateDeliveryStatus(9L,DeliveryStatus.DELIVERED));
        assertEquals(OrderStatus.DELIVERING,order.getOrderStatus());
    }
    @Test void paymentCreationAndDuplicateRejection() {
        paymentService.createPayment(7L,8L);
        assertEquals(PaymentStatus.PENDING,order.getPayment().getPaymentStatus());
        assertThrows(ResponseStatusException.class,()->paymentService.createPayment(7L,8L));
    }
    @Test void missingPaymentMethodIsRejected() {
        assertThrows(ResourceNotFoundException.class,()->paymentService.createPayment(99L,8L));
        verify(payments,never()).save(any());
    }
    @Test void codCannotBeConfirmedTwiceOrForWrongAmount() {
        attachPayment(); order.setOrderStatus(OrderStatus.DELIVERING);
        order.getPayment().setAmount(BigDecimal.ONE);
        assertThrows(ResponseStatusException.class,()->paymentService.confirmCashPayment(order));
        order.getPayment().setAmount(order.getTotalAmount()); paymentService.confirmCashPayment(order);
        assertThrows(ResponseStatusException.class,()->paymentService.confirmCashPayment(order));
    }
    @Test void orderCannotAdvanceWithoutMatchingPayment() {
        assertThrows(ResponseStatusException.class,()->orderService.updateOrderStatus(8L,OrderStatus.CONFIRMED));
        assertEquals(OrderStatus.PENDING,order.getOrderStatus());
    }
    @Test void confirmedCancellationCancelsDeliveryAndPayment() {
        attachPayment(); assignDriver(); order.setOrderStatus(OrderStatus.CONFIRMED);
        orderService.cancelOrder(8L);
        assertEquals(OrderStatus.CANCELLED,order.getOrderStatus());
        assertEquals(DeliveryStatus.CANCELLED,delivery.getDeliveryStatus());
        assertEquals(PaymentStatus.CANCELLED,order.getPayment().getPaymentStatus());
    }
    @Test void cancellationReloadsDeliveryEvenWhenInverseReferenceWasNull() {
        attachPayment(); order.setOrderStatus(OrderStatus.CONFIRMED);
        assertNull(order.getDelivery());
        when(deliveries.findLockedByOrderId(8L)).thenReturn(Optional.of(delivery));
        orderService.cancelOrder(8L);
        assertSame(delivery,order.getDelivery());
        assertEquals(DeliveryStatus.CANCELLED,delivery.getDeliveryStatus());
        assertEquals(PaymentStatus.CANCELLED,order.getPayment().getPaymentStatus());
        var lockOrder=inOrder(orders,deliveries,entityManager);
        lockOrder.verify(orders).findLockedById(8L);
        lockOrder.verify(deliveries).findLockedByOrderId(8L);
    }
    @Test void deletingOneOfSeveralItemsKeepsRestaurant() {
        itemService.deleteCartItem(6L);
        assertSame(restaurant,cart.getRestaurant());
    }
    @Test void checkoutRejectsInvalidStoredQuantityAndPrice() {
        item.setQuantity(0);
        assertThrows(ResponseStatusException.class,()->orderService.createOrder(1L,checkout()));
        item.setQuantity(1); menu.setPrice(BigDecimal.ZERO);
        assertThrows(ResponseStatusException.class,()->orderService.createOrder(1L,checkout()));
        verify(orders,never()).save(any());
    }
    @Test void checkoutRejectsMenuFromDifferentRestaurant() {
        menu.setRestaurant(Restaurant.builder().restaurantId(99L).build());
        assertThrows(ResponseStatusException.class,()->orderService.createOrder(1L,checkout()));
        verify(orders,never()).save(any());
    }
    @Test void missingCartItemDoesNotCreateAnything() {
        assertThrows(ResourceNotFoundException.class,()->itemService.deleteCartItem(99L));
        verify(items,never()).delete(any());
    }
    @Test void skippedDeliveryTransitionIsRejected() {
        assignDriver(); order.setOrderStatus(OrderStatus.READY);
        assertThrows(ResponseStatusException.class,()->deliveryService.updateDeliveryStatus(9L,DeliveryStatus.DELIVERED));
        assertEquals(DeliveryStatus.PENDING,delivery.getDeliveryStatus());
    }

}
