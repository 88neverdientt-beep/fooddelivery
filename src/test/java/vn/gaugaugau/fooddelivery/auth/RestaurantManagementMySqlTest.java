package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import vn.gaugaugau.fooddelivery.auth.model.Account;
import vn.gaugaugau.fooddelivery.auth.model.Role;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.enums.*;

/** Real MySQL/filter-chain tests. Concurrency fixtures commit only in the isolated test database. */
@EnabledIfEnvironmentVariable(named = "RUN_STAGE4_MYSQL_TESTS", matches = "true")
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_stage4_e2e}?allowPublicKeyRetrieval=true&sslMode=DISABLED",
    "spring.datasource.username=${FOOD_TEST_DB_USERNAME:stage4_app}", "spring.datasource.password=${STAGE2_MYSQL_PASSWORD}",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false",
    "spring.jpa.properties.hibernate.generate_statistics=true", "spring.jpa.show-sql=false", "logging.level.root=WARN"
})
@AutoConfigureMockMvc(print = org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
@Transactional
class RestaurantManagementMySqlTest extends AuthTestKeys {
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory factory;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    final String password = UUID.randomUUID() + "-Test";
    final String hash = new BCryptPasswordEncoder(4).encode(password);
    final String tag = "Read_" + UUID.randomUUID();
    record Person(Long account, Long profile, String email) {}
    final Map<String, Person> people = new HashMap<>();
    final Map<String, String> tokens = new HashMap<>();
    Long restaurant, otherRestaurant, cod, literalMenu, unavailableMenu;

    @BeforeEach void fixtures() {
        ApprovedMySqlTestTarget.assertTarget(jdbc);
        assertEquals(ApprovedMySqlTestTarget.databaseName(), jdbc.queryForObject("SELECT DATABASE()", String.class));
        for (String name : List.of("CUSTOMER", "CUSTOMER2", "RESTAURANT", "DRIVER", "ADMIN")) {
            Role role = Role.valueOf(name.replace("2", ""));
            String email = UUID.randomUUID() + "@read-api.test";
            Account account = Account.builder().email(email).passwordHash(hash).role(role).build();
            Long profile = null;
            if (role == Role.CUSTOMER) {
                var customer = Customer.builder().name("Private read customer").email(email).password(hash)
                    .phoneNumber("0901234567").address("Private read address").build();
                em.persist(customer); account.setCustomer(customer); profile = customer.getCustomerId();
            } else if (role == Role.RESTAURANT) {
                var store = Restaurant.builder().name(tag + " 100%_! cafe").email(email).password(hash)
                    .phoneNumber("0901234567").address("Public restaurant address").restaurantStatus(true).build();
                em.persist(store); account.setRestaurant(store); profile = store.getRestaurantId(); restaurant = profile;
            } else if (role == Role.DRIVER) {
                var driver = Driver.builder().name("Private read driver").email(email).password(hash)
                    .phoneNumber("0901234567").address("Private read address").driveStatus(true).build();
                em.persist(driver); account.setDriver(driver); profile = driver.getDriverId();
            }
            em.persist(account); people.put(name, new Person(account.getAccountId(), profile, email));
        }
        for (int index = 0; index < 2; index++) {
            var store = Restaurant.builder().name(tag + " ordinary " + index).email(UUID.randomUUID() + "@read-api.test")
                .password(hash).phoneNumber("0901234567").address("Public restaurant address")
                .restaurantStatus(index == 0).build(); em.persist(store); otherRestaurant = store.getRestaurantId();
        }
        var store = em.find(Restaurant.class, restaurant);
        for (int index = 0; index < 3; index++) {
            var food = FoodItem.builder().name(tag + (index == 0 ? " literal 100%_! dish" : " dish " + index))
                .description(index == 0 ? "Special literal 100%_! description" : "Ordinary meal")
                .category(index == 0 ? "  " + tag + " category  " : index == 1 ? tag + " category" : " ").build(); em.persist(food);
            var menu = RestaurantFoodItem.builder().restaurant(store).foodItem(food)
                .price(BigDecimal.valueOf(20000 + 1000 * index)).isAvailable(index != 1).build(); em.persist(menu);
            if (index == 0) literalMenu = menu.getRestaurantFoodItemId();
            if (index == 1) unavailableMenu = menu.getRestaurantFoodItemId();
        }
        var method = em.createQuery("select p from PaymentMethod p where p.paymentMethodCode='COD'", PaymentMethod.class).getSingleResult();
        cod = method.getPaymentMethodId();
        for (String name : List.of("CUSTOMER", "CUSTOMER2")) for (int index = 0; index < 5; index++) {
            var customer = em.find(Customer.class, people.get(name).profile());
            var state = index >= 3 ? OrderStatus.COMPLETED : OrderStatus.PENDING;
            var order = Order.builder().customer(customer).restaurant(store).deliveryAddress("Private test delivery address")
                .subtotal(new BigDecimal("20000")).shippingFee(new BigDecimal("15000")).totalAmount(new BigDecimal("35000"))
                .orderStatus(state).build(); em.persist(order);
            var detail = OrderDetail.builder().order(order).restaurantFoodItem(em.find(RestaurantFoodItem.class, literalMenu))
                .quantity(1).unitPrice(new BigDecimal("20000")).subtotal(new BigDecimal("20000")).build(); em.persist(detail);
            var payment = Payment.builder().order(order).paymentMethod(method).amount(new BigDecimal("35000"))
                .paymentStatus(state == OrderStatus.COMPLETED ? PaymentStatus.SUCCESS : PaymentStatus.PENDING).build(); em.persist(payment);
            if (state == OrderStatus.COMPLETED) {
                var delivery = Delivery.builder().order(order).driver(em.find(Driver.class, people.get("DRIVER").profile()))
                    .deliveryStatus(DeliveryStatus.DELIVERED).pickupTime(LocalDateTime.now().minusMinutes(10))
                    .deliveredTime(LocalDateTime.now()).build(); em.persist(delivery);
            }
            var rating = Rating.builder().customer(customer).restaurant(store).ratingScore(4).comment("Public review " + index).build(); em.persist(rating);
        }
        em.flush(); em.clear();
    }

    Map<?, ?> body(MvcResult result) throws Exception {
        return json.readValue(result.getResponse().getContentAsString(), Map.class);
    }
    Map<?, ?> page(MvcResult result) throws Exception {
        assertEquals(200, result.getResponse().getStatus()); return (Map<?, ?>) body(result).get("data");
    }
    List<?> items(Map<?, ?> page) { return (List<?>) page.get("items"); }
    String login(String role) throws Exception {
        if (tokens.containsKey(role)) return tokens.get(role);
        var csrf = mvc.perform(get("/auth/csrf")).andReturn();
        var response = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
            .cookie(csrf.getResponse().getCookie("XSRF-TOKEN")).header("X-XSRF-TOKEN", body(csrf).get("token"))
            .content(json.writeValueAsString(Map.of("email", people.get(role).email(), "password", password)))).andReturn();
        assertEquals(200, response.getResponse().getStatus());
        String token = (String) ((Map<?, ?>) body(response).get("data")).get("accessToken");
        tokens.put(role, token); return token;
    }
    MockHttpServletRequestBuilder authenticated(String path, String role) throws Exception {
        return get(path).header("Authorization", "Bearer " + login(role));
    }


    MvcResult change(String role,Map<String,Object> value) throws Exception {
        return mvc.perform(put("/restaurant-food-items/"+literalMenu).header("Authorization","Bearer "+login(role)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(value))).andReturn();
    }
    @Test void managementProfileUsesPrincipalAndExcludesCredentialFields() throws Exception {
        var result=(Map<?,?>)body(mvc.perform(authenticated("/restaurant-management/profile?restaurantId="+otherRestaurant,"RESTAURANT")).andReturn()).get("data");
        assertEquals(restaurant.longValue(),((Number)result.get("restaurantId")).longValue());
        assertEquals(Set.of("restaurantId","name","address","phoneNumber","restaurantStatus","createdAt"),result.keySet());
        for(String path:List.of("profile","catalog","orders","analytics")) {
            assertEquals(401,mvc.perform(get("/restaurant-management/"+path)).andReturn().getResponse().getStatus());
            for(String role:List.of("CUSTOMER","DRIVER","ADMIN"))assertEquals(403,mvc.perform(authenticated("/restaurant-management/"+path,role)).andReturn().getResponse().getStatus());
        }
    }
    @Test void catalogExcludesOwnLinkedItemsAndBoundsInput() throws Exception {
        var f=FoodItem.builder().name(tag+" unused 100%_!").category("Test").description("Catalog").build();em.persist(f);em.flush();
        var value=page(mvc.perform(authenticated("/restaurant-management/catalog","RESTAURANT").param("q",tag).param("size","1")).andReturn());
        assertEquals(1L,((Number)value.get("totalElements")).longValue());assertEquals(f.getItemId().longValue(),((Number)((Map<?,?>)items(value).getFirst()).get("itemId")).longValue());
        assertEquals(400,mvc.perform(authenticated("/restaurant-management/catalog","RESTAURANT").param("size","51")).andReturn().getResponse().getStatus());
    }
    @Test void orderListIsOwnerScopedFilteredAndSearchable() throws Exception {
        var value=page(mvc.perform(authenticated("/restaurant-management/orders","RESTAURANT").param("status","COMPLETED").param("size","2")).andReturn());
        assertEquals(4L,((Number)value.get("totalElements")).longValue());assertEquals(2,items(value).size());
        assertEquals(400,mvc.perform(authenticated("/restaurant-management/orders","RESTAURANT").param("sort","password")).andReturn().getResponse().getStatus());
        var ids=items(value).stream().map(v->((Map<?,?>)v).get("orderId").toString()).toList();
        var exact=page(mvc.perform(authenticated("/restaurant-management/orders","RESTAURANT").param("q",ids.getFirst())).andReturn());assertEquals(1,items(exact).size());
    }
    @Test void aggregatesUseCompletePaidCompletedOrdersAndExcludeShipping() throws Exception {
        jdbc.update("UPDATE payments p JOIN orders o ON p.order_id=o.order_id SET p.paid_at=NOW() WHERE o.restaurant_id=? AND o.order_status='COMPLETED'",restaurant);
        var data=(Map<?,?>)body(mvc.perform(authenticated("/restaurant-management/analytics","RESTAURANT")).andReturn()).get("data");
        assertEquals(10,((Number)data.get("totalOrders")).intValue());assertEquals(4,((Number)data.get("paidOrderCount")).intValue());assertEquals(80000,((Number)data.get("paidFoodValue")).intValue());assertEquals(60000,((Number)data.get("paidShipping")).intValue());
        assertEquals(10,((Number)data.get("ratingsCount")).intValue());assertEquals(2,((Number)data.get("activeMenuCount")).intValue());
        assertEquals(400,mvc.perform(authenticated("/restaurant-management/analytics","RESTAURANT").param("from","2026-01-01").param("to","2026-12-31")).andReturn().getResponse().getStatus());
    }
    @Test void restaurantOrderGraphHasBoundedQueriesWithOsivDisabled() throws Exception {
        String path = "/restaurant-management/orders";
        login("RESTAURANT");
        var statistics = factory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        em.clear(); statistics.clear();
        var smallPage = page(mvc.perform(authenticated(path, "RESTAURANT").param("size", "1")).andReturn());
        assertEquals(1, items(smallPage).size());
        long small = statistics.getPrepareStatementCount();
        em.clear(); statistics.clear();
        var largePage = page(mvc.perform(authenticated(path, "RESTAURANT").param("size", "8")).andReturn());
        assertEquals(8, items(largePage).size());
        long large = statistics.getPrepareStatementCount();
        assertTrue(large <= small + 2, "Growing restaurant pages must not introduce per-order queries");
        assertTrue(large <= 15, "Authentication and bounded detail graph must remain bounded");
    }
    @Test void conditionalUpdateRejectsStaleAndPartialRequestsWithoutChangingHistory() throws Exception {
        assertEquals(400,change("RESTAURANT",Map.of("price",21000,"expectedPrice",20000)).getResponse().getStatus());
        assertEquals(200,change("RESTAURANT",Map.of("price",21000,"isAvailable",false,"expectedPrice",20000,"expectedIsAvailable",true)).getResponse().getStatus());
        assertEquals(409,change("RESTAURANT",Map.of("price",22000,"isAvailable",true,"expectedPrice",20000,"expectedIsAvailable",true)).getResponse().getStatus());
        assertEquals(21000,jdbc.queryForObject("SELECT price FROM restaurant_food_items WHERE restaurant_food_item_id=?",BigDecimal.class,literalMenu).intValue());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM order_details WHERE restaurant_food_item_id=? AND unit_price<>20000",Integer.class,literalMenu));
        assertEquals(200,change("RESTAURANT",Map.of("price",24000,"isAvailable",true)).getResponse().getStatus());
    }
    @Test void twoConditionalUpdatesWithSameBaselineHaveOnlyOneWinner() throws Exception {
        String token=login("RESTAURANT");
        org.springframework.test.context.transaction.TestTransaction.flagForCommit();org.springframework.test.context.transaction.TestTransaction.end();
        var pool=java.util.concurrent.Executors.newFixedThreadPool(2);var gate=new java.util.concurrent.CyclicBarrier(2);
        try {
            java.util.concurrent.Callable<Integer> call=()->{gate.await();return mvc.perform(put("/restaurant-food-items/"+literalMenu).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("price",23000,"isAvailable",false,"expectedPrice",20000,"expectedIsAvailable",true)))).andReturn().getResponse().getStatus();};
            var a=pool.submit(call);var b=pool.submit(call);assertEquals(List.of(200,409),java.util.stream.Stream.of(a.get(30,java.util.concurrent.TimeUnit.SECONDS),b.get(30,java.util.concurrent.TimeUnit.SECONDS)).sorted().toList());
            assertEquals(23000,jdbc.queryForObject("SELECT price FROM restaurant_food_items WHERE restaurant_food_item_id=?",BigDecimal.class,literalMenu).intValue());
        } finally {pool.shutdownNow();}
    }
}
