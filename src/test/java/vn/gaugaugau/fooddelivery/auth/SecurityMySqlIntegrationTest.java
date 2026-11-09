package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import vn.gaugaugau.fooddelivery.model.Order;
import org.springframework.http.MediaType;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.repository.*;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.enums.*;

@EnabledIfEnvironmentVariable(named="RUN_STAGE2_AUTH_SCHEMA_TESTS",matches="true")
@SpringBootTest(properties={"spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_stage2_rehearsal}?allowPublicKeyRetrieval=true&sslMode=DISABLED",
    "spring.datasource.username=${FOOD_TEST_DB_USERNAME:stage2_app}","spring.datasource.password=${STAGE2_MYSQL_PASSWORD}","spring.jpa.hibernate.ddl-auto=validate","spring.jpa.open-in-view=false"})
@AutoConfigureMockMvc(print=org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
class SecurityMySqlIntegrationTest extends AuthTestKeys {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired EntityManager em;
    @Autowired AccountRepository accounts;
    @Autowired PlatformTransactionManager manager;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtEncoder jwtEncoder;
    @Autowired JwtDecoder jwtDecoder;
    @Autowired @org.springframework.beans.factory.annotation.Qualifier("requestMappingHandlerMapping") org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping mappings;
    final String password=UUID.randomUUID()+"-Test";
    final String hash=new BCryptPasswordEncoder(4).encode(password);
    record Person(Long account,Long profile,String email){}
    record Login(String access,String refresh) {public String toString(){return "Login[redacted]";}}
    Map<String,Person> people=new HashMap<>();
    Map<String,Login> tokens=new HashMap<>();
    Long menu,otherMenu,food,order,delivery,cartItem,rating,method;
    @BeforeEach void fixtures(){
        ApprovedMySqlTestTarget.assertTarget(jdbc);
        new TransactionTemplate(manager).executeWithoutResult(s->{
            for(String name:List.of("CUSTOMER","CUSTOMER2","RESTAURANT","RESTAURANT2","DRIVER","DRIVER2","ADMIN")) {
                Role role=Role.valueOf(name.replace("2",""));String email=UUID.randomUUID()+"@security.test";
                var account=Account.builder().email(email).passwordHash(hash).role(role).build();Long id=null;
                if(role==Role.CUSTOMER){var c=Customer.builder().name("Private customer").email(email).password(hash).phoneNumber("0901234567").address("Private address").build();em.persist(c);account.setCustomer(c);id=c.getCustomerId();}
                if(role==Role.RESTAURANT){var r=Restaurant.builder().name("Public restaurant").email(email).password(hash).phoneNumber("0901234567").address("Restaurant address").restaurantStatus(true).build();em.persist(r);account.setRestaurant(r);id=r.getRestaurantId();}
                if(role==Role.DRIVER){var d=Driver.builder().name("Private driver").email(email).password(hash).phoneNumber("0901234567").address("Private address").driveStatus(true).build();em.persist(d);account.setDriver(d);id=d.getDriverId();}
                em.persist(account);people.put(name,new Person(account.getAccountId(),id,email));
            }
            var f=FoodItem.builder().name(UUID.randomUUID().toString()).build();em.persist(f);food=f.getItemId();
            var r=em.find(Restaurant.class,people.get("RESTAURANT").profile());
            var m=RestaurantFoodItem.builder().restaurant(r).foodItem(f).price(new java.math.BigDecimal("20000")).isAvailable(true).build();em.persist(m);menu=m.getRestaurantFoodItemId();
            var f2=FoodItem.builder().name(UUID.randomUUID().toString()).build();em.persist(f2);
            var m2=RestaurantFoodItem.builder().restaurant(em.find(Restaurant.class,people.get("RESTAURANT2").profile())).foodItem(f2).price(new java.math.BigDecimal("30000")).isAvailable(true).build();em.persist(m2);otherMenu=m2.getRestaurantFoodItemId();
            var c=em.find(Customer.class,people.get("CUSTOMER").profile());var cart=Cart.builder().customer(c).restaurant(r).build();em.persist(cart);
            var ci=CartItem.builder().cart(cart).restaurantFoodItem(m).quantity(2).build();em.persist(ci);cartItem=ci.getCartItemId();
            var pm=em.createQuery("select m from PaymentMethod m where m.paymentMethodCode='COD'",PaymentMethod.class).getSingleResult();method=pm.getPaymentMethodId();
            for(boolean completed:List.of(false,true)) {
                var o=Order.builder().customer(c).restaurant(r).deliveryAddress("Private customer delivery address").subtotal(new java.math.BigDecimal("20000")).shippingFee(new java.math.BigDecimal("15000")).totalAmount(new java.math.BigDecimal("35000")).orderStatus(completed?OrderStatus.COMPLETED:OrderStatus.READY).build();em.persist(o);
                var detail=OrderDetail.builder().order(o).restaurantFoodItem(m).quantity(1).unitPrice(new java.math.BigDecimal("20000")).subtotal(new java.math.BigDecimal("20000")).build();em.persist(detail);
                var pay=Payment.builder().order(o).paymentMethod(pm).amount(o.getTotalAmount()).paymentStatus(completed?PaymentStatus.SUCCESS:PaymentStatus.PENDING).build();em.persist(pay);
                var d=Delivery.builder().order(o).driver(em.find(Driver.class,people.get("DRIVER").profile())).deliveryStatus(completed?DeliveryStatus.DELIVERED:DeliveryStatus.PENDING).build();em.persist(d);
                if(!completed){order=o.getOrderId();delivery=d.getDeliveryId();}
            }
            var review=Rating.builder().customer(c).restaurant(r).ratingScore(5).comment("Public review").build();em.persist(review);rating=review.getRatingId();
        });
    }
    Map<?,?> body(MvcResult r) throws Exception {String text=r.getResponse().getContentAsString();return text.isBlank()?Map.of():json.readValue(text,Map.class);}
    Map<?,?> data(MvcResult r) throws Exception {return (Map<?,?>)body(r).get("data");}
    MvcResult request(String method,String path,String access,Object payload,String refresh,boolean csrf) throws Exception {
        var builder=org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(HttpMethod.valueOf(method),path).contentType(MediaType.APPLICATION_JSON);
        if(payload!=null)builder.content(json.writeValueAsString(payload));
        if(access!=null)builder.header("Authorization","Bearer "+access);
        if(refresh!=null)builder.cookie(new Cookie("fd_refresh",refresh));
        if(csrf){var result=mvc.perform(get("/auth/csrf")).andReturn();builder.cookie(result.getResponse().getCookie("XSRF-TOKEN")).header("X-XSRF-TOKEN",body(result).get("token"));}
        return mvc.perform(builder).andReturn();
    }
    Login login(String name) throws Exception {
        if(tokens.containsKey(name))return tokens.get(name);
        var result=request("POST","/auth/login",null,Map.of("email",people.get(name).email(),"password",password),null,true);
        assertEquals(200,result.getResponse().getStatus());
        var login=new Login((String)data(result).get("accessToken"),result.getResponse().getCookie("fd_refresh").getValue());tokens.put(name,login);return login;
    }
    Map<String,Object> registration(String email){return Map.of("name","New customer","email",email,"password",password,"phoneNumber","0900000000","address","Test address");}
    List<Map<String,Object>> snapshot(){return jdbc.queryForList("CHECKSUM TABLE accounts,auth_sessions,refresh_tokens,customers,restaurants,drivers,carts,cart_items,orders,order_details,payments,deliveries,ratings,restaurant_food_items,food_items EXTENDED");}
    @Test void registrationIsAtomicAndRejectsPrivilegeInjection() throws Exception {
        String email=UUID.randomUUID()+"@security.test";
        var result=request("POST","/auth/register/customer",null,registration(email),null,true);assertEquals(201,result.getResponse().getStatus());
        assertEquals("CUSTOMER",data(result).get("role"));assertFalse(result.getResponse().getContentAsString().contains(hash));
        assertEquals(409,request("POST","/auth/register/customer",null,registration(email),null,true).getResponse().getStatus());
        var injected=new HashMap<>(registration(UUID.randomUUID()+"@security.test"));injected.put("role","ADMIN");var before=snapshot();
        assertEquals(400,request("POST","/auth/register/customer",null,injected,null,true).getResponse().getStatus());assertEquals(before,snapshot());
        var invalid=new HashMap<>(registration(UUID.randomUUID()+"@security.test"));invalid.put("password","short");
        assertEquals(400,request("POST","/auth/register/customer",null,invalid,null,true).getResponse().getStatus());
    }
    @Test void loginUsesOnlyAccountAndGenericFailures() throws Exception {
        var unknown=request("POST","/auth/login",null,Map.of("email",UUID.randomUUID()+"@security.test","password",password),null,true);
        var wrong=request("POST","/auth/login",null,Map.of("email",people.get("CUSTOMER").email(),"password","wrong-password-long"),null,true);
        assertEquals(401,unknown.getResponse().getStatus());assertEquals(body(unknown).get("message"),body(wrong).get("message"));
        String token=login("CUSTOMER").access();assertEquals(200,request("GET","/auth/me",token,null,null,false).getResponse().getStatus());
        new TransactionTemplate(manager).executeWithoutResult(s->accounts.findById(people.get("CUSTOMER").account()).orElseThrow().setPasswordHash(new BCryptPasswordEncoder(4).encode("different-account-password")));
        assertEquals(401,request("POST","/auth/login",null,Map.of("email",people.get("CUSTOMER").email(),"password",password),null,true).getResponse().getStatus());
    }
    @Test void csrfAndCookieContract() throws Exception {
        assertEquals(403,request("POST","/auth/login",null,Map.of("email",people.get("CUSTOMER").email(),"password",password),null,false).getResponse().getStatus());
        var result=request("POST","/auth/login",null,Map.of("email",people.get("CUSTOMER").email(),"password",password),null,true);
        String cookies=String.join(";",result.getResponse().getHeaders("Set-Cookie"));assertTrue(cookies.contains("Secure"));assertTrue(cookies.contains("HttpOnly"));assertTrue(cookies.contains("SameSite=Strict"));assertTrue(cookies.contains("Path=/auth"));assertFalse(cookies.contains("Domain="));
        assertEquals(401,request("POST","/auth/refresh",null,null,null,true).getResponse().getStatus());
        assertEquals(403,request("POST","/auth/refresh",null,null,login("CUSTOMER").refresh(),false).getResponse().getStatus());
    }
    @Test void rotationReplayRevokesBothAccessTokens() throws Exception {
        var old=login("CUSTOMER");var rotated=request("POST","/auth/refresh",null,null,old.refresh(),true);assertEquals(200,rotated.getResponse().getStatus());
        String next=(String)data(rotated).get("accessToken");String refresh=rotated.getResponse().getCookie("fd_refresh").getValue();assertNotEquals(old.refresh(),refresh);
        assertEquals(401,request("POST","/auth/refresh",null,null,old.refresh(),true).getResponse().getStatus());
        assertEquals(401,request("GET","/auth/me",old.access(),null,null,false).getResponse().getStatus());
        assertEquals(401,request("GET","/auth/me",next,null,null,false).getResponse().getStatus());
    }
    @Test void concurrentRefreshCannotProduceTwoUsableTokens() throws Exception {
        var login=login("CUSTOMER");var executor=Executors.newFixedThreadPool(2);var gate=new CyclicBarrier(2);
        Callable<MvcResult> call=()->{gate.await(10,TimeUnit.SECONDS);return request("POST","/auth/refresh",null,null,login.refresh(),true);};
        try{var a=executor.submit(call);var b=executor.submit(call);var results=List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS));assertEquals(List.of(200,401),results.stream().map(r->r.getResponse().getStatus()).sorted().toList());
            var winner=results.stream().filter(r->r.getResponse().getStatus()==200).findFirst().orElseThrow();assertEquals(401,request("GET","/auth/me",(String)data(winner).get("accessToken"),null,null,false).getResponse().getStatus());}
        finally{executor.shutdownNow();}
    }
    @Test void logoutLogoutAllAndPasswordChangeRevokeImmediately() throws Exception {
        var login=login("CUSTOMER");assertEquals(204,request("POST","/auth/logout",null,null,login.refresh(),true).getResponse().getStatus());
        assertEquals(401,request("GET","/auth/me",login.access(),null,null,false).getResponse().getStatus());
        assertEquals(204,request("POST","/auth/logout",null,null,login.refresh(),true).getResponse().getStatus());
        tokens.clear();var first=login("CUSTOMER");tokens.clear();var second=login("CUSTOMER");
        assertEquals(204,request("POST","/auth/logout-all",first.access(),null,null,true).getResponse().getStatus());
        assertEquals(401,request("GET","/auth/me",second.access(),null,null,false).getResponse().getStatus());
        tokens.clear();var third=login("CUSTOMER");String next=password+"Changed";
        assertEquals(204,request("POST","/auth/change-password",third.access(),Map.of("currentPassword",password,"newPassword",next),null,true).getResponse().getStatus());
        assertEquals(401,request("POST","/auth/refresh",null,null,third.refresh(),true).getResponse().getStatus());
        assertEquals(401,request("GET","/auth/me",third.access(),null,null,false).getResponse().getStatus());
        assertEquals(200,request("POST","/auth/login",null,Map.of("email",people.get("CUSTOMER").email(),"password",next),null,true).getResponse().getStatus());
    }
    @Test void accountDisableRevokesAndCannotBeUndoneByOwner() throws Exception {
        var customer=login("CUSTOMER");var admin=login("ADMIN");
        assertEquals(200,request("PUT","/admin/accounts/"+people.get("CUSTOMER").account()+"/status",admin.access(),Map.of("status","DISABLED"),null,false).getResponse().getStatus());
        assertEquals(401,request("GET","/auth/me",customer.access(),null,null,false).getResponse().getStatus());
        assertEquals(401,request("POST","/auth/login",null,Map.of("email",people.get("CUSTOMER").email(),"password",password),null,true).getResponse().getStatus());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE order_id=?",Integer.class,order));
    }
    String sign(Map<String,Object> claims,String type){return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).type(type).build(),JwtClaimsSet.builder().claims(c->c.putAll(claims)).build())).getTokenValue();}
    @Test void jwtValidationAndDatabaseRolesCannotBeForged() throws Exception {
        var valid=login("CUSTOMER");var claims=new HashMap<String,Object>(jwtDecoder.decode(valid.access()).getClaims());
        var bad=new ArrayList<String>();
        for(String missing:List.of("iss","aud","sub","sid","jti","iat","nbf","exp")){var copy=new HashMap<>(claims);copy.remove(missing);bad.add(sign(copy,"at+jwt"));}
        for(var change:Map.<String,Object>of("iss","https://wrong.test","aud",List.of("wrong"),"sub",people.get("CUSTOMER2").account().toString(),"sid",UUID.randomUUID().toString()).entrySet()) {var copy=new HashMap<>(claims);copy.put(change.getKey(),change.getValue());bad.add(sign(copy,"at+jwt"));}
        var expired=new HashMap<>(claims);expired.put("iat",Instant.now().minusSeconds(1200));expired.put("nbf",Instant.now().minusSeconds(1200));expired.put("exp",Instant.now().minusSeconds(600));bad.add(sign(expired,"at+jwt"));bad.add(sign(claims,"JWT"));
        var parsed=com.nimbusds.jwt.SignedJWT.parse(valid.access());bad.add(new com.nimbusds.jwt.PlainJWT(parsed.getJWTClaimsSet()).serialize());
        var generator=java.security.KeyPairGenerator.getInstance("RSA");generator.initialize(2048);var other=generator.generateKeyPair();
        var forged=new com.nimbusds.jwt.SignedJWT(new com.nimbusds.jose.JWSHeader(com.nimbusds.jose.JWSAlgorithm.RS256),parsed.getJWTClaimsSet());forged.sign(new com.nimbusds.jose.crypto.RSASSASigner(other.getPrivate()));bad.add(forged.serialize());
        for(String token:bad)assertEquals(401,request("GET","/auth/me",token,null,null,false).getResponse().getStatus());
        var roles=new HashMap<>(claims);roles.put("role","ADMIN");roles.put("scope","ADMIN");assertEquals(403,request("GET","/admin/accounts",sign(roles,"at+jwt"),null,null,false).getResponse().getStatus());
    }
    @Test void ownershipDenialsDoNotChangeData() throws Exception {
        String customer=login("CUSTOMER2").access(),restaurant=login("RESTAURANT2").access(),driver=login("DRIVER2").access();var before=snapshot();
        for(var spec:List.of(new Object[]{"GET","/cart/"+people.get("CUSTOMER").profile(),customer,null},new Object[]{"PUT","/cart-items/"+cartItem,customer,Map.of("quantity",3)},new Object[]{"GET","/orders/"+order,customer,null},new Object[]{"PUT","/orders/"+order+"/delivery-address",customer,Map.of("deliveryAddress","Attacker address")},new Object[]{"POST","/customers/"+people.get("CUSTOMER").profile()+"/orders",customer,Map.of("deliveryAddress","Attacker address","paymentMethodId",method)},new Object[]{"POST","/restaurant-food-items",restaurant,Map.of("restaurantId",people.get("RESTAURANT").profile(),"foodItemId",food,"price",25000)},new Object[]{"POST","/deliveries/"+delivery+"/accept",driver,Map.of("driverId",people.get("DRIVER").profile())},new Object[]{"PATCH","/orders/"+order+"/cancel",customer,null},new Object[]{"GET","/payments/orders/"+order,customer,null},new Object[]{"PUT","/restaurant-food-items/"+menu,restaurant,Map.of("price",25000)},new Object[]{"PATCH","/orders/"+order+"/status",restaurant,"CONFIRMED"},new Object[]{"PUT","/deliveries/"+delivery+"/status",driver,"PICKED_UP"},new Object[]{"GET","/orders/"+order,driver,null},new Object[]{"PUT","/ratings/"+rating+"/customers/"+people.get("CUSTOMER").profile(),customer,Map.of("ratingScore",4)})) {
            assertEquals(404,request((String)spec[0],(String)spec[1],(String)spec[2],spec[3],null,false).getResponse().getStatus());assertEquals(before,snapshot());
        }
    }
    @Test void publicViewsExcludePrivateDataAndAssignedOnlyDeliveryDetails() throws Exception {
        for(String path:List.of("/restaurants","/restaurants/search","/food-categories","/restaurants/"+people.get("RESTAURANT").profile(),"/restaurant-food-items","/restaurants/"+people.get("RESTAURANT").profile()+"/menu","/restaurants/"+people.get("RESTAURANT").profile()+"/ratings","/restaurants/"+people.get("RESTAURANT").profile()+"/ratings/page")) {
            String response=request("GET",path,null,null,null,false).getResponse().getContentAsString();assertFalse(response.contains("0901234567"));assertFalse(response.contains("@security.test"));assertFalse(response.contains(hash));assertFalse(response.contains("Private customer"));
        }
        var result=request("GET","/deliveries/available",login("DRIVER").access(),null,null,false);assertEquals(200,result.getResponse().getStatus());assertFalse(result.getResponse().getContentAsString().contains("Private customer delivery address"));
        assertEquals(200,request("GET","/orders/"+order,login("DRIVER").access(),null,null,false).getResponse().getStatus());
    }
    @Test void adminCannotImpersonateCustomerOrDriverAndSoftDeleteKeepsHistory() throws Exception {
        var admin=login("ADMIN");var before=snapshot();
        assertEquals(403,request("POST","/customers/"+people.get("CUSTOMER").profile()+"/orders",admin.access(),Map.of("deliveryAddress","Test","paymentMethodId",method),null,false).getResponse().getStatus());
        assertEquals(403,request("PUT","/deliveries/"+delivery+"/status",admin.access(),"DELIVERED",null,false).getResponse().getStatus());assertEquals(before,snapshot());
        assertEquals(200,request("DELETE","/customers/"+people.get("CUSTOMER").profile(),admin.access(),null,null,false).getResponse().getStatus());
        assertEquals("DISABLED",jdbc.queryForObject("SELECT status FROM accounts WHERE account_id=?",String.class,people.get("CUSTOMER").account()));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE order_id=?",Integer.class,order));
    }

    @Test void everyBusinessEndpointHasACompleteRoleMatrixAndDeniedRequestsAreReadOnly() throws Exception {
        for(String role:List.of("CUSTOMER","RESTAURANT","DRIVER","ADMIN","CUSTOMER2"))login(role);
        var disabled=login("CUSTOMER2");
        new TransactionTemplate(manager).executeWithoutResult(t->accounts.findById(people.get("CUSTOMER2").account()).orElseThrow().setStatus(AccountStatus.DISABLED));
        int endpoints=0;
        for(var entry:mappings.getHandlerMethods().entrySet()) {
            if(!entry.getValue().getBeanType().getPackageName().equals("vn.gaugaugau.fooddelivery.controller"))continue;
            for(var verb:entry.getKey().getMethodsCondition().getMethods())for(String pattern:entry.getKey().getPatternValues()) {
                String method=verb.name(),path=pattern;Set<String> allowed=policy(method,pattern);endpoints++;
                Map<String,Long> ids=Map.of("customerId",people.get("CUSTOMER").profile(),"restaurantId",people.get("RESTAURANT").profile(),"driverId",people.get("DRIVER").profile(),"orderId",order,"deliveryId",delivery,"cartItemId",cartItem,"restaurantFoodItemId",menu,"itemId",food,"ratingId",rating);
                for(var id:ids.entrySet())path=path.replace("{"+id.getKey()+"}",id.getValue().toString());
                assertFalse(path.contains("{"),"Unresolved endpoint "+pattern);
                final String target=path;
                for(String actor:List.of("ANONYMOUS","CUSTOMER","RESTAURANT","DRIVER","ADMIN","DISABLED")) {
                    String bearer=actor.equals("ANONYMOUS")?null:actor.equals("DISABLED")?disabled.access():tokens.get(actor).access();
                    boolean publicRoute=allowed.contains("PUBLIC"),permitted=publicRoute||allowed.contains(actor);
                    var before=snapshot();
                    boolean denied=(!publicRoute && !permitted) || (actor.equals("DISABLED") && !(method.equals("POST") && pattern.equals("/customers")));
                    int status=denied?request(method,target,bearer,method.equals("GET")||method.equals("DELETE")?null:Map.of(),null,true).getResponse().getStatus():new TransactionTemplate(manager).execute(t->{
                        try {var result=request(method,target,bearer,method.equals("GET")||method.equals("DELETE")?null:Map.of(),null,true);return result.getResponse().getStatus();}
                        catch(Exception e){throw new RuntimeException(e);}finally{t.setRollbackOnly();}
                    });
                    String label=method+" "+pattern+" "+actor;
                    if(actor.equals("DISABLED") && !(method.equals("POST") && pattern.equals("/customers")))assertEquals(401,status,label);
                    else if(!permitted)assertEquals(actor.equals("ANONYMOUS")?401:403,status,label);
                    else assertTrue(status>=200 && status<500 && status!=401 && status!=403,label+" unexpected "+status);
                    assertEquals(before,snapshot(),label+" changed data outside rolled-back request");
                }
            }
        }
        assertEquals(55,endpoints,"New or removed endpoints require matrix review");
    }
    private Set<String> policy(String method,String p) {
        if(p.startsWith("/restaurant-management/"))return Set.of("RESTAURANT");
        if(method.equals("GET") && (p.equals("/")||p.startsWith("/food-items")||p.equals("/food-categories")||p.startsWith("/restaurant-food-items")||p.equals("/restaurants")||p.equals("/restaurants/search")||p.equals("/restaurants/{restaurantId}")||p.equals("/restaurants/{restaurantId}/menu")||p.contains("/ratings")))return Set.of("PUBLIC");
        if(method.equals("POST")&&p.equals("/customers"))return Set.of("PUBLIC");
        if(p.startsWith("/cart")||p.equals("/{customerId}/cart-items"))return Set.of("CUSTOMER");
        if(p.startsWith("/deliveries"))return Set.of("DRIVER");
        if(p.equals("/payment-methods"))return Set.of("CUSTOMER");
        if(p.equals("/customers/{customerId}/orders/page"))return Set.of("CUSTOMER","ADMIN");
        if(p.equals("/customers/{customerId}/orders"))return method.equals("GET")?Set.of("CUSTOMER","ADMIN"):Set.of("CUSTOMER");
        if(p.equals("/orders/{orderId}")||p.startsWith("/payments/"))return Set.of("CUSTOMER","RESTAURANT","DRIVER","ADMIN");
        if(p.endsWith("/delivery-address"))return Set.of("CUSTOMER");
        if(p.equals("/orders/{orderId}/status"))return Set.of("RESTAURANT");
        if(p.endsWith("/cancel"))return Set.of("CUSTOMER","RESTAURANT");
        if(p.equals("/restaurants/{restaurantId}/ratings")||p.startsWith("/ratings/"))return method.equals("DELETE")?Set.of("CUSTOMER","ADMIN"):Set.of("CUSTOMER");
        if(p.startsWith("/food-items"))return Set.of("ADMIN");
        if(p.startsWith("/restaurant-food-items"))return Set.of("RESTAURANT","ADMIN");
        if(p.equals("/customers")||p.equals("/drivers")||p.equals("/restaurants")||method.equals("DELETE"))return Set.of("ADMIN");
        if(p.equals("/customers/{customerId}"))return Set.of("CUSTOMER","ADMIN");
        if(p.equals("/drivers/{driverId}"))return Set.of("DRIVER","ADMIN");
        if(p.equals("/restaurants/{restaurantId}"))return Set.of("RESTAURANT","ADMIN");
        throw new AssertionError("Endpoint missing independent role policy: "+method+" "+p);
    }


    @Test void expiredRefreshAndInvalidCookiesAreReadOnly() throws Exception {
        assertEquals(401,request("POST","/auth/refresh",null,null,"invalid",true).getResponse().getStatus());
        var login=login("CUSTOMER");String sid=jwtDecoder.decode(login.access()).getClaimAsString("sid");
        new TransactionTemplate(manager).executeWithoutResult(t->jdbc.update("UPDATE refresh_tokens SET created_at=?,expires_at=? WHERE session_id=?",LocalDateTime.now(ZoneOffset.UTC).minusMinutes(2),LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1),sid));
        var before=snapshot();assertEquals(401,request("POST","/auth/refresh",null,null,login.refresh(),true).getResponse().getStatus());assertEquals(before,snapshot());
        new TransactionTemplate(manager).executeWithoutResult(t->jdbc.update("UPDATE auth_sessions SET created_at=?,expires_at=? WHERE session_id=?",LocalDateTime.now(ZoneOffset.UTC).minusMinutes(2),LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1),sid));
        assertEquals(401,request("GET","/auth/me",login.access(),null,null,false).getResponse().getStatus());
    }
    @Test void everyAuthAndAdminEndpointIsCoveredWithAllRoles() throws Exception {
        for(String role:List.of("CUSTOMER","RESTAURANT","DRIVER","ADMIN","CUSTOMER2"))login(role);
        var disabled=login("CUSTOMER2");new TransactionTemplate(manager).executeWithoutResult(t->accounts.findById(people.get("CUSTOMER2").account()).orElseThrow().setStatus(AccountStatus.DISABLED));
        int count=0;
        for(var entry:mappings.getHandlerMethods().entrySet()) {
            if(!entry.getValue().getBeanType().getPackageName().equals("vn.gaugaugau.fooddelivery.auth.controller"))continue;
            for(var verb:entry.getKey().getMethodsCondition().getMethods())for(String pattern:entry.getKey().getPatternValues()) {
                count++;String method=verb.name(),path=pattern.replace("{id}",people.get("CUSTOMER2").account().toString());
                boolean admin=pattern.startsWith("/admin/"),publicRoute=Set.of("/auth/login","/auth/refresh","/auth/logout","/auth/register/customer","/auth/csrf").contains(pattern);
                for(String role:List.of("ANONYMOUS","CUSTOMER","RESTAURANT","DRIVER","ADMIN","DISABLED")) {
                    String token=role.equals("ANONYMOUS")?null:role.equals("DISABLED")?disabled.access():tokens.get(role).access();var before=snapshot();
                    boolean denied=!publicRoute && (role.equals("ANONYMOUS") || role.equals("DISABLED") || (admin && !role.equals("ADMIN")));
                    int status=denied?request(method,path,token,method.equals("GET")?null:Map.of(),null,true).getResponse().getStatus():new TransactionTemplate(manager).execute(t->{try{return request(method,path,token,method.equals("GET")?null:Map.of(),null,true).getResponse().getStatus();}catch(Exception e){throw new RuntimeException(e);}finally{t.setRollbackOnly();}});
                    String label=method+" "+pattern+" "+role;
                    if(!publicRoute){if(role.equals("ANONYMOUS")||role.equals("DISABLED"))assertEquals(401,status,label);else if(admin&&!role.equals("ADMIN"))assertEquals(403,status,label);else assertTrue(status!=401&&status!=403&&status<500,label+" "+status);}
                    else assertEquals(pattern.equals("/auth/logout")?204:pattern.equals("/auth/csrf")?200:pattern.equals("/auth/refresh")?401:400,status,label);
                    assertEquals(before,snapshot(),label);
                }
            }
        }
        assertEquals(10,count);
    }
    @Test void corsAllowlistAndCsrfForgeryAreEnforced() throws Exception {
        var allowed=mvc.perform(options("/auth/login").header("Origin","https://ui.fooddelivery.test").header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","Content-Type,X-XSRF-TOKEN")).andReturn();
        assertEquals(200,allowed.getResponse().getStatus());assertEquals("https://ui.fooddelivery.test",allowed.getResponse().getHeader("Access-Control-Allow-Origin"));assertEquals("true",allowed.getResponse().getHeader("Access-Control-Allow-Credentials"));
        assertEquals(403,mvc.perform(options("/auth/login").header("Origin","https://evil.test").header("Access-Control-Request-Method","POST")).andReturn().getResponse().getStatus());
        var login=login("CUSTOMER");var before=snapshot();
        assertEquals(403,mvc.perform(post("/auth/refresh").cookie(new Cookie("fd_refresh",login.refresh()),new Cookie("XSRF-TOKEN","correct")).header("X-XSRF-TOKEN","forged")).andReturn().getResponse().getStatus());assertEquals(before,snapshot());
    }


    @Test void concurrentRegistrationKeepsOneAccountAndOneProfile() throws Exception {
        String email=UUID.randomUUID()+"@security.test";var executor=Executors.newFixedThreadPool(2);var gate=new CyclicBarrier(2);
        Callable<Integer> call=()->{gate.await(10,TimeUnit.SECONDS);return request("POST","/auth/register/customer",null,registration(email),null,true).getResponse().getStatus();};
        try{var a=executor.submit(call);var b=executor.submit(call);assertEquals(List.of(201,409),java.util.stream.Stream.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS)).sorted().toList());}
        finally{executor.shutdownNow();}
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM accounts WHERE email=?",Integer.class,email));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM customers WHERE email=?",Integer.class,email));
    }
    @Test void passwordBytesNormalizationAndProfileMassAssignmentAreValidated() throws Exception {
        String email=UUID.randomUUID()+"@security.test";String exact="  Long Password Case Sensitive  ";var input=new HashMap<>(registration(email.toUpperCase(Locale.ROOT)));input.put("password",exact);
        assertEquals(201,request("POST","/auth/register/customer",null,input,null,true).getResponse().getStatus());
        assertTrue(accounts.findByEmail(email).isPresent());
        assertEquals(401,request("POST","/auth/login",null,Map.of("email",email,"password",exact.trim()),null,true).getResponse().getStatus());
        assertEquals(200,request("POST","/auth/login",null,Map.of("email",email,"password",exact),null,true).getResponse().getStatus());
        input.put("email",UUID.randomUUID()+"@security.test");input.put("password","\u00e9".repeat(37));var before=snapshot();
        assertEquals(400,request("POST","/auth/register/customer",null,input,null,true).getResponse().getStatus());assertEquals(before,snapshot());
        String token=login("CUSTOMER").access();before=snapshot();
        for(String field:List.of("accountId","customerId","role","status","email","password")) {
            assertEquals(400,request("PUT","/customers/"+people.get("CUSTOMER").profile(),token,Map.of("name","New","phoneNumber","09000000","address","Test",field,"attacker"),null,false).getResponse().getStatus());assertEquals(before,snapshot());
        }
    }

}
