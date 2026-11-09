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

/** Real MySQL/filter-chain tests. Every test fixture and auth session rolls back. */
@EnabledIfEnvironmentVariable(named = "RUN_STAGE4_MYSQL_TESTS", matches = "true")
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/fooddelivery_stage4_e2e?allowPublicKeyRetrieval=true&sslMode=DISABLED",
    "spring.datasource.username=stage4_app", "spring.datasource.password=${STAGE2_MYSQL_PASSWORD}",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.jpa.open-in-view=false",
    "spring.jpa.properties.hibernate.generate_statistics=true", "spring.jpa.show-sql=false", "logging.level.root=WARN"
})
@AutoConfigureMockMvc(print = org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
@Transactional
class CustomerReadMySqlIntegrationTest extends AuthTestKeys {
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
        assertEquals("fooddelivery_stage4_e2e", jdbc.queryForObject("SELECT DATABASE()", String.class));
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

    @Test void restaurantSearchIsLiteralFilteredBoundedAndPrivateFieldsAreAbsent() throws Exception {
        var literal = page(mvc.perform(get("/restaurants/search").param("q", tag + " 100%_!").param("size", "1")).andReturn());
        assertEquals(1L, ((Number) literal.get("totalElements")).longValue()); assertEquals(1, items(literal).size());
        var item = (Map<?, ?>) items(literal).getFirst(); assertEquals(restaurant.longValue(), ((Number) item.get("restaurantId")).longValue());
        assertEquals(Set.of("restaurantId", "name", "address", "restaurantStatus"), item.keySet());
        var active = page(mvc.perform(get("/restaurants/search").param("q", tag).param("active", "true").param("size", "1")).andReturn());
        assertEquals(2L, ((Number) active.get("totalElements")).longValue()); assertEquals(1, items(active).size()); assertEquals(2, active.get("totalPages"));
        var next = page(mvc.perform(get("/restaurants/search").param("q", tag).param("active", "true").param("size", "1").param("page", "1")).andReturn());
        assertNotEquals(items(active), items(next));
    }

    @Test void menuScopeAvailabilityCategoryAndLiteralSearchAreEnforcedInSql() throws Exception {
        var literal = page(mvc.perform(get("/restaurants/" + restaurant + "/menu").param("q", "100%_!").param("size", "1")).andReturn());
        assertEquals(1L, ((Number) literal.get("totalElements")).longValue());
        var item = (Map<?, ?>) items(literal).getFirst(); assertEquals(literalMenu.longValue(), ((Number) item.get("restaurantFoodItemId")).longValue());
        assertNull(((Map<?, ?>) item.get("restaurant")).get("phoneNumber"));
        var filtered = page(mvc.perform(get("/restaurants/" + restaurant + "/menu").param("available", "false").param("category", tag + " category")).andReturn());
        assertEquals(1, items(filtered).size()); assertEquals(unavailableMenu.longValue(), ((Number) ((Map<?, ?>) items(filtered).getFirst()).get("restaurantFoodItemId")).longValue());
        assertTrue(items(page(mvc.perform(get("/restaurants/" + otherRestaurant + "/menu")).andReturn())).isEmpty());
        assertEquals(404, mvc.perform(get("/restaurants/9223372036854775807/menu")).andReturn().getResponse().getStatus());
    }

    @Test void menuPagesUseStableWhitelistedSortAndNoNPlusOne() throws Exception {
        var statistics = factory.unwrap(SessionFactory.class).getStatistics(); statistics.clear();
        var result = page(mvc.perform(get("/restaurants/" + restaurant + "/menu").param("sort", "price-desc").param("size", "2")).andReturn());
        assertEquals(3L, ((Number) result.get("totalElements")).longValue()); assertEquals(2, items(result).size());
        BigDecimal first = new BigDecimal(((Map<?, ?>) items(result).get(0)).get("price").toString());
        BigDecimal second = new BigDecimal(((Map<?, ?>) items(result).get(1)).get("price").toString()); assertTrue(first.compareTo(second) > 0);
        assertTrue(statistics.getPrepareStatementCount() <= 3, "Restaurant existence + menu page + count only");
    }

    @Test void categoriesAreTrimmedDistinctNonblankAndPaged() throws Exception {
        var result = page(mvc.perform(get("/food-categories").param("size", "1")).andReturn());
        assertEquals(1, items(result).size());
        long expected = jdbc.queryForObject("SELECT COUNT(DISTINCT TRIM(category)) FROM food_items WHERE category IS NOT NULL AND TRIM(category)<>''", Long.class);
        assertEquals(expected, ((Number) result.get("totalElements")).longValue());
        assertTrue(items(result).stream().allMatch(value -> value instanceof String s && !s.isBlank() && s.equals(s.trim())));
    }

    @Test void paymentDiscoveryIsCustomerOnlyAndReturnsOnlyActiveImplementedCod() throws Exception {
        String customer = login("CUSTOMER");
        assertEquals(401, mvc.perform(get("/payment-methods")).andReturn().getResponse().getStatus());
        for (String role : List.of("RESTAURANT", "DRIVER", "ADMIN"))
            assertEquals(403, mvc.perform(authenticated("/payment-methods", role)).andReturn().getResponse().getStatus());
        var response = mvc.perform(get("/payment-methods").header("Authorization", "Bearer " + customer)).andReturn();
        assertEquals(200, response.getResponse().getStatus()); var methods = (List<?>) body(response).get("data"); assertEquals(1, methods.size());
        var method = (Map<?, ?>) methods.getFirst(); assertEquals("COD", method.get("paymentMethodCode"));
        assertEquals(Set.of("paymentMethodId", "paymentMethodName", "paymentMethodCode"), method.keySet());
        em.find(PaymentMethod.class, cod).setIsActive(false); em.flush();
        var inactive = mvc.perform(get("/payment-methods").header("Authorization", "Bearer " + customer)).andReturn();
        assertTrue(((List<?>) body(inactive).get("data")).isEmpty());
    }

    @Test void ownOrdersArePagedNewestWithRealRelationsAndStateFilter() throws Exception {
        String path = "/customers/" + people.get("CUSTOMER").profile() + "/orders/page";
        var response = page(mvc.perform(authenticated(path, "CUSTOMER").param("status", "COMPLETED").param("size", "1")).andReturn());
        assertEquals(2L, ((Number) response.get("totalElements")).longValue()); assertEquals(1, items(response).size());
        var order = (Map<?, ?>) items(response).getFirst(); assertEquals("COMPLETED", order.get("orderStatus")); assertNotNull(order.get("createdAt"));
        assertEquals("DELIVERED", ((Map<?, ?>) order.get("deliveryOutputDTO")).get("deliveryStatus"));
        assertEquals("SUCCESS", ((Map<?, ?>) order.get("paymentResponseDTO")).get("paymentStatus")); assertEquals(1, ((List<?>) order.get("orderDetails")).size());
        var next = page(mvc.perform(authenticated(path, "CUSTOMER").param("status", "COMPLETED").param("size", "1").param("page", "1")).andReturn());
        assertTrue(((Number) order.get("orderId")).longValue() > ((Number) ((Map<?, ?>) items(next).getFirst()).get("orderId")).longValue());
        assertEquals(404, mvc.perform(authenticated(path, "CUSTOMER2")).andReturn().getResponse().getStatus());
        assertEquals(401, mvc.perform(get(path)).andReturn().getResponse().getStatus());
    }

    @Test void orderGraphQueryCountStaysBoundedAsPageGrowsWithOsivDisabled() throws Exception {
        String path = "/customers/" + people.get("CUSTOMER").profile() + "/orders/page"; login("CUSTOMER");
        var statistics = factory.unwrap(SessionFactory.class).getStatistics(); em.clear(); statistics.clear();
        var one = page(mvc.perform(authenticated(path, "CUSTOMER").param("size", "1")).andReturn()); assertEquals(1, items(one).size());
        long small = statistics.getPrepareStatementCount(); em.clear(); statistics.clear();
        var four = page(mvc.perform(authenticated(path, "CUSTOMER").param("size", "4")).andReturn()); assertEquals(4, items(four).size());
        long large = statistics.getPrepareStatementCount(); assertTrue(large <= small + 2, "Larger order page must not introduce per-order queries (small=" + small + ", large=" + large + ")");
        assertTrue(large <= 15, "Session/ownership + bounded ID page/count + detail graph");
    }

    @Test void mineRatingsDeriveCustomerIdentityAndRejectAnonymousOrOtherRoles() throws Exception {
        String path = "/restaurants/" + restaurant + "/ratings/page";
        var all = page(mvc.perform(get(path).param("size", "2")).andReturn()); assertEquals(10L, ((Number) all.get("totalElements")).longValue());
        assertEquals(2, items(all).size());
        assertEquals(401, mvc.perform(get(path).param("mine", "true")).andReturn().getResponse().getStatus());
        for (String role : List.of("RESTAURANT", "DRIVER", "ADMIN"))
            assertEquals(403, mvc.perform(authenticated(path, role).param("mine", "true")).andReturn().getResponse().getStatus());
        var mine = page(mvc.perform(authenticated(path, "CUSTOMER").param("mine", "true").param("size", "50").param("customerId", people.get("CUSTOMER2").profile().toString())).andReturn());
        assertEquals(5L, ((Number) mine.get("totalElements")).longValue());
        for (Object value : items(mine)) {
            var customer = (Map<?, ?>) ((Map<?, ?>) value).get("customerOutputDTO");
            assertEquals(people.get("CUSTOMER").profile().longValue(), ((Number) customer.get("customerId")).longValue()); assertEquals("Customer", customer.get("name"));
        }
    }

    @Test void invalidPageSizeSortBooleanStatusAndQueryBoundsReturn400() throws Exception {
        for (String path : List.of("/restaurants/search", "/restaurants/" + restaurant + "/menu", "/food-categories", "/restaurants/" + restaurant + "/ratings/page"))
            for (String[] pair : List.of(new String[]{"page", "-1"}, new String[]{"page", "10001"}, new String[]{"size", "0"}, new String[]{"size", "51"}, new String[]{"size", "invalid"}))
                assertEquals(400, mvc.perform(get(path).param(pair[0], pair[1])).andReturn().getResponse().getStatus(), path + " " + pair[0]);
        assertEquals(400, mvc.perform(get("/restaurants/search").param("sort", "email")).andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(get("/restaurants/search").param("active", "invalid")).andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(get("/restaurants/search").param("q", "q".repeat(101))).andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(get("/restaurants/" + restaurant + "/menu").param("sort", "random")).andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(get("/restaurants/" + restaurant + "/menu").param("category", "c".repeat(151))).andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(authenticated("/customers/" + people.get("CUSTOMER").profile() + "/orders/page", "CUSTOMER").param("status", "UNKNOWN")).andReturn().getResponse().getStatus());
    }
}
