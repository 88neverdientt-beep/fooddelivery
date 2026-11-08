package vn.gaugaugau.fooddelivery;

import static org.junit.jupiter.api.Assertions.*;
import java.util.Arrays;
import jakarta.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;
import vn.gaugaugau.fooddelivery.model.Delivery;
import vn.gaugaugau.fooddelivery.repository.*;
import vn.gaugaugau.fooddelivery.service.*;

// No SpringBootTest: this suite must never bootstrap the real datasource.
class FooddeliveryApplicationTests {
    @Test void deliveryMustNotCascadeRemovalToOrderOrDriver() throws Exception {
        var order=Delivery.class.getDeclaredField("order").getAnnotation(OneToOne.class);
        var driver=Delivery.class.getDeclaredField("driver").getAnnotation(ManyToOne.class);
        assertFalse(Arrays.stream(order.cascade()).anyMatch(c -> c==CascadeType.ALL || c==CascadeType.REMOVE));
        assertFalse(Arrays.stream(driver.cascade()).anyMatch(c -> c==CascadeType.ALL || c==CascadeType.REMOVE));
    }
    @Test void lifecycleRepositoriesRequireDatabaseWriteLocks() throws Exception {
        for (var type : java.util.List.of(OrderRepository.class,CustomerRepository.class,DeliveryRepository.class)) {
            var lock=type.getMethod("findLockedById",Long.class).getAnnotation(org.springframework.data.jpa.repository.Lock.class);
            assertEquals(LockModeType.PESSIMISTIC_WRITE,lock.value());
        }
    }
    @Test void menuReadHasPersistenceContext() throws Exception {
        assertTrue(RestaurantFoodItemService.class.getMethod("getAllRestaurantFoodItems").getAnnotation(Transactional.class).readOnly());
        assertTrue(RestaurantFoodItemService.class.getMethod("getRestaurantFoodItemById",Long.class).getAnnotation(Transactional.class).readOnly());
    }
}
