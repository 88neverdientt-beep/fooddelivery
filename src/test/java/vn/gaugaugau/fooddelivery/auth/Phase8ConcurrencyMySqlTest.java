package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.util.*;
import java.util.concurrent.*;
import jakarta.persistence.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.service.AuthService;
import vn.gaugaugau.fooddelivery.model.*;

@EnabledIfEnvironmentVariable(named="RUN_STAGE7_MYSQL_TESTS",matches="true")
@SpringBootTest(properties={"spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_stage8_e2e}?allowPublicKeyRetrieval=true&sslMode=DISABLED",
 "spring.datasource.username=${FOOD_TEST_DB_USERNAME:stage8_app}","spring.datasource.password=${STAGE2_MYSQL_PASSWORD}","spring.jpa.hibernate.ddl-auto=validate","spring.jpa.open-in-view=false","fooddelivery.concurrency.require-preconditions=true"})
@AutoConfigureMockMvc(print=org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.NONE)
class Phase8ConcurrencyMySqlTest extends AuthTestKeys {
 @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired JdbcTemplate jdbc;
 @Autowired EntityManager em; @Autowired EntityManagerFactory factory; @Autowired PlatformTransactionManager manager;
 @Autowired AuthService auth; @Autowired javax.sql.DataSource source;
 record Person(Long account,Long profile,String email){}
 final Map<String,Person> people=new HashMap<>();final Map<String,String> tokens=new ConcurrentHashMap<>();
 final String password=UUID.randomUUID()+"-stage8",hash=new BCryptPasswordEncoder(4).encode(password);
 @BeforeEach void fixture(){
  ApprovedMySqlTestTarget.assertTarget(jdbc);
  assertTrue(Set.of("fooddelivery_stage8_e2e","fooddelivery_full_audit","fooddelivery_phase8_2").contains(ApprovedMySqlTestTarget.databaseName()));
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   for(var role:Role.values()){
    String email=UUID.randomUUID()+"@stage8-cas.invalid";Long id=null;
    var a=Account.builder().email(email).passwordHash(hash).role(role).build();
    if(role==Role.CUSTOMER){var x=Customer.builder().name("Original").email(email).password(hash).phoneNumber("0900000000").address("Stage8 own customer").build();em.persist(x);id=x.getCustomerId();a.setCustomer(x);}
    if(role==Role.RESTAURANT){var x=Restaurant.builder().name("Original").email(email).password(hash).phoneNumber("0900000000").address("Stage8 own restaurant").restaurantStatus(true).build();em.persist(x);id=x.getRestaurantId();a.setRestaurant(x);}
    if(role==Role.DRIVER){var x=Driver.builder().name("Original").email(email).password(hash).phoneNumber("0900000000").address("Stage8 own driver").licensePlate("QA08").driveStatus(true).build();em.persist(x);id=x.getDriverId();a.setDriver(x);}
    em.persist(a);people.put(role.name(),new Person(a.getAccountId(),id,email));
   }
  });
 }
 String token(String who){return tokens.computeIfAbsent(who,k->auth.login(new vn.gaugaugau.fooddelivery.auth.dto.AuthDtos.Login(people.get(k).email(),password),"stage8-"+UUID.randomUUID()).response().accessToken());}
 MvcResult call(String method,String path,String who,Object body)throws Exception{
  var request=request(HttpMethod.valueOf(method),path).header("Authorization","Bearer "+token(who));
  if(body!=null)request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body));
  return mvc.perform(request).andReturn();
 }
 @SuppressWarnings("unchecked") Map<String,Object> data(MvcResult r)throws Exception{return (Map<String,Object>)json.readValue(r.getResponse().getContentAsString(),Map.class).get("data");}
 String table(String role){return role.toLowerCase()+"s";}
 String path(String role){return "/"+table(role)+"/"+people.get(role).profile();}
 Map<String,Object> profile(String role,String name,Long version){
  var b=new HashMap<String,Object>();b.put("name",name);b.put("phoneNumber","0900000000");b.put("address","Stage8 own "+role.toLowerCase());
  if(role.equals("RESTAURANT"))b.put("restaurantStatus",true);
  if(role.equals("DRIVER")){b.put("licensePlate","QA08");b.put("driveStatus",true);}
  if(version!=null)b.put("expectedVersion",version);return b;
 }
 long revision(String role){return jdbc.queryForObject("SELECT version FROM "+table(role)+" WHERE "+role.toLowerCase()+"_id=?",Long.class,people.get(role).profile());}
 Map<String,Object> status(String state,long version){return Map.of("status",state,"expectedStatus",state.equals("ACTIVE")?"DISABLED":"ACTIVE","expectedVersion",version);}
 String accountPath(){return "/admin/accounts/"+people.get("CUSTOMER").account()+"/status";}
 @Test void versionsAreExposedWithoutAdvancingOnRead()throws Exception{
  for(String role:List.of("CUSTOMER","RESTAURANT","DRIVER")){
   var exposed=data(call("GET",role.equals("RESTAURANT")?"/restaurant-management/profile":path(role),role,null)).get("version");
   assertNotNull(exposed,"Own profile must expose revision");assertEquals(0L,((Number)exposed).longValue());
   assertEquals(0L,revision(role));
  }
  assertEquals(0L,((Number)Objects.requireNonNull(data(call("GET","/admin-management/accounts/"+people.get("CUSTOMER").account(),"ADMIN",null)).get("version"),"Account must expose revision")).longValue());
 }
 @Test void allProfileWritersRejectAnOldRevisionAfterAba()throws Exception{
  for(String role:List.of("CUSTOMER","RESTAURANT","DRIVER")){
   assertEquals(200,call("PUT",path(role),role,profile(role,"Changed",0L)).getResponse().getStatus());
   assertEquals(200,call("PUT",path(role),role,profile(role,"Original",1L)).getResponse().getStatus());
   var before=jdbc.queryForList("CHECKSUM TABLE "+table(role)+" EXTENDED");
   assertEquals(409,call("PUT",path(role),role,profile(role,"Stale overwrite",0L)).getResponse().getStatus());
   assertEquals(before,jdbc.queryForList("CHECKSUM TABLE "+table(role)+" EXTENDED"));assertEquals(2L,revision(role));
  }
 }
 @Test void twoConcurrentProfileRequestsWithSameRevisionCommitOnce()throws Exception{
  for(String role:List.of("CUSTOMER","RESTAURANT","DRIVER")){
   token(role);var gate=new CyclicBarrier(2);var pool=Executors.newFixedThreadPool(2);
   try{
    var a=pool.submit(()->{gate.await(10,TimeUnit.SECONDS);return call("PUT",path(role),role,profile(role,"Winner A",0L)).getResponse().getStatus();});
    var b=pool.submit(()->{gate.await(10,TimeUnit.SECONDS);return call("PUT",path(role),role,profile(role,"Winner B",0L)).getResponse().getStatus();});
    assertEquals(List.of(200,409),List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS)).stream().sorted().toList());assertEquals(1L,revision(role));
   }finally{pool.shutdownNow();}
  }
 }
 @Test void accountStatusAbaRejectsOldRevisionAndNeverRestoresRevokedSessions()throws Exception{
  token("CUSTOMER");var id=people.get("CUSTOMER").account();
  assertEquals(200,call("PUT",accountPath(),"ADMIN",status("DISABLED",0)).getResponse().getStatus());
  assertEquals(200,call("PUT",accountPath(),"ADMIN",status("ACTIVE",1)).getResponse().getStatus());
  var before=jdbc.queryForList("CHECKSUM TABLE accounts,auth_sessions EXTENDED");
  assertEquals(409,call("PUT",accountPath(),"ADMIN",status("DISABLED",0)).getResponse().getStatus());
  assertEquals(before,jdbc.queryForList("CHECKSUM TABLE accounts,auth_sessions EXTENDED"));
  assertEquals(2L,jdbc.queryForObject("SELECT version FROM accounts WHERE account_id=?",Long.class,id));
  assertEquals(401,call("GET","/auth/me","CUSTOMER",null).getResponse().getStatus());
 }
 @Test void strictModeRejectsMissingAndNegativePreconditionsWithoutWriting()throws Exception{
  for(String role:List.of("CUSTOMER","RESTAURANT","DRIVER")){
   assertEquals(428,call("PUT",path(role),role,profile(role,"Missing",null)).getResponse().getStatus());
   assertEquals(400,call("PUT",path(role),role,profile(role,"Negative",-1L)).getResponse().getStatus());assertEquals(0L,revision(role));
  }
  assertEquals(428,call("PUT",accountPath(),"ADMIN",Map.of("status","DISABLED","expectedStatus","ACTIVE")).getResponse().getStatus());
  assertEquals(400,call("PUT",accountPath(),"ADMIN",status("DISABLED",-1)).getResponse().getStatus());
 }
 @Test void directConcurrentJpaUpdatesAlsoHaveOneOptimisticLockWinner()throws Exception{
  var gate=new CyclicBarrier(2);var pool=Executors.newFixedThreadPool(2);
  java.util.concurrent.Callable<Integer> update=()->{
   var entity=factory.createEntityManager();try{entity.getTransaction().begin();var c=entity.find(Customer.class,people.get("CUSTOMER").profile());gate.await(10,TimeUnit.SECONDS);c.setName(Thread.currentThread().getName());entity.getTransaction().commit();return 200;}
   catch(jakarta.persistence.RollbackException|jakarta.persistence.OptimisticLockException ex){if(entity.getTransaction().isActive())entity.getTransaction().rollback();return 409;}
   finally{entity.close();}
  };
  try{var a=pool.submit(update);var b=pool.submit(update);assertEquals(List.of(200,409),List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS)).stream().sorted().toList());assertEquals(1L,revision("CUSTOMER"));}finally{pool.shutdownNow();}
 }
 @Test void rollbackRestoresBothProfileAndAccountRevisions(){
  assertThrows(IllegalStateException.class,()->new TransactionTemplate(manager).executeWithoutResult(tx->{
   em.find(Customer.class,people.get("CUSTOMER").profile()).setName("Must rollback");
   em.find(Account.class,people.get("CUSTOMER").account()).setStatus(AccountStatus.DISABLED);em.flush();
   assertEquals(1L,revision("CUSTOMER"));throw new IllegalStateException("Deliberate Stage8 rollback");
  }));
  assertEquals(0L,revision("CUSTOMER"));assertEquals("Original",jdbc.queryForObject("SELECT name FROM customers WHERE customer_id=?",String.class,people.get("CUSTOMER").profile()));
  assertEquals(0L,jdbc.queryForObject("SELECT version FROM accounts WHERE account_id=?",Long.class,people.get("CUSTOMER").account()));
 }
 @Test void killedOwnMysqlConnectionRollsBackAndPoolRecovers()throws Exception{
  try(var connection=source.getConnection()){
   connection.setAutoCommit(false);long cid;
   try(var query=connection.createStatement();var rows=query.executeQuery("SELECT CONNECTION_ID()")){assertTrue(rows.next());cid=rows.getLong(1);}
   try(var change=connection.prepareStatement("UPDATE customers SET name='Interrupted uncommitted',version=version+1 WHERE customer_id=?")){change.setLong(1,people.get("CUSTOMER").profile());assertEquals(1,change.executeUpdate());}
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.processlist WHERE ID=? AND USER=SUBSTRING_INDEX(CURRENT_USER(),'@',1) AND DB=?",Integer.class,cid,ApprovedMySqlTestTarget.databaseName()));
   jdbc.execute("KILL CONNECTION "+cid);assertThrows(java.sql.SQLException.class,connection::commit);
  }
  assertEquals(1,jdbc.queryForObject("SELECT 1",Integer.class));assertEquals(0L,revision("CUSTOMER"));
  assertEquals("Original",jdbc.queryForObject("SELECT name FROM customers WHERE customer_id=?",String.class,people.get("CUSTOMER").profile()));
 }
 long cartMenu(){
  return new TransactionTemplate(manager).execute(tx->{
   var food=FoodItem.builder().name("Stage8 cart race "+UUID.randomUUID()).category("Pho").build();em.persist(food);
   var menu=RestaurantFoodItem.builder().restaurant(em.find(Restaurant.class,people.get("RESTAURANT").profile())).foodItem(food)
    .price(new java.math.BigDecimal("25000")).isAvailable(true).build();em.persist(menu);em.flush();return menu.getRestaurantFoodItemId();
  });
 }
 @Test void firstCartAddUsesCurrentDataAfterAnOlderRepeatableReadSnapshot()throws Exception{
  long customer=people.get("CUSTOMER").profile(),menu=cartMenu();token("CUSTOMER");
  var snapshot=new CountDownLatch(1);var committed=new CountDownLatch(1);var pool=Executors.newSingleThreadExecutor();
  try{
   var delayed=pool.submit(()->new TransactionTemplate(manager).execute(tx->{
    assertEquals("REPEATABLE-READ",jdbc.queryForObject("SELECT @@transaction_isolation",String.class));
    assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM carts WHERE customer_id=?",Integer.class,customer));snapshot.countDown();
    try{
     assertTrue(committed.await(15,TimeUnit.SECONDS));
     int status=call("POST","/"+customer+"/cart-items","CUSTOMER",Map.of("restaurantFoodItemId",menu,"quantity",1)).getResponse().getStatus();
     if(status!=201)tx.setRollbackOnly();return status;
    }catch(Exception ex){throw new IllegalStateException(ex);}
   }));
   assertTrue(snapshot.await(15,TimeUnit.SECONDS));
   assertEquals(201,call("POST","/"+customer+"/cart-items","CUSTOMER",Map.of("restaurantFoodItemId",menu,"quantity",1)).getResponse().getStatus());
   committed.countDown();assertEquals(201,delayed.get(30,TimeUnit.SECONDS));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM carts WHERE customer_id=?",Integer.class,customer));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM cart_items ci JOIN carts c ON c.cart_id=ci.cart_id WHERE c.customer_id=?",Integer.class,customer));
   assertEquals(2,jdbc.queryForObject("SELECT ci.quantity FROM cart_items ci JOIN carts c ON c.cart_id=ci.cart_id WHERE c.customer_id=?",Integer.class,customer));
  }finally{committed.countDown();pool.shutdownNow();}
 }
 @Test void differentCustomersCanCreateTheirFirstCartsConcurrently()throws Exception{
  long menu=cartMenu();var owners=new ArrayList<String>();owners.add("CUSTOMER");
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   for(int i=1;i<5;i++){
    String key="CUSTOMER"+i,email=UUID.randomUUID()+"@stage8-cart.invalid";
    var customer=Customer.builder().name("Stage8 independent first cart").email(email).password(hash).phoneNumber("0900000000").address("Stage8 isolated cart fixture").build();em.persist(customer);
    var account=Account.builder().email(email).passwordHash(hash).role(Role.CUSTOMER).customer(customer).build();em.persist(account);
    people.put(key,new Person(account.getAccountId(),customer.getCustomerId(),email));owners.add(key);
   }
  });
  owners.forEach(this::token);var gate=new CyclicBarrier(owners.size());var pool=Executors.newFixedThreadPool(owners.size());
  try{
   var results=new ArrayList<Future<Integer>>();
   for(String owner:owners)results.add(pool.submit(()->{gate.await(15,TimeUnit.SECONDS);return call("POST","/"+people.get(owner).profile()+"/cart-items",owner,Map.of("restaurantFoodItemId",menu,"quantity",1)).getResponse().getStatus();}));
   for(var result:results)assertEquals(201,result.get(30,TimeUnit.SECONDS));
   for(String owner:owners)assertEquals(1,jdbc.queryForObject("SELECT ci.quantity FROM cart_items ci JOIN carts c ON c.cart_id=ci.cart_id WHERE c.customer_id=?",Integer.class,people.get(owner).profile()));
  }finally{pool.shutdownNow();}
 }
 @Test void rejectedFirstAddRollsBackCartMaterialization()throws Exception{
  long menu=cartMenu(),customer=people.get("CUSTOMER").profile();
  new TransactionTemplate(manager).executeWithoutResult(tx->em.find(RestaurantFoodItem.class,menu).setIsAvailable(false));
  assertEquals(409,call("POST","/"+customer+"/cart-items","CUSTOMER",Map.of("restaurantFoodItemId",menu,"quantity",1)).getResponse().getStatus());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM carts WHERE customer_id=?",Integer.class,customer));
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM cart_items WHERE restaurant_food_item_id=?",Integer.class,menu));
  assertEquals(0L,revision("CUSTOMER"));
 }
}
