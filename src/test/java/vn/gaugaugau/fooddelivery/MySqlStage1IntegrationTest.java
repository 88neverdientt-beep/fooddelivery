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
@org.junit.jupiter.api.condition.EnabledIf("enabled")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.MOCK, properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_stage2_rehearsal}?sslMode=REQUIRED",
    "spring.datasource.username=${FOOD_TEST_DB_USERNAME:stage2_app}", "spring.datasource.password=${STAGE2_MYSQL_PASSWORD}",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false",
    "spring.jpa.properties.hibernate.generate_statistics=true", "spring.jpa.show-sql=false",
    "spring.main.lazy-initialization=false", "logging.level.root=WARN"
})
class MySqlStage1IntegrationTest extends vn.gaugaugau.fooddelivery.auth.AuthTestKeys {
    static boolean enabled(){return vn.gaugaugau.fooddelivery.auth.ApprovedMySqlTestTarget.enabled("RUN_STAGE1_MYSQL_TESTS");}
    static final String FIXTURE_HASH = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode("stage1-test-fixture-password");
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

    @Autowired vn.gaugaugau.fooddelivery.auth.repository.AccountRepository authAccounts;
    @Autowired vn.gaugaugau.fooddelivery.auth.service.AuthService authentication;
    @Autowired org.springframework.security.oauth2.jwt.JwtDecoder decoder;
    @Autowired vn.gaugaugau.fooddelivery.auth.security.SessionJwtConverter converter;
    final java.util.concurrent.ConcurrentMap<Long,String> tokens=new java.util.concurrent.ConcurrentHashMap<>();
    void asActor(vn.gaugaugau.fooddelivery.auth.model.Role role,Long id) {
        var account=new TransactionTemplate(manager).execute(st -> authAccounts.findProfileAccount(role,id).orElseThrow());
        String token=tokens.computeIfAbsent(account.getAccountId(),key -> authentication.login(
            new vn.gaugaugau.fooddelivery.auth.dto.AuthDtos.Login(account.getEmail(),"stage1-test-fixture-password"),"fixture-"+key).response().accessToken());
        var ctx=org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(converter.convert(decoder.decode(token)));org.springframework.security.core.context.SecurityContextHolder.setContext(ctx);
    }
    @org.junit.jupiter.api.AfterEach void clearActor(){org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    record Fixture(long customer,long restaurant,long menu,long method,long driver1,long driver2) {}
    Fixture fixture() {
        vn.gaugaugau.fooddelivery.auth.ApprovedMySqlTestTarget.assertTarget(jdbc);
        String tag=UUID.randomUUID().toString();
        Fixture fixture = new TransactionTemplate(manager).execute(status -> {
            var c=customers.save(Customer.builder().name("Test").email(tag+"@test.invalid").password(FIXTURE_HASH)
                .phoneNumber("0900000000").address("Test address").build());
            var r=restaurants.save(Restaurant.builder().name("Test restaurant").email(tag+"r@test.invalid").password(FIXTURE_HASH)
                .phoneNumber("0900000000").address("Test address").restaurantStatus(true).build());
            var food=foods.save(FoodItem.builder().name("Test "+tag).build());
            var menu=menus.save(RestaurantFoodItem.builder().restaurant(r).foodItem(food).price(new BigDecimal("20000.00")).isAvailable(true).build());
            String code="T"+tag.replace("-","").substring(0,20);
            var method=methods.save(PaymentMethod.builder().paymentMethodName("Test COD").paymentMethodCode(code).isActive(true).build());
            var d1=drivers.save(Driver.builder().name("Driver1").email(tag+"d1@test.invalid").password(FIXTURE_HASH)
                .phoneNumber("0900000000").address("Test address").driveStatus(true).build());
            var d2=drivers.save(Driver.builder().name("Driver2").email(tag+"d2@test.invalid").password(FIXTURE_HASH)
                .phoneNumber("0900000000").address("Test address").driveStatus(true).build());
            authAccounts.save(vn.gaugaugau.fooddelivery.auth.model.Account.builder().email(c.getEmail()).passwordHash(FIXTURE_HASH).role(vn.gaugaugau.fooddelivery.auth.model.Role.CUSTOMER).customer(c).build());
            authAccounts.save(vn.gaugaugau.fooddelivery.auth.model.Account.builder().email(r.getEmail()).passwordHash(FIXTURE_HASH).role(vn.gaugaugau.fooddelivery.auth.model.Role.RESTAURANT).restaurant(r).build());
            authAccounts.save(vn.gaugaugau.fooddelivery.auth.model.Account.builder().email(d1.getEmail()).passwordHash(FIXTURE_HASH).role(vn.gaugaugau.fooddelivery.auth.model.Role.DRIVER).driver(d1).build());
            authAccounts.save(vn.gaugaugau.fooddelivery.auth.model.Account.builder().email(d2.getEmail()).passwordHash(FIXTURE_HASH).role(vn.gaugaugau.fooddelivery.auth.model.Role.DRIVER).driver(d2).build());
            return new Fixture(c.getCustomerId(),r.getRestaurantId(),menu.getRestaurantFoodItemId(),method.getPaymentMethodId(),d1.getDriverId(),d2.getDriverId());
        });
        asActor(vn.gaugaugau.fooddelivery.auth.model.Role.CUSTOMER,fixture.customer());return fixture;
    }
    void add(Fixture f) { cartItems.addCartItemToCart(f.customer(),CartItemRequestDTO.builder().restaurantFoodItemId(f.menu()).quantity(2).build()); }
    OrderRequestDTO request(Fixture f) { return OrderRequestDTO.builder().deliveryAddress("Test address").paymentMethodId(f.method()).build(); }
    long count(String table,long customer) {
        if(table.equals("orders")) return jdbc.queryForObject("select count(*) from orders where customer_id=?",Long.class,customer);
        return jdbc.queryForObject("select count(*) from "+table+" x join orders o on x.order_id=o.order_id where o.customer_id=?",Long.class,customer);
    }
    long create(Fixture f) { add(f);return orders.createOrder(f.customer(),request(f)).getOrderId(); }
    long ready(long id) {
        var original=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Long rid=jdbc.queryForObject("SELECT restaurant_id FROM orders WHERE order_id=?",Long.class,id);
        asActor(vn.gaugaugau.fooddelivery.auth.model.Role.RESTAURANT,rid);
        try {
        orders.updateOrderStatus(id,OrderStatus.CONFIRMED);
        orders.updateOrderStatus(id,OrderStatus.PREPARING);
        orders.updateOrderStatus(id,OrderStatus.READY);
        return orders.getOrderByOrderId(id).getDeliveryOutputDTO().getDeliveryId();
        }finally {org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(original);}
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
        asActor(vn.gaugaugau.fooddelivery.auth.model.Role.DRIVER,f.driver1());
        shipping.acceptDelivery(delivery,DeliveryRequestDTO.builder().driverId(f.driver1()).build());
        shipping.updateDeliveryStatus(delivery,DeliveryStatus.PICKED_UP);
        shipping.updateDeliveryStatus(delivery,DeliveryStatus.DELIVERING);
    }
    List<Boolean> race(Callable<?> a,Callable<?> b) throws Exception {
        var executor=Executors.newFixedThreadPool(2);
        var gate=new CyclicBarrier(2);
        var original=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        Callable<Boolean> first=()->{org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(original);gate.await(10,TimeUnit.SECONDS);try{return attempt(a);}finally{clearActor();}};
        Callable<Boolean> second=()->{org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(original);gate.await(10,TimeUnit.SECONDS);try{return attempt(b);}finally{clearActor();}};
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
        oneWinner(race(()->{asActor(vn.gaugaugau.fooddelivery.auth.model.Role.DRIVER,f.driver1());return shipping.acceptDelivery(d,DeliveryRequestDTO.builder().driverId(f.driver1()).build());},
            ()->{asActor(vn.gaugaugau.fooddelivery.auth.model.Role.DRIVER,f.driver2());return shipping.acceptDelivery(d,DeliveryRequestDTO.builder().driverId(f.driver2()).build());}));
        long winner=jdbc.queryForObject("select driver_id from deliveries where delivery_id=?",Long.class,d);
        assertTrue(winner==f.driver1() || winner==f.driver2());
        assertEquals(1,jdbc.queryForObject("select count(*) from deliveries where order_id=?",Integer.class,id));
    }
    @Test void concurrentConfirmationCreatesOneDelivery() throws Exception {
        var f=fixture();long id=create(f);asActor(vn.gaugaugau.fooddelivery.auth.model.Role.RESTAURANT,f.restaurant());
        oneWinner(race(()->orders.updateOrderStatus(id,OrderStatus.CONFIRMED),()->orders.updateOrderStatus(id,OrderStatus.CONFIRMED)));
        assertEquals(1,jdbc.queryForObject("select count(*) from deliveries where order_id=?",Integer.class,id));
    }
    @Test void cancellationMustSeeDeliveryCreatedAfterItsRepeatableReadSnapshot() throws Exception {
        var f=fixture();long id=create(f);
        var snapshotTaken=new CountDownLatch(1);
        var confirmationCommitted=new CountDownLatch(1);
        var pool=Executors.newSingleThreadExecutor();
        var cancellation=pool.submit(()->{
            asActor(vn.gaugaugau.fooddelivery.auth.model.Role.CUSTOMER,f.customer());
            try {
                var tx=new TransactionTemplate(manager);
                tx.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_REPEATABLE_READ);
                tx.executeWithoutResult(status->{
                    assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM deliveries WHERE order_id=?",Integer.class,id));
                    snapshotTaken.countDown();
                    try { assertTrue(confirmationCommitted.await(15,TimeUnit.SECONDS)); }
                    catch(InterruptedException exception){Thread.currentThread().interrupt();throw new IllegalStateException(exception);}
                    // Prove the ambient nonlocking snapshot is stale before the writer's current read.
                    assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM deliveries WHERE order_id=?",Integer.class,id));
                    orders.cancelOrder(id);
                });
            } finally { clearActor(); }
        });
        try {
            assertTrue(snapshotTaken.await(15,TimeUnit.SECONDS));
            asActor(vn.gaugaugau.fooddelivery.auth.model.Role.RESTAURANT,f.restaurant());
            orders.updateOrderStatus(id,OrderStatus.CONFIRMED);
            confirmationCommitted.countDown();
            cancellation.get(20,TimeUnit.SECONDS);
            assertEquals("CANCELLED",jdbc.queryForObject("SELECT order_status FROM orders WHERE order_id=?",String.class,id));
            assertEquals("CANCELLED",jdbc.queryForObject("SELECT payment_status FROM payments WHERE order_id=?",String.class,id));
            assertEquals("CANCELLED",jdbc.queryForObject("SELECT delivery_status FROM deliveries WHERE order_id=?",String.class,id),
                "Cancellation must include the Delivery committed after its initial snapshot; orderId="+id);
        } finally {confirmationCommitted.countDown();pool.shutdownNow();}
    }
    @Test void cancellationKeepsDriverAssignedAfterItsManagedDeliverySnapshot() throws Exception {
        var f=fixture();long id=create(f);
        asActor(vn.gaugaugau.fooddelivery.auth.model.Role.RESTAURANT,f.restaurant());
        long deliveryId=orders.updateOrderStatus(id,OrderStatus.CONFIRMED).getDeliveryOutputDTO().getDeliveryId();
        var snapshotTaken=new CountDownLatch(1);var assignmentCommitted=new CountDownLatch(1);
        var pool=Executors.newSingleThreadExecutor();
        var cancellation=pool.submit(()->{
            asActor(vn.gaugaugau.fooddelivery.auth.model.Role.CUSTOMER,f.customer());
            try {
                var tx=new TransactionTemplate(manager);
                tx.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_REPEATABLE_READ);
                tx.executeWithoutResult(status->{
                    var cached=entityManager.find(Order.class,id).getDelivery();
                    assertNotNull(cached);assertNull(cached.getDriver());snapshotTaken.countDown();
                    try {assertTrue(assignmentCommitted.await(15,TimeUnit.SECONDS));}
                    catch(InterruptedException exception){Thread.currentThread().interrupt();throw new IllegalStateException(exception);}
                    orders.cancelOrder(id);
                });
            } finally {clearActor();}
        });
        try {
            assertTrue(snapshotTaken.await(15,TimeUnit.SECONDS));
            asActor(vn.gaugaugau.fooddelivery.auth.model.Role.DRIVER,f.driver1());
            shipping.acceptDelivery(deliveryId,DeliveryRequestDTO.builder().driverId(f.driver1()).build());
            assignmentCommitted.countDown();cancellation.get(20,TimeUnit.SECONDS);
            assertEquals(f.driver1(),jdbc.queryForObject("SELECT driver_id FROM deliveries WHERE delivery_id=?",Long.class,deliveryId));
            assertEquals("CANCELLED",jdbc.queryForObject("SELECT delivery_status FROM deliveries WHERE delivery_id=?",String.class,deliveryId));
        } finally {assignmentCommitted.countDown();pool.shutdownNow();}
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
        assertEquals(13,jdbc.queryForObject("select count(*) from information_schema.tables where table_schema=database() and table_name in ('customers','restaurants','drivers','food_items','restaurant_food_items','carts','cart_items','orders','order_details','payments','payment_methods','deliveries','ratings')",Integer.class));
        assertTrue(jdbc.queryForObject("select count(*) from information_schema.table_constraints where constraint_schema=database() and constraint_type='FOREIGN KEY'",Integer.class)>=15);
        for(String table:List.of("payments","deliveries")) {
            assertTrue(jdbc.queryForObject("select count(*) from information_schema.statistics where table_schema=database() and table_name=? and column_name='order_id' and non_unique=0",Integer.class,table)>0);
        }
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("insert into cart_items(quantity,cart_id,restaurant_food_item_id) values (1,999999999,999999999)"));
    }
}

