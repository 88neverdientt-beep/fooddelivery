package vn.gaugaugau.fooddelivery.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.dto.OrderRequestDTO;
import vn.gaugaugau.fooddelivery.repository.*;

// Tests real Spring transaction advice, not MySQL rollback or locking semantics.
class TransactionIntegrationTest {
    static class RecordingTransactions extends AbstractPlatformTransactionManager {
        int commits,rollbacks;
        protected Object doGetTransaction() { return new Object(); }
        protected void doBegin(Object tx,TransactionDefinition definition) { }
        protected void doCommit(DefaultTransactionStatus status) { commits++; }
        protected void doRollback(DefaultTransactionStatus status) { rollbacks++; }
    }
    @Test void paymentFailureRollsBackCheckoutTransaction() {
        var carts=mock(CartRepository.class); var menus=mock(RestaurantFoodItemRepository.class);
        var customers=mock(CustomerRepository.class); var restaurants=mock(RestaurantRepository.class);
        var items=mock(CartItemRepository.class); var orders=mock(OrderRepository.class);
        var payments=mock(PaymentService.class); var deliveries=mock(DeliveryService.class);
        var customer=Customer.builder().customerId(1L).build();
        var restaurant=Restaurant.builder().restaurantId(2L).restaurantStatus(true).build();
        var menu=RestaurantFoodItem.builder().restaurantFoodItemId(3L).restaurant(restaurant)
            .price(BigDecimal.TEN).isAvailable(true).build();
        var cart=Cart.builder().cartId(4L).restaurant(restaurant).build();
        when(customers.findLockedById(1L)).thenReturn(Optional.of(customer));
        when(carts.findByCustomer_CustomerId(1L)).thenReturn(Optional.of(cart));
        when(restaurants.findById(2L)).thenReturn(Optional.of(restaurant));
        when(menus.findById(3L)).thenReturn(Optional.of(menu));
        when(items.findLockedByCartId(4L)).thenReturn(List.of(CartItem.builder().quantity(1).restaurantFoodItem(menu).build()));
        when(orders.save(any(Order.class))).thenAnswer(i -> { Order order=i.getArgument(0);order.setOrderId(5L);return order; });
        when(payments.createPayment(6L,5L)).thenThrow(new IllegalStateException("Simulated payment failure"));
        var target=new OrderService(carts,menus,customers,restaurants,items,orders,payments,deliveries);
        var transactions=new RecordingTransactions();
        var factory=new ProxyFactory(target);
        var advice = new TransactionInterceptor();
        advice.setTransactionManager(transactions);
        advice.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        advice.afterPropertiesSet();
        factory.addAdvice(advice);
        var service=(OrderService)factory.getProxy();
        assertThrows(IllegalStateException.class,()->service.createOrder(1L,
            OrderRequestDTO.builder().deliveryAddress("Address").paymentMethodId(6L).build()));
        assertEquals(1,transactions.rollbacks); assertEquals(0,transactions.commits);
        verify(orders).save(any(Order.class)); verify(items,never()).deleteAll(anyList());
        assertSame(restaurant,cart.getRestaurant());
    }
}
