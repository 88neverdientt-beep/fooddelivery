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
@EnabledIfEnvironmentVariable(named = "RUN_STAGE6_MYSQL_TESTS", matches = "true")
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_stage6_e2e}?sslMode=REQUIRED",
    "spring.datasource.username=${FOOD_TEST_DB_USERNAME:stage6_app}", "spring.datasource.password=${STAGE2_MYSQL_PASSWORD}",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false",
    "spring.jpa.properties.hibernate.generate_statistics=true", "spring.jpa.show-sql=false", "logging.level.root=WARN"
})
@AutoConfigureMockMvc(print = org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
@Transactional
class DriverManagementMySqlTest extends AuthTestKeys {
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
    Long restaurant, cod;
    final List<Long> ownIds = new ArrayList<>(), otherIds = new ArrayList<>(), availableIds = new ArrayList<>();

    @BeforeEach void fixtures() {
        ApprovedMySqlTestTarget.assertTarget(jdbc);
        for (String name : List.of("CUSTOMER", "RESTAURANT", "DRIVER", "DRIVER2", "DRIVER3", "ADMIN")) {
            Role role = Role.valueOf(name.replace("2", "").replace("3", ""));
            String email = UUID.randomUUID() + "@driver-api.test";
            Account account = Account.builder().email(email).passwordHash(hash).role(role).build();
            Long profile = null;
            if (role == Role.CUSTOMER) {
                var value = Customer.builder().name("QA customer").email(email).password(hash)
                    .phoneNumber("0901234567").address("QA contact address").build();
                em.persist(value); profile=value.getCustomerId(); account.setCustomer(value);
            } else if (role == Role.RESTAURANT) {
                var value = Restaurant.builder().name(tag+" 100%_! pickup").email(email).password(hash)
                    .phoneNumber("0901234567").address("QA pickup address").restaurantStatus(true).build();
                em.persist(value); profile=value.getRestaurantId(); restaurant=profile; account.setRestaurant(value);
            } else if (role == Role.DRIVER) {
                var value = Driver.builder().name("QA "+name).email(email).password(hash).phoneNumber("0901234567")
                    .address("QA driver address").licensePlate("TEST-06").driveStatus(true).build();
                em.persist(value); profile=value.getDriverId(); account.setDriver(value);
            }
            em.persist(account); people.put(name,new Person(account.getAccountId(),profile,email));
        }
        var food = FoodItem.builder().name(tag+" dish").category("Com").description("QA catalog").build(); em.persist(food);
        var menu = RestaurantFoodItem.builder().restaurant(em.find(Restaurant.class,restaurant)).foodItem(food)
            .price(new BigDecimal("20000")).isAvailable(true).build(); em.persist(menu);
        var method = em.createQuery("select p from PaymentMethod p where p.paymentMethodCode='COD'",PaymentMethod.class).getSingleResult();
        cod=method.getPaymentMethodId();
        for (DeliveryStatus state : List.of(DeliveryStatus.PENDING, DeliveryStatus.PENDING, DeliveryStatus.PICKED_UP,
                DeliveryStatus.DELIVERING, DeliveryStatus.DELIVERED, DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED))
            ownIds.add(delivery("DRIVER",state,null,menu,method));
        otherIds.add(delivery("DRIVER2",DeliveryStatus.DELIVERED,null,menu,method));
        availableIds.add(delivery(null,DeliveryStatus.PENDING,OrderStatus.CONFIRMED,menu,method));
        availableIds.add(delivery(null,DeliveryStatus.PENDING,OrderStatus.READY,menu,method));
        // Inconsistent negative fixture must never be advertised as acceptable work.
        delivery(null,DeliveryStatus.PENDING,OrderStatus.CANCELLED,menu,method);
        em.flush(); em.clear();
    }
    Long delivery(String driver, DeliveryStatus state, OrderStatus override, RestaurantFoodItem menu, PaymentMethod method) {
        OrderStatus status = override != null ? override : switch(state) {
            case PENDING -> OrderStatus.CONFIRMED; case PICKED_UP -> OrderStatus.READY;
            case DELIVERING -> OrderStatus.DELIVERING; case DELIVERED -> OrderStatus.COMPLETED;
            case CANCELLED -> OrderStatus.CANCELLED;
        };
        var order = Order.builder().customer(em.find(Customer.class,people.get("CUSTOMER").profile()))
            .restaurant(em.find(Restaurant.class,restaurant)).deliveryAddress("QA dropoff private")
            .subtotal(new BigDecimal("20000")).shippingFee(new BigDecimal("15000")).totalAmount(new BigDecimal("35000"))
            .orderStatus(status).build(); em.persist(order);
        em.persist(OrderDetail.builder().order(order).restaurantFoodItem(menu).quantity(1)
            .unitPrice(new BigDecimal("20000")).subtotal(new BigDecimal("20000")).build());
        em.persist(Payment.builder().order(order).paymentMethod(method).amount(new BigDecimal("35000"))
            .paymentStatus(state==DeliveryStatus.DELIVERED ? PaymentStatus.SUCCESS : status==OrderStatus.CANCELLED ? PaymentStatus.CANCELLED : PaymentStatus.PENDING).build());
        var now=LocalDateTime.now().withNano(0);
        var value=Delivery.builder().order(order).driver(driver==null ? null : em.find(Driver.class,people.get(driver).profile()))
            .deliveryStatus(state).pickupTime(List.of(DeliveryStatus.PICKED_UP,DeliveryStatus.DELIVERING,DeliveryStatus.DELIVERED).contains(state)?now.minusHours(1):null)
            .deliveredTime(state==DeliveryStatus.DELIVERED?now:null).build(); em.persist(value); return value.getDeliveryId();
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


    @Test void allNewEndpointsRequireDriverAndExposeNoOtherRoleData() throws Exception {
        for (String path : List.of("deliveries","deliveries/"+ownIds.getFirst(),"available","analytics")) {
            assertEquals(401,mvc.perform(get("/driver-management/"+path)).andReturn().getResponse().getStatus());
            for(String role:List.of("CUSTOMER","RESTAURANT","ADMIN"))
                assertEquals(403,mvc.perform(authenticated("/driver-management/"+path,role)).andReturn().getResponse().getStatus());
        }
    }
    @Test void assignedPagesAndHistoryUsePrincipalAndLiteralSearch() throws Exception {
        var active=page(mvc.perform(authenticated("/driver-management/deliveries","DRIVER").param("driverId",people.get("DRIVER2").profile().toString()).param("size","2")).andReturn());
        assertEquals(4,((Number)active.get("totalElements")).intValue()); assertEquals(2,items(active).size());
        for(var item:items(active))assertEquals(people.get("DRIVER").profile().longValue(),((Number)((Map<?,?>)item).get("driverId")).longValue());
        var history=page(mvc.perform(authenticated("/driver-management/deliveries","DRIVER").param("scope","history")).andReturn());
        assertEquals(3,items(history).size());
        var all=page(mvc.perform(authenticated("/driver-management/deliveries","DRIVER").param("scope","all").param("q",tag+" 100%_!")).andReturn());
        assertEquals(7,items(all).size());
        assertEquals(0,items(page(mvc.perform(authenticated("/driver-management/deliveries","DRIVER").param("q","missing-"+tag)).andReturn())).size());
    }
    @Test void availablePagesAreBoundedAndDoNotDiscloseCustomerOrPaymentData() throws Exception {
        var value=page(mvc.perform(authenticated("/driver-management/available","DRIVER").param("q",tag).param("size","1")).andReturn());
        assertEquals(2,((Number)value.get("totalElements")).intValue()); assertEquals(1,items(value).size());
        assertEquals(Set.of("deliveryId","orderId","restaurantId","restaurantName","restaurantAddress"),((Map<?,?>)items(value).getFirst()).keySet());
        jdbc.update("UPDATE drivers SET drive_status=0 WHERE driver_id=?",people.get("DRIVER").profile()); em.clear();
        assertEquals(404,mvc.perform(authenticated("/driver-management/available","DRIVER")).andReturn().getResponse().getStatus());
        assertEquals(200,mvc.perform(authenticated("/driver-management/deliveries","DRIVER")).andReturn().getResponse().getStatus());
    }
    @Test void detailRequiresAssignmentAndContainsOnlyPermittedPickupAndOrderProjection() throws Exception {
        var result=mvc.perform(authenticated("/driver-management/deliveries/"+ownIds.getFirst(),"DRIVER")).andReturn();
        var data=page(result); assertEquals(people.get("DRIVER").profile().longValue(),((Number)data.get("driverId")).longValue());
        assertEquals(Set.of("restaurantId","name","address"),((Map<?,?>)data.get("pickup")).keySet());
        assertEquals(1,((List<?>)((Map<?,?>)data.get("order")).get("orderDetails")).size());
        assertFalse(result.getResponse().getContentAsString().contains("QA driver address"));
        for(Long id:List.of(otherIds.getFirst(),availableIds.getFirst(),Long.MAX_VALUE))
            assertEquals(404,mvc.perform(authenticated("/driver-management/deliveries/"+id,"DRIVER")).andReturn().getResponse().getStatus());
    }
    @Test void aggregatesUseAllOwnRowsAndRealTimesRatherThanPageTotalsOrCodIncome() throws Exception {
        var data=page(mvc.perform(authenticated("/driver-management/analytics","DRIVER")).andReturn());
        assertEquals(7,((Number)data.get("totalAssignedAllTime")).intValue()); assertEquals(4,((Number)data.get("activeNow")).intValue());
        assertEquals(2,((Number)data.get("completedInPeriod")).intValue()); assertEquals(4,((Number)data.get("pickedUpInPeriod")).intValue());
        assertEquals(60.0,((Number)data.get("averagePickupToDeliveredMinutes")).doubleValue(),0.01);
        assertFalse(data.containsKey("income")); assertFalse(data.containsKey("codTotal"));
        var empty=page(mvc.perform(authenticated("/driver-management/analytics","DRIVER3")).andReturn());
        assertEquals(0,((Number)empty.get("totalAssignedAllTime")).intValue()); assertNull(empty.get("averagePickupToDeliveredMinutes"));
    }
    @Test void inputBoundsRejectBadPagesStatusesSortScopesAndDates() throws Exception {
        for(String path:List.of("deliveries","available"))for(var pair:List.of(new String[]{"size","51"},new String[]{"page","-1"},new String[]{"sort","email"},new String[]{"q","x".repeat(101)}))
            assertEquals(400,mvc.perform(authenticated("/driver-management/"+path,"DRIVER").param(pair[0],pair[1])).andReturn().getResponse().getStatus());
        for(var pair:List.of(new String[]{"scope","all-drivers"},new String[]{"status","FAILED"}))
            assertEquals(400,mvc.perform(authenticated("/driver-management/deliveries","DRIVER").param(pair[0],pair[1])).andReturn().getResponse().getStatus());
        for(var pair:List.of(new String[]{"2026-02-30","2026-03-01"},new String[]{"2026-01-01","2026-12-31"},new String[]{"2026-02-01","2026-01-01"}))
            assertEquals(400,mvc.perform(authenticated("/driver-management/analytics","DRIVER").param("from",pair[0]).param("to",pair[1])).andReturn().getResponse().getStatus());
    }
    @Test void ownerListHasNoGrowingJpaQueriesAndDetailLoadsWithOsivDisabled() throws Exception {
        login("DRIVER"); var stats=factory.unwrap(org.hibernate.SessionFactory.class).getStatistics(); em.clear(); stats.clear();
        assertEquals(1,items(page(mvc.perform(authenticated("/driver-management/deliveries","DRIVER").param("scope","all").param("size","1")).andReturn())).size());
        long small=stats.getPrepareStatementCount(); em.clear(); stats.clear();
        assertEquals(7,items(page(mvc.perform(authenticated("/driver-management/deliveries","DRIVER").param("scope","all").param("size","8")).andReturn())).size());
        assertTrue(stats.getPrepareStatementCount()<=small+2);
        assertEquals(200,mvc.perform(authenticated("/driver-management/deliveries/"+ownIds.get(4),"DRIVER")).andReturn().getResponse().getStatus());
    }
}
