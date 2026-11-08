package vn.gaugaugau.fooddelivery;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.model.enums.*;
import vn.gaugaugau.fooddelivery.repository.*;
import vn.gaugaugau.fooddelivery.service.*;

// Explicit opt-in; hard-coded approved endpoint and validate prevent use of the development DB.
@EnabledIfEnvironmentVariable(named="RUN_STAGE1_MYSQL_TESTS", matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.MOCK, properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/fooddelivery_stage1_test?allowPublicKeyRetrieval=true&sslMode=DISABLED",
    "spring.datasource.username=stage1_app", "spring.datasource.password=${STAGE1_MYSQL_PASSWORD}",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false",
    "spring.jpa.properties.hibernate.generate_statistics=true", "spring.jpa.show-sql=false",
    "spring.main.lazy-initialization=false", "logging.level.root=WARN"
})
class MySqlStage1IntegrationTest {
    @Autowired CustomerRepository customers;
    @Autowired RestaurantRepository restaurants;
    @Autowired FoodItemRepository foods;
    @Autowired RestaurantFoodItemRepository menus;
    @Autowired PaymentMethodRepository methods;
    @Autowired DriverRepository drivers;
    @Autowired DeliveryRepository deliveries;
    @Autowired OrderService orders;
    @Autowired CartItemService cartItems;
    @Autowired CartService carts;
    @Autowired DeliveryService shipping;
    @Autowired PaymentService payments;
    @Autowired RestaurantFoodItemService menuService;
    @Autowired PlatformTransactionManager manager;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager entityManager;
    @Autowired EntityManagerFactory factory;

    record Fixture(long customer,long restaurant,long menu,long method,long driver1,long driver2) {}
    Fixture fixture() {
        assertEquals(3307,jdbc.queryForObject("select @@port",Integer.class));
        assertEquals("fooddelivery_stage1_test",jdbc.queryForObject("select database()",String.class));
        assertTrue(jdbc.queryForObject("select @@datadir",String.class).replace('\\','/').startsWith("F:/New folder/food-delivery-mysql-test/data"));
        String tag=UUID.randomUUID().toString();
        return new TransactionTemplate(manager).execute(status -> {
            var c=customers.save(Customer.builder().name("Test").email(tag+"@test.invalid").password("test-hash")
                .phoneNumber("0900000000").address("Test address").build());
            var r=restaurants.save(Restaurant.builder().name("Test restaurant").email(tag+"r@test.invalid").password("test-hash")
                .phoneNumber("0900000000").address("Test address").restaurantStatus(true).build());
            var food=foods.save(FoodItem.builder().name("Test "+tag).build());
            var menu=menus.save(RestaurantFoodItem.builder().restaurant(r).foodItem(food).price(new BigDecimal("20000.00")).isAvailable(true).build());
            String code="T"+tag.replace("-","").substring(0,20);
            var method=methods.save(PaymentMethod.builder().paymentMethodName("Test COD").paymentMethodCode(code).isActive(true).build());
            var d1=drivers.save(Driver.builder().name("Driver1").email(tag+"d1@test.invalid").password("test-hash")
                .phoneNumber("0900000000").address("Test address").driveStatus(true).build());
            var d2=drivers.save(Driver.builder().name("Driver2").email(tag+"d2@test.invalid").password("test-hash")
                .phoneNumber("0900000000").address("Test address").driveStatus(true).build());
            return new Fixture(c.getCustomerId(),r.getRestaurantId(),menu.getRestaurantFoodItemId(),method.getPaymentMethodId(),d1.getDriverId(),d2.getDriverId());
        });
    }
    void add(Fixture f) { cartItems.addCartItemToCart(f.customer(),CartItemRequestDTO.builder().restaurantFoodItemId(f.menu()).quantity(2).build()); }
    OrderRequestDTO request(Fixture f) { return OrderRequestDTO.builder().deliveryAddress("Test address").paymentMethodId(f.method()).build(); }
    long count(String table,long customer) {
        if(table.equals("orders")) return jdbc.queryForObject("select count(*) from orders where customer_id=?",Long.class,customer);
        return jdbc.queryForObject("select count(*) from "+table+" x join orders o on x.order_id=o.order_id where o.customer_id=?",Long.class,customer);
    }
    long create(Fixture f) { add(f);return orders.createOrder(f.customer(),request(f)).getOrderId(); }
    long ready(long id) {
        orders.updateOrderStatus(id,OrderStatus.CONFIRMED);
        orders.updateOrderStatus(id,OrderStatus.PREPARING);
        orders.updateOrderStatus(id,OrderStatus.READY);
        return orders.getOrderByOrderId(id).getDeliveryOutputDTO().getDeliveryId();
    }
    void useCod(long orderId) {
        new TransactionTemplate(manager).executeWithoutResult(s -> {
            var method=entityManager.createQuery("select m from PaymentMethod m where m.paymentMethodCode='COD'",PaymentMethod.class).getResultStream().findFirst()
                .orElseGet(()->methods.save(PaymentMethod.builder().paymentMethodCode("COD").paymentMethodName("Cash").isActive(true).build()));
            var payment=entityManager.createQuery("select p from Payment p where p.order.orderId=:id",Payment.class).setParameter("id",orderId).getSingleResult();
            payment.setPaymentMethod(method);
        });
    }
    void delivering(Fixture f,long id,long delivery) {
        shipping.acceptDelivery(delivery,DeliveryRequestDTO.builder().driverId(f.driver1()).build());
        shipping.updateDeliveryStatus(delivery,DeliveryStatus.PICKED_UP);
        shipping.updateDeliveryStatus(delivery,DeliveryStatus.DELIVERING);
    }
    List<Boolean> race(Callable<?> a,Callable<?> b) throws Exception {
        var executor=Executors.newFixedThreadPool(2);
        var gate=new CyclicBarrier(2);
        Callable<Boolean> first=()->{gate.await(10,TimeUnit.SECONDS);return attempt(a);};
        Callable<Boolean> second=()->{gate.await(10,TimeUnit.SECONDS);return attempt(b);};
        try { var x=executor.submit(first);var y=executor.submit(second);return List.of(x.get(30,TimeUnit.SECONDS),y.get(30,TimeUnit.SECONDS)); }
        finally {executor.shutdownNow();}
    }
    boolean attempt(Callable<?> call) throws Exception {
        try {call.call();return true;} catch(ResponseStatusException e) {assertEquals(409,e.getStatusCode().value());return false;}
    }
    void oneWinner(List<Boolean> results) {assertEquals(1,results.stream().filter(Boolean::booleanValue).count());}

    @Test void checkoutCommitsAllRowsAndKeepsHistoricalPrice() {
        var f=fixture();long id=create(f);
        assertEquals(1,count("orders",f.customer()));assertEquals(1,count("order_details",f.customer()));assertEquals(1,count("payments",f.customer()));
        assertTrue(carts.getAllCartItems(f.customer()).getCartItems().isEmpty());
        new TransactionTemplate(manager).executeWithoutResult(s -> menus.findById(f.menu()).orElseThrow().setPrice(new BigDecimal("99000")));
        var result=orders.getOrderByOrderId(id);
        assertEquals(0,new BigDecimal("20000").compareTo(result.getOrderDetails().get(0).getUnitPrice()));
        assertEquals(0,new BigDecimal("55000").compareTo(result.getTotalAmount()));assertNull(result.getDeliveryOutputDTO());
    }
    @Test void inactivePaymentRollsBackActualOrderAndDetails() {
        var f=fixture();add(f);
        new TransactionTemplate(manager).executeWithoutResult(s -> methods.findById(f.method()).orElseThrow().setIsActive(false));
        assertThrows(ResponseStatusException.class,()->orders.createOrder(f.customer(),request(f)));
        assertEquals(0,count("orders",f.customer()));assertEquals(0,count("order_details",f.customer()));assertEquals(0,count("payments",f.customer()));
        assertEquals(2,carts.getAllCartItems(f.customer()).getCartItems().get(0).getQuantity());
    }
    @Test void failureAfterPaymentInsertRollsBackEverythingIncludingCartDeletion() {
        var f=fixture();add(f);
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(manager).executeWithoutResult(s -> {
            orders.createOrder(f.customer(),request(f));entityManager.flush();throw new IllegalStateException("Test failure after payment insert");
        }));
        assertEquals(0,count("orders",f.customer()));assertEquals(0,count("order_details",f.customer()));assertEquals(0,count("payments",f.customer()));
        assertEquals(1,carts.getAllCartItems(f.customer()).getCartItems().size());
    }
    @Test void twoCheckoutsHaveOneWinner() throws Exception {
        var f=fixture();add(f);
        oneWinner(race(()->orders.createOrder(f.customer(),request(f)),()->orders.createOrder(f.customer(),request(f))));
        assertEquals(1,count("orders",f.customer()));assertEquals(1,count("payments",f.customer()));
    }
    @Test void twoDriversHaveOneWinner() throws Exception {
        var f=fixture();long id=create(f);long d=ready(id);
        oneWinner(race(()->shipping.acceptDelivery(d,DeliveryRequestDTO.builder().driverId(f.driver1()).build()),
            ()->shipping.acceptDelivery(d,DeliveryRequestDTO.builder().driverId(f.driver2()).build())));
        long winner=jdbc.queryForObject("select driver_id from deliveries where delivery_id=?",Long.class,d);
        assertTrue(winner==f.driver1() || winner==f.driver2());
        assertEquals(1,jdbc.queryForObject("select count(*) from deliveries where order_id=?",Integer.class,id));
    }
    @Test void concurrentConfirmationCreatesOneDelivery() throws Exception {
        var f=fixture();long id=create(f);
        oneWinner(race(()->orders.updateOrderStatus(id,OrderStatus.CONFIRMED),()->orders.updateOrderStatus(id,OrderStatus.CONFIRMED)));
        assertEquals(1,jdbc.queryForObject("select count(*) from deliveries where order_id=?",Integer.class,id));
    }
    @Test void concurrentCodConfirmationHasOneWinner() throws Exception {
        var f=fixture();long id=create(f);useCod(id);long d=ready(id);delivering(f,id,d);
        var detached=Order.builder().orderId(id).build();
        oneWinner(race(()->{payments.confirmCashPayment(detached);return null;},()->{payments.confirmCashPayment(detached);return null;}));
        assertEquals("SUCCESS",jdbc.queryForObject("select payment_status from payments where order_id=?",String.class,id));
        assertNotNull(jdbc.queryForObject("select paid_at from payments where order_id=?",java.sql.Timestamp.class,id));
    }
    @Test void concurrentDeliveryCompletionIsAtomicWithCod() throws Exception {
        var f=fixture();long id=create(f);useCod(id);long d=ready(id);delivering(f,id,d);
        oneWinner(race(()->shipping.updateDeliveryStatus(d,DeliveryStatus.DELIVERED),()->shipping.updateDeliveryStatus(d,DeliveryStatus.DELIVERED)));
        assertEquals("COMPLETED",jdbc.queryForObject("select order_status from orders where order_id=?",String.class,id));
        assertEquals("SUCCESS",jdbc.queryForObject("select payment_status from payments where order_id=?",String.class,id));
        assertEquals("DELIVERED",jdbc.queryForObject("select delivery_status from deliveries where delivery_id=?",String.class,d));
    }
    @Test void lazyMappingsWorkOutsideServiceTransactionAndMeasureQueries() {
        var f=fixture();long id=create(f);
        var stats=factory.unwrap(SessionFactory.class).getStatistics();stats.clear();
        var list=menuService.getAllRestaurantFoodItems();
        assertTrue(list.stream().anyMatch(m -> m.getRestaurantFoodItemId()==f.menu()));
        assertEquals(1,stats.getPrepareStatementCount());
        System.out.println("STAGE1_MENU_QUERY_COUNT="+stats.getPrepareStatementCount()+" ROWS="+list.size());
        assertNotNull(menuService.getRestaurantFoodItemById(f.menu()).getRestaurant().getName());
        assertEquals(id,orders.getOrderByOrderId(id).getOrderId());
    }
    @Test void deletingDeliveryDoesNotCascadeToOrderOrDriver() {
        var f=fixture();long id=create(f);long d=ready(id);delivering(f,id,d);
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            deliveries.deleteById(d);deliveries.flush();
            assertEquals(1,jdbc.queryForObject("select count(*) from orders where order_id=?",Integer.class,id));
            assertEquals(1,jdbc.queryForObject("select count(*) from drivers where driver_id=?",Integer.class,f.driver1()));
            assertEquals(1,jdbc.queryForObject("select count(*) from payments where order_id=?",Integer.class,id));
            status.setRollbackOnly();
        });
        assertTrue(deliveries.existsById(d));
    }
    @Test void schemaHasExpectedForeignKeysAndUniqueRelationships() {
        fixture();
        assertEquals(13,jdbc.queryForObject("select count(*) from information_schema.tables where table_schema=database()",Integer.class));
        assertTrue(jdbc.queryForObject("select count(*) from information_schema.table_constraints where constraint_schema=database() and constraint_type='FOREIGN KEY'",Integer.class)>=15);
        for(String table:List.of("payments","deliveries")) {
            assertTrue(jdbc.queryForObject("select count(*) from information_schema.statistics where table_schema=database() and table_name=? and column_name='order_id' and non_unique=0",Integer.class,table)>0);
        }
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("insert into cart_items(quantity,cart_id,restaurant_food_item_id) values (1,999999999,999999999)"));
    }
}

