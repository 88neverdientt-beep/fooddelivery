package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.security.*;
import vn.gaugaugau.fooddelivery.auth.service.AuthService;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.Order;
import vn.gaugaugau.fooddelivery.model.enums.*;

@EnabledIfEnvironmentVariable(named="RUN_STAGE7_MYSQL_TESTS",matches="true")
@SpringBootTest(properties={"spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_stage7_e2e}?allowPublicKeyRetrieval=true&sslMode=DISABLED",
    "spring.datasource.username=${FOOD_TEST_DB_USERNAME:stage7_app}","spring.datasource.password=${STAGE2_MYSQL_PASSWORD}","spring.jpa.hibernate.ddl-auto=validate","spring.jpa.open-in-view=false"})
@AutoConfigureMockMvc(print=org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
class AdminManagementMySqlTest extends AuthTestKeys {
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired EntityManager em;@Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;@Autowired AuthService auth;@Autowired JwtDecoder decoder;@Autowired SessionJwtConverter converter;
    final String password=UUID.randomUUID()+"-test",hash=new BCryptPasswordEncoder(4).encode(password),tag="Admin100%_!"+UUID.randomUUID();
    record Person(Long account,Long profile,String email){}
    final Map<String,Person> people=new HashMap<>();final Map<String,String> tokens=new HashMap<>();
    Long orderId,deliveryId,restaurantId,menuId,methodId;
    @BeforeEach void fixture(){
        ApprovedMySqlTestTarget.assertTarget(jdbc);
        new TransactionTemplate(manager).executeWithoutResult(t->{
            for(String key:List.of("ADMIN","ADMIN2","CUSTOMER","RESTAURANT","DRIVER")){
                Role role=Role.valueOf(key.replace("2",""));String email=UUID.randomUUID()+"@admin.test";
                var a=Account.builder().email(email).passwordHash(hash).role(role).build();Long id=null;
                if(role==Role.CUSTOMER){var c=Customer.builder().name(tag+" customer").email(email).password(hash).phoneNumber("0901234567").address("QA private address").build();em.persist(c);a.setCustomer(c);id=c.getCustomerId();}
                if(role==Role.RESTAURANT){var r=Restaurant.builder().name(tag+" restaurant").email(email).password(hash).phoneNumber("0901234567").address("QA pickup").restaurantStatus(true).build();em.persist(r);a.setRestaurant(r);id=r.getRestaurantId();restaurantId=id;}
                if(role==Role.DRIVER){var d=Driver.builder().name(tag+" driver").email(email).password(hash).phoneNumber("0901234567").address("QA driver").licensePlate("QA-07").driveStatus(true).build();em.persist(d);a.setDriver(d);id=d.getDriverId();}
                em.persist(a);people.put(key,new Person(a.getAccountId(),id,email));
            }
            var f=FoodItem.builder().name(tag).category("Com").build();em.persist(f);
            var m=RestaurantFoodItem.builder().restaurant(em.find(Restaurant.class,restaurantId)).foodItem(f).price(new BigDecimal("20000")).isAvailable(true).build();em.persist(m);menuId=m.getRestaurantFoodItemId();
            methodId=em.createQuery("select m from PaymentMethod m where m.paymentMethodCode='COD'",PaymentMethod.class).getSingleResult().getPaymentMethodId();
            var o=makeOrder(OrderStatus.CONFIRMED,PaymentStatus.PENDING,DeliveryStatus.PENDING);orderId=o.getOrderId();
            deliveryId=jdbc.queryForObject("SELECT delivery_id FROM deliveries WHERE order_id=?",Long.class,orderId);
            em.persist(Rating.builder().customer(em.find(Customer.class,people.get("CUSTOMER").profile())).restaurant(em.find(Restaurant.class,restaurantId)).ratingScore(5).comment(tag+" rating").build());
        });
    }
    Order makeOrder(OrderStatus status,PaymentStatus payment,DeliveryStatus delivery){
        var o=Order.builder().customer(em.find(Customer.class,people.get("CUSTOMER").profile())).restaurant(em.find(Restaurant.class,restaurantId)).deliveryAddress("QA private dropoff").subtotal(new BigDecimal("20000")).shippingFee(new BigDecimal("15000")).totalAmount(new BigDecimal("35000")).orderStatus(status).build();em.persist(o);
        for(int i=0;i<2;i++)em.persist(OrderDetail.builder().order(o).restaurantFoodItem(em.find(RestaurantFoodItem.class,menuId)).quantity(1).unitPrice(new BigDecimal("10000")).subtotal(new BigDecimal("10000")).build());
        em.persist(Payment.builder().order(o).paymentMethod(em.find(PaymentMethod.class,methodId)).amount(o.getTotalAmount()).paymentStatus(payment).paidAt(payment==PaymentStatus.SUCCESS?LocalDateTime.now():null).build());
        em.persist(Delivery.builder().order(o).driver(em.find(Driver.class,people.get("DRIVER").profile())).deliveryStatus(delivery).pickupTime(delivery==DeliveryStatus.DELIVERED?LocalDateTime.now().minusMinutes(2):null).deliveredTime(delivery==DeliveryStatus.DELIVERED?LocalDateTime.now():null).build());em.flush();return o;
    }
    String token(String who){return tokens.computeIfAbsent(who,k->auth.login(new vn.gaugaugau.fooddelivery.auth.dto.AuthDtos.Login(people.get(k).email(),password),"admin-test-"+people.get(k).account()).response().accessToken());}
    MvcResult request(String method,String path,String who,Object body)throws Exception{
        var r=org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(org.springframework.http.HttpMethod.valueOf(method),java.net.URI.create(path)).contentType(MediaType.APPLICATION_JSON);
        if(who!=null)r.header("Authorization","Bearer "+token(who));if(body!=null)r.content(json.writeValueAsString(body));return mvc.perform(r).andReturn();
    }
    Map<?,?> data(MvcResult r)throws Exception{assertEquals(200,r.getResponse().getStatus(),r.getResponse().getContentAsString());return (Map<?,?>)json.readValue(r.getResponse().getContentAsString(),Map.class).get("data");}
    String base="/admin-management/";
    @Test void allAdminReadRoutesAreRoleRestrictedAndDeniedCallsDoNotWrite()throws Exception{
        for(String key:List.of("CUSTOMER","RESTAURANT","DRIVER","ADMIN"))token(key);
        for(String path:List.of("accounts","accounts/"+people.get("CUSTOMER").account(),"customers","restaurants","restaurants/"+restaurantId,"drivers","orders","deliveries","deliveries/"+deliveryId,"payments","reviews","analytics")){
            var before=jdbc.queryForList("CHECKSUM TABLE accounts,auth_sessions,orders,deliveries,payments,ratings EXTENDED");
            for(String who:List.of("CUSTOMER","RESTAURANT","DRIVER"))assertEquals(403,request("GET",base+path,who,null).getResponse().getStatus());
            assertEquals(401,request("GET",base+path,null,null).getResponse().getStatus());
            assertEquals(before,jdbc.queryForList("CHECKSUM TABLE accounts,auth_sessions,orders,deliveries,payments,ratings EXTENDED"));
            var allowed=request("GET",base+path,"ADMIN",null);assertEquals(200,allowed.getResponse().getStatus());String text=allowed.getResponse().getContentAsString();
            assertFalse(text.contains(hash));for(String secret:List.of("passwordHash","password_hash","refreshToken","tokenHash","sessionId","transactionCode"))assertFalse(text.contains('"'+secret+'"'));
        }
    }
    @Test void listsFilterAtDatabaseAndKeepLiteralSearchAndAccurateCounts()throws Exception{
        for(String module:List.of("customers","restaurants","drivers","orders","payments","deliveries","reviews","accounts")){
            var result=data(request("GET",base+module+"?size=1&page=0","ADMIN",null));assertEquals(1,((List<?>)result.get("items")).size());assertTrue(((Number)result.get("totalElements")).longValue()>=1);
        }
        var customers=data(request("GET",base+"customers?q="+java.net.URLEncoder.encode(tag,java.nio.charset.StandardCharsets.UTF_8),"ADMIN",null));assertEquals(1,((List<?>)customers.get("items")).size());
        var rows=(List<?>)data(request("GET",base+"orders?customerId="+people.get("CUSTOMER").profile(),"ADMIN",null)).get("items");assertEquals(1,rows.size());assertEquals(orderId,((Number)((Map<?,?>)rows.getFirst()).get("orderId")).longValue());
        assertEquals(1,((List<?>)data(request("GET",base+"deliveries?driverId="+people.get("DRIVER").profile()+"&q="+orderId,"ADMIN",null)).get("items")).size());
        assertEquals(1,((List<?>)data(request("GET",base+"reviews?restaurantId="+restaurantId+"&score=5","ADMIN",null)).get("items")).size());
    }
    @Test void invalidBoundsEnumsDatesAndUnknownFieldsAreRejected()throws Exception{
        for(String tail:List.of("accounts?size=51","accounts?page=-1","accounts?role=ROOT","accounts?status=LOCKED","orders?status=PAID","orders?customerId=0","orders?from=2026-02-30","orders?from=2026-03-02&to=2026-03-01","reviews?score=6","drivers?activity=BUSY","payments?method=%27","analytics?from=2026-01-01&to=2026-04-04","analytics?to=9999-12-31","accounts?driverId=1"))assertEquals(400,request("GET",base+tail,"ADMIN",null).getResponse().getStatus(),tail);
        assertEquals(400,request("GET",base+"accounts/0","ADMIN",null).getResponse().getStatus());
        assertEquals(404,request("GET",base+"accounts/9223372036854775807","ADMIN",null).getResponse().getStatus());
    }
    @Test void detailSerializesWithOsivOffAndMatchesLinkedOrderAndProfiles()throws Exception{
        var detail=data(request("GET",base+"deliveries/"+deliveryId,"ADMIN",null));var o=(Map<?,?>)detail.get("order");var d=(Map<?,?>)detail.get("delivery");assertEquals(orderId,((Number)o.get("orderId")).longValue());assertEquals(deliveryId,((Number)d.get("deliveryId")).longValue());assertEquals("QA pickup",detail.get("pickupAddress"));assertEquals(2,((List<?>)o.get("orderDetails")).size());
        var account=data(request("GET",base+"accounts/"+people.get("DRIVER").account(),"ADMIN",null));assertEquals(people.get("DRIVER").profile(),((Number)account.get("driverId")).longValue());
        assertTrue(data(request("GET",base+"restaurants/"+restaurantId,"ADMIN",null)).containsKey("phoneNumber"));
        assertEquals(200,request("GET","/customers/"+people.get("CUSTOMER").profile(),"ADMIN",null).getResponse().getStatus());
        assertEquals(200,request("GET","/payments/orders/"+orderId,"ADMIN",null).getResponse().getStatus());
    }
    @Test @org.springframework.transaction.annotation.Transactional void analyticsMatchesIndependentSqlAndUsesExclusiveDayEndWithoutDoubleCounting()throws Exception{
        new TransactionTemplate(manager).executeWithoutResult(t->{
            for(int i=0;i<4;i++){
                var o=makeOrder(i==2?OrderStatus.CANCELLED:OrderStatus.COMPLETED,i==2?PaymentStatus.CANCELLED:PaymentStatus.SUCCESS,i==2?DeliveryStatus.CANCELLED:DeliveryStatus.DELIVERED);
                var day=LocalDateTime.of(2020,2,i==3?3:2,0,0);if(i==1)day=LocalDateTime.of(2020,2,2,23,59,59,999999000);
                jdbc.update("UPDATE orders SET created_at=? WHERE order_id=?",day,o.getOrderId());jdbc.update("UPDATE payments SET created_at=?,paid_at=? WHERE order_id=?",day,i==2?null:day,o.getOrderId());
            }
        });
        var report=data(request("GET",base+"analytics?from=2020-02-02&to=2020-02-02","ADMIN",null));
        var orders=(Map<?,?>)report.get("orderCohort");var paid=(Map<?,?>)report.get("recordedSuccessfulPayments");var delivery=(Map<?,?>)report.get("deliveryCohort");
        assertEquals(3,((Number)orders.get("total")).intValue());assertEquals(2,((Number)paid.get("count")).intValue());assertEquals(0,new BigDecimal("70000").compareTo(new BigDecimal(paid.get("totalValue").toString())));assertEquals(2,((List<?>)((Map<?,?>)data(request("GET",base+"orders?from=2020-02-02&to=2020-02-02&size=2","ADMIN",null))).get("items")).size());
        assertEquals(3,((Number)delivery.get("terminalCount")).intValue());assertEquals(0,new BigDecimal("66.6667").compareTo(new BigDecimal(delivery.get("deliveredSharePercent").toString())));
        var totals=(Map<?,?>)report.get("allTimeCounts");for(String table:List.of("accounts","customers","restaurants","drivers","orders"))assertEquals(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class),((Number)totals.get(table)).longValue());
        assertEquals(ZoneId.systemDefault().getId(),report.get("timeZone"));
    }
    @Test void emptyAnalyticsHasNullRatioAndNoFabricatedRevenue()throws Exception{
        var report=data(request("GET",base+"analytics?from=1901-01-01&to=1901-01-01","ADMIN",null));assertNull(((Map<?,?>)report.get("deliveryCohort")).get("deliveredSharePercent"));assertEquals(0,((Number)((Map<?,?>)report.get("recordedSuccessfulPayments")).get("count")).longValue());assertTrue(((List<?>)((Map<?,?>)report.get("orderCohort")).get("days")).isEmpty());
    }
    @Test void successfulMoneyRejectsPendingCancelledRefundedAndAmountMismatch()throws Exception{
        new TransactionTemplate(manager).executeWithoutResult(t->{
            for(PaymentStatus status:PaymentStatus.values()){
                var o=makeOrder(status==PaymentStatus.CANCELLED?OrderStatus.CANCELLED:OrderStatus.COMPLETED,status,status==PaymentStatus.CANCELLED?DeliveryStatus.CANCELLED:DeliveryStatus.DELIVERED);
                jdbc.update("UPDATE payments SET paid_at=?,amount=amount+1 WHERE order_id=?",LocalDateTime.of(2021,1,1,12,0),o.getOrderId());
            }
            var result=auth.login(new vn.gaugaugau.fooddelivery.auth.dto.AuthDtos.Login(people.get("ADMIN").email(),password),"money-actor");tokens.put("ADMIN",result.response().accessToken());
            try {var paid=(Map<?,?>)data(request("GET",base+"analytics?from=2021-01-01&to=2021-01-01","ADMIN",null)).get("recordedSuccessfulPayments");assertEquals(0,((Number)paid.get("count")).longValue());}catch(Exception e){throw new RuntimeException(e);}
            t.setRollbackOnly();
        });
    }
    @Test void statusExpectedStateRevokesSessionsAndRejectsMassAssignmentAndSelfDisable()throws Exception{
        token("CUSTOMER");assertEquals(400,request("PUT","/admin/accounts/"+people.get("CUSTOMER").account()+"/status","ADMIN",Map.of("status","DISABLED","role","ADMIN")).getResponse().getStatus());
        assertEquals(409,request("PUT","/admin/accounts/"+people.get("ADMIN").account()+"/status","ADMIN",Map.of("status","DISABLED")).getResponse().getStatus());
        String path="/admin/accounts/"+people.get("CUSTOMER").account()+"/status";
        assertEquals(200,request("PUT",path,"ADMIN",Map.of("status","DISABLED","expectedStatus","ACTIVE")).getResponse().getStatus());
        assertEquals(409,request("PUT",path,"ADMIN2",Map.of("status","ACTIVE","expectedStatus","ACTIVE")).getResponse().getStatus());
        assertEquals(401,request("GET","/auth/me","CUSTOMER",null).getResponse().getStatus());
        assertEquals("DISABLED",jdbc.queryForObject("SELECT status FROM accounts WHERE account_id=?",String.class,people.get("CUSTOMER").account()));
    }
    void as(String who){var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(converter.convert(decoder.decode(token(who))));SecurityContextHolder.setContext(context);}
    int statusCall(String who,Long target,CyclicBarrier gate){try{as(who);gate.await(10,TimeUnit.SECONDS);auth.setStatus(target,AccountStatus.DISABLED,AccountStatus.ACTIVE);return 200;}catch(AuthFailure e){return 401;}catch(org.springframework.web.server.ResponseStatusException e){return e.getStatusCode().value();}catch(Exception e){throw new RuntimeException(e);}finally{SecurityContextHolder.clearContext();}}
    List<Integer> race(Long first,Long second)throws Exception{
        token("ADMIN");token("ADMIN2");var gate=new CyclicBarrier(2);var executor=Executors.newFixedThreadPool(2);
        try{var a=executor.submit(()->statusCall("ADMIN",first,gate));var b=executor.submit(()->statusCall("ADMIN2",second,gate));return List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS)).stream().sorted().toList();}finally{executor.shutdownNow();}
    }
    @Test void twoAuthenticatedAdminsCannotDisableEachOtherAfterWaitingForLocks()throws Exception{
        assertEquals(List.of(200,401),race(people.get("ADMIN2").account(),people.get("ADMIN").account()));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM accounts WHERE account_id IN (?,?) AND status='ACTIVE'",Integer.class,people.get("ADMIN").account(),people.get("ADMIN2").account()));
    }
    @Test void twoAdminsWithTheSameExpectedStateChangeAnAccountOnlyOnce()throws Exception{
        assertEquals(List.of(200,409),race(people.get("CUSTOMER").account(),people.get("CUSTOMER").account()));
    }
    @Test void rollbackRestoresStatusAndSessionRevocation()throws Exception{
        token("CUSTOMER");token("ADMIN");
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(manager).executeWithoutResult(t->{as("ADMIN");try{auth.setStatus(people.get("CUSTOMER").account(),AccountStatus.DISABLED,AccountStatus.ACTIVE);throw new IllegalStateException("Rollback probe");}finally{SecurityContextHolder.clearContext();}}));
        assertEquals("ACTIVE",jdbc.queryForObject("SELECT status FROM accounts WHERE account_id=?",String.class,people.get("CUSTOMER").account()));assertEquals(200,request("GET","/auth/me","CUSTOMER",null).getResponse().getStatus());
    }
    @Test @org.springframework.transaction.annotation.Transactional void finalActiveAdministratorRemainsActive()throws Exception{
        token("ADMIN");jdbc.update("UPDATE accounts SET status='DISABLED' WHERE role='ADMIN' AND account_id<>?",people.get("ADMIN").account());
        assertEquals(409,request("PUT","/admin/accounts/"+people.get("ADMIN").account()+"/status","ADMIN",Map.of("status","DISABLED","expectedStatus","ACTIVE")).getResponse().getStatus());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM accounts WHERE role='ADMIN' AND status='ACTIVE'",Integer.class));
    }
    @Test @org.springframework.transaction.annotation.Transactional void laterPagesRetainFullTotalsAndDoNotLoadAllResults()throws Exception{
        for(int i=0;i<25;i++)jdbc.update("INSERT INTO customers(name,email,password,phone_number,address,created_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP(6))",tag+" page"+i,UUID.randomUUID()+"@page.test",hash,"0900000000","Synthetic page fixture");
        var page=data(request("GET",base+"customers?q="+java.net.URLEncoder.encode(tag,java.nio.charset.StandardCharsets.UTF_8)+"&size=10&page=2","ADMIN",null));
        assertEquals(26,((Number)page.get("totalElements")).longValue());assertEquals(3,((Number)page.get("totalPages")).intValue());assertEquals(6,((List<?>)page.get("items")).size());
    }
}
