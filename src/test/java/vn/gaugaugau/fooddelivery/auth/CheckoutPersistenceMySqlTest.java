package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.io.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.security.*;
import vn.gaugaugau.fooddelivery.auth.service.AuthService;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.service.*;

@org.junit.jupiter.api.condition.EnabledIf("enabled")
@SpringBootTest(properties={"spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_coursework_a23}?allowPublicKeyRetrieval=true&sslMode=DISABLED",
 "spring.datasource.username=${FOOD_TEST_DB_USERNAME:coursework_a23_app}","spring.datasource.password=${STAGE2_MYSQL_PASSWORD}","spring.jpa.hibernate.ddl-auto=validate","spring.jpa.open-in-view=false","logging.level.root=WARN"})
class CheckoutPersistenceMySqlTest extends AuthTestKeys {
    static boolean enabled(){return ApprovedMySqlTestTarget.enabled("RUN_A23_MYSQL_TESTS");}
    @Autowired EntityManager em;@Autowired JdbcTemplate jdbc;@Autowired PlatformTransactionManager manager;
    @Autowired RestaurantFoodItemService menu;@Autowired MenuExcelExportService excel;
    @Autowired AuthService auth;@Autowired AdminManagementService admin;@Autowired RestaurantExcelExportService adminExcel;
    @Autowired CartItemService cart;@Autowired OrderService orders;
    @Autowired OrderExcelExportService orderExcel;@Autowired RestaurantManagementService restaurantRead;
    Actor restaurant,other,customer,administrator;Long food,otherFood;String tag=UUID.randomUUID().toString();
    @BeforeEach void fixtures(){
        ApprovedMySqlTestTarget.assertCourseworkTarget(jdbc,"fooddelivery_coursework_a23");
        new TransactionTemplate(manager).executeWithoutResult(tx->{
            restaurant=profile(Role.RESTAURANT);other=profile(Role.RESTAURANT);customer=profile(Role.CUSTOMER);administrator=profile(Role.ADMIN);
            food=food("100%_! Phở "+tag,"Phở","Hà Nội");otherFood=food("Other "+tag,"Cơm","Other");
        });as(restaurant);
    }
    Actor profile(Role role){
        String email=UUID.randomUUID()+"@menu-test.example",hash=new BCryptPasswordEncoder(4).encode(UUID.randomUUID().toString());var a=Account.builder().email(email).passwordHash(hash).role(role).build();
        if(role==Role.RESTAURANT){var p=Restaurant.builder().name("Bếp "+tag).email(email).password(hash).address("Hà Nội").phoneNumber("0901234567").restaurantStatus(true).build();em.persist(p);a.setRestaurant(p);}
        if(role==Role.CUSTOMER){var p=Customer.builder().name("Khách").email(email).password(hash).address("Hà Nội").phoneNumber("0901234567").build();em.persist(p);a.setCustomer(p);}
        em.persist(a);var now=LocalDateTime.now(Clock.systemUTC());var session=AuthSession.builder().account(a).createdAt(now).expiresAt(now.plusHours(1)).build();em.persist(session);em.flush();return Actor.from(a,session.getSessionId());
    }
    Long food(String name,String category,String description){var f=FoodItem.builder().name(name).category(category).description(description).build();em.persist(f);return f.getItemId();}
    void as(Actor a){SecurityContextHolder.getContext().setAuthentication(new ActorAuthentication(a));}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    RestaurantFoodItemRequestDTO input(Long id,BigDecimal price,boolean active){return RestaurantFoodItemRequestDTO.builder().restaurantId(restaurant.restaurantId()).foodItemId(id).price(price).isAvailable(active).build();}
    RestaurantFoodItemResponseDTO add(Long id){return menu.createRestaurantFoodItem(input(id,new BigDecimal("25000.50"),true));}
    String sheet(byte[] bytes)throws Exception{try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))){ZipEntry e;while((e=zip.getNextEntry())!=null)if(e.getName().equals("xl/worksheets/sheet1.xml"))return new String(zip.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}throw new AssertionError("Missing sheet");}
    @Test void createsAndReadsRealRelationsByIdAndOwnCatalogId(){
        var saved=menu.createRestaurantFoodItem(input(food,new BigDecimal("9999999999.99"),false));var stored=menu.getRestaurantFoodItemById(saved.getRestaurantFoodItemId());
        assertEquals(restaurant.restaurantId(),stored.getRestaurant().getRestaurantId());assertEquals(food,stored.getFoodItem().getItemId());assertEquals(0,new BigDecimal("9999999999.99").compareTo(stored.getPrice()));assertFalse(stored.getIsAvailable());assertEquals(saved.getRestaurantFoodItemId(),excel.ownByFood(food).getRestaurantFoodItemId());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM restaurant_food_items WHERE restaurant_id=? AND item_id=?",Integer.class,restaurant.restaurantId(),food));
    }
    @Test void duplicateIsRejectedAndRollbackRemovesFlushedMenu(){
        add(food);assertThrows(RuntimeException.class,()->add(food));
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(manager).executeWithoutResult(tx->{add(otherFood);em.flush();throw new IllegalStateException("Rollback after real INSERT");}));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM restaurant_food_items WHERE restaurant_id=? AND item_id=?",Integer.class,restaurant.restaurantId(),otherFood));
    }
    @Test void twoConcurrentAddsUseUniqueConstraintWithoutDuplicatingMenu()throws Exception {
        var executor=Executors.newFixedThreadPool(2);var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        try{List<Future<String>> jobs=new ArrayList<>();for(int i=0;i<2;i++)jobs.add(executor.submit(()->{as(restaurant);ready.countDown();start.await();try{add(food);return "OK";}catch(vn.gaugaugau.fooddelivery.utils.exception.ResourceAlreadyExistsException|org.springframework.dao.DataIntegrityViolationException e){return "CONFLICT";}finally{clear();}}));
            assertTrue(ready.await(5,TimeUnit.SECONDS));start.countDown();var results=new ArrayList<String>();for(var job:jobs)results.add(job.get(20,TimeUnit.SECONDS));Collections.sort(results);assertEquals(List.of("CONFLICT","OK"),results);
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM restaurant_food_items WHERE restaurant_id=? AND item_id=?",Integer.class,restaurant.restaurantId(),food));
        }finally{executor.shutdownNow();}
    }
    @Test void changingPriceAndAvailabilityPreservesActualCheckoutSnapshot(){
        var item=add(food);as(customer);cart.addCartItemToCart(customer.customerId(),CartItemRequestDTO.builder().restaurantFoodItemId(item.getRestaurantFoodItemId()).quantity(2).build());
        Long cod=jdbc.queryForObject("SELECT method_id FROM payment_methods WHERE method_code='COD'",Long.class);
        var order=orders.createOrder(customer.customerId(),OrderRequestDTO.builder().deliveryAddress("12 Hà Nội").paymentMethodId(cod).build());
        as(restaurant);menu.updateRestaurantFoodItemById(item.getRestaurantFoodItemId(),RestaurantFoodItemUpdateDTO.builder().price(new BigDecimal("28000.75")).isAvailable(false).expectedPrice(new BigDecimal("25000.50")).expectedIsAvailable(true).build());
        assertEquals(0,new BigDecimal("25000.50").compareTo(jdbc.queryForObject("SELECT unit_price FROM order_details WHERE order_id=?",BigDecimal.class,order.getOrderId())));
        assertEquals(0,new BigDecimal("50001.00").compareTo(jdbc.queryForObject("SELECT subtotal FROM orders WHERE order_id=?",BigDecimal.class,order.getOrderId())));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->menu.deleteRestaurantFoodItemById(item.getRestaurantFoodItemId()));
    }
    @Test void otherRestaurantCannotWriteLookupOrExportOurMenu(){
        var stored=add(food);as(other);assertThrows(vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException.class,()->menu.createRestaurantFoodItem(input(otherFood,new BigDecimal("1"),true)));
        assertThrows(vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException.class,()->menu.updateRestaurantFoodItemById(stored.getRestaurantFoodItemId(),RestaurantFoodItemUpdateDTO.builder().price(BigDecimal.ONE).build()));
        assertThrows(vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException.class,()->excel.ownByFood(food));
        var query=excel.prepare(Map.of());assertEquals(other.restaurantId(),query.arguments().getFirst());
        assertEquals(0,new BigDecimal("25000.50").compareTo(jdbc.queryForObject("SELECT price FROM restaurant_food_items WHERE restaurant_food_item_id=?",BigDecimal.class,stored.getRestaurantFoodItemId())));
    }
    @Test void exportsAllOwnRowsWithLiteralFiltersTypedMoneyAndEmptyResult()throws Exception {
        var ids=new ArrayList<Long>();new TransactionTemplate(manager).executeWithoutResult(tx->{for(int i=0;i<15;i++)ids.add(food("Menu "+tag+" "+i,"Phở","Dữ liệu"));});
        for(int i=0;i<ids.size();i++)menu.createRestaurantFoodItem(input(ids.get(i),new BigDecimal("25000.50").add(BigDecimal.valueOf(i)),i%2==0));
        add(food);var out=new ByteArrayOutputStream();excel.write(excel.prepare(Map.of("q",tag,"sort","price-desc")),out);String xml=sheet(out.toByteArray());assertEquals(17,xml.split("<row ",-1).length-1);assertTrue(xml.contains("t='n' s='2'"));assertFalse(xml.contains("<f>"));
        out.reset();excel.write(excel.prepare(Map.of("q","100%_!")),out);assertEquals(2,sheet(out.toByteArray()).split("<row ",-1).length-1);
        out.reset();excel.write(excel.prepare(Map.of("q","missing-"+UUID.randomUUID())),out);assertEquals(1,sheet(out.toByteArray()).split("<row ",-1).length-1);
        assertThrows(RuntimeException.class,()->excel.prepare(Map.of("restaurantId",other.restaurantId().toString())));assertThrows(RuntimeException.class,()->excel.prepare(Map.of("page","1")));assertThrows(RuntimeException.class,()->excel.prepare(Map.of("sort","m.password")));
    }
    @Test void exportIsRestaurantOnlyAndCannotLeakThroughAdminOrCustomer(){
        for(var actor:List.of(administrator,customer)){as(actor);assertThrows(AccessDeniedException.class,()->excel.prepare(Map.of()));assertThrows(AccessDeniedException.class,()->excel.ownByFood(food));}
    }
    @Test void a21CreateReadExportAndRollbackRemainWorkingOnTheNewDatabase()throws Exception {
        as(administrator);String email=UUID.randomUUID()+"@a21-regression.example";
        var input=RestaurantRequestDTO.builder().name("A21 hồi quy "+tag).email(email).password(UUID.randomUUID()+"-Password").phoneNumber("0901234567").address("Hà Nội").build();
        var created=auth.createRestaurant(input);assertEquals(created.accountId(),admin.restaurant(created.restaurantId()).accountId());
        var out=new ByteArrayOutputStream();adminExcel.write(admin.restaurantExportQuery(Map.of("q","A21 hồi quy "+tag)),out);assertTrue(sheet(out.toByteArray()).contains("Tên nhà hàng"));assertTrue(sheet(out.toByteArray()).contains("autoFilter ref='A1:I2'"));
        String rollback=UUID.randomUUID()+"@rollback.example";input.setEmail(rollback);
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(manager).executeWithoutResult(tx->{auth.createRestaurant(input);throw new IllegalStateException("Rollback both profile/account");}));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM restaurants WHERE email=?",Integer.class,rollback));
    }

    Long cod(){return jdbc.queryForObject("SELECT method_id FROM payment_methods WHERE method_code='COD'",Long.class);}
    Long cartWithFood(){as(restaurant);var item=add(food);as(customer);cart.addCartItemToCart(customer.customerId(),CartItemRequestDTO.builder().restaurantFoodItemId(item.getRestaurantFoodItemId()).quantity(2).build());return item.getRestaurantFoodItemId();}
    OrderRequestDTO request(Long method){return OrderRequestDTO.builder().deliveryAddress("12 Hà Nội").paymentMethodId(method).build();}
    @Test void checkoutReadbackMoneyRelationsPaymentAndDeferredDelivery(){cartWithFood();var o=orders.createOrder(customer.customerId(),request(cod()));assertEquals(0,new BigDecimal("65001.00").compareTo(o.getTotalAmount()));assertEquals(0,new BigDecimal("50001.00").compareTo(o.getSubtotal()));assertEquals(0,new BigDecimal("15000").compareTo(o.getShippingFee()));assertEquals(o.getOrderId(),orders.getOrderByOrderId(o.getOrderId()).getOrderId());assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM cart_items i JOIN carts c ON c.cart_id=i.cart_id WHERE c.customer_id=?",Integer.class,customer.customerId()));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE order_id=? AND payment_status='PENDING' AND amount=65001.00",Integer.class,o.getOrderId()));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM deliveries WHERE order_id=?",Integer.class,o.getOrderId()));as(restaurant);orders.updateOrderStatus(o.getOrderId(),vn.gaugaugau.fooddelivery.model.enums.OrderStatus.CONFIRMED);assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM deliveries WHERE order_id=? AND delivery_status='PENDING'",Integer.class,o.getOrderId()));}
    @Test void paymentFailureRollsBackOrderDetailsPaymentAndPreservesCart(){cartWithFood();long before=jdbc.queryForObject("SELECT COUNT(*) FROM orders",Long.class);assertThrows(RuntimeException.class,()->orders.createOrder(customer.customerId(),request(Long.MAX_VALUE)));assertEquals(before,jdbc.queryForObject("SELECT COUNT(*) FROM orders",Long.class));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM cart_items i JOIN carts c ON c.cart_id=i.cart_id WHERE c.customer_id=?",Integer.class,customer.customerId()));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM order_details d LEFT JOIN orders o ON o.order_id=d.order_id WHERE o.order_id IS NULL",Integer.class));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM payments p LEFT JOIN orders o ON o.order_id=p.order_id WHERE o.order_id IS NULL",Integer.class));}
    @Test void unavailableFoodAndInactiveRestaurantRejectWithoutClearingCart(){Long id=cartWithFood();as(restaurant);menu.updateRestaurantFoodItemById(id,RestaurantFoodItemUpdateDTO.builder().price(new BigDecimal("25000.50")).isAvailable(false).build());as(customer);assertThrows(RuntimeException.class,()->orders.createOrder(customer.customerId(),request(cod())));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE customer_id=?",Integer.class,customer.customerId()));jdbc.update("UPDATE restaurants SET restaurant_status=0 WHERE restaurant_id=?",restaurant.restaurantId());assertThrows(RuntimeException.class,()->orders.createOrder(customer.customerId(),request(cod())));}
    @Test void concurrentCheckoutSerializesOneCartIntoExactlyOneOrder()throws Exception {cartWithFood();Long method=cod();var pool=Executors.newFixedThreadPool(2);var ready=new CountDownLatch(2);var start=new CountDownLatch(1);try{var jobs=new ArrayList<Future<Boolean>>();for(int i=0;i<2;i++)jobs.add(pool.submit(()->{as(customer);ready.countDown();start.await();try{orders.createOrder(customer.customerId(),request(method));return true;}catch(org.springframework.web.server.ResponseStatusException e){assertEquals(409,e.getStatusCode().value());return false;}finally{clear();}}));assertTrue(ready.await(5,TimeUnit.SECONDS));start.countDown();int successes=0;for(var job:jobs)if(job.get(30,TimeUnit.SECONDS))successes++;assertEquals(1,successes);assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE customer_id=?",Integer.class,customer.customerId()));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM payments p JOIN orders o ON o.order_id=p.order_id WHERE o.customer_id=?",Integer.class,customer.customerId()));}finally{pool.shutdownNow();}}
    @Test void orderExportRoleScopeFiltersAndOneRowDespiteMultipleDetails()throws Exception {Long id=cartWithFood();as(restaurant);var second=add(otherFood);as(customer);cart.addCartItemToCart(customer.customerId(),CartItemRequestDTO.builder().restaurantFoodItemId(second.getRestaurantFoodItemId()).quantity(1).build());var o=orders.createOrder(customer.customerId(),request(cod()));assertThrows(AccessDeniedException.class,()->restaurantRead.orderExportQuery(Map.of()));assertThrows(AccessDeniedException.class,()->admin.orderExportQuery(Map.of()));as(restaurant);var out=new ByteArrayOutputStream();orderExcel.write(restaurantRead.orderExportQuery(Map.of("q",o.getOrderId().toString())),out);String xml=sheet(out.toByteArray());assertEquals(2,xml.split("<row ",-1).length-1);assertEquals(3,xml.split("t='n'",-1).length-1);assertFalse(xml.contains("12 Hà Nội"));assertFalse(xml.contains("<f>"));as(other);out=new ByteArrayOutputStream();orderExcel.write(restaurantRead.orderExportQuery(Map.of("q",o.getOrderId().toString())),out);assertEquals(1,sheet(out.toByteArray()).split("<row ",-1).length-1);as(administrator);out=new ByteArrayOutputStream();orderExcel.write(admin.orderExportQuery(Map.of("customerId",customer.customerId().toString())),out);assertEquals(2,sheet(out.toByteArray()).split("<row ",-1).length-1);}
    @Test void orderExportRejectsUnknownScopePaginationSortDatesAndFilters(){as(restaurant);for(var p:List.of(Map.of("restaurantId","1"),Map.of("page","0"),Map.of("size","1"),Map.of("status","WRONG"),Map.of("sort","password"),Map.of("from","2026-11-12","to","2026-11-11")))assertThrows(org.springframework.web.server.ResponseStatusException.class,()->restaurantRead.orderExportQuery(p));as(administrator);for(var p:List.of(Map.of("page","0"),Map.of("paymentStatus","WRONG"),Map.of("restaurantId","-1"),Map.of("sort","total-desc")))assertThrows(org.springframework.web.server.ResponseStatusException.class,()->admin.orderExportQuery(p));}
}
