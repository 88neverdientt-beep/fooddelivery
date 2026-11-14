package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.security.*;
import vn.gaugaugau.fooddelivery.auth.service.AuthService;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantRequestDTO;
import vn.gaugaugau.fooddelivery.service.*;

@org.junit.jupiter.api.condition.EnabledIf("enabled")
@SpringBootTest(properties={"spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_coursework_a21}?sslMode=REQUIRED",
 "spring.datasource.username=${FOOD_TEST_DB_USERNAME:coursework_a21_app}","spring.datasource.password=${STAGE2_MYSQL_PASSWORD}","spring.jpa.hibernate.ddl-auto=validate","spring.jpa.open-in-view=false"})
class RestaurantCreationMySqlTest extends AuthTestKeys {
    static boolean enabled(){return ApprovedMySqlTestTarget.enabled("RUN_A21_MYSQL_TESTS");}
    @Autowired AuthService auth;@Autowired JdbcTemplate jdbc;@Autowired PlatformTransactionManager manager;
    @Autowired AdminManagementService management;@Autowired RestaurantExcelExportService export;
    @BeforeEach void target(){ApprovedMySqlTestTarget.assertCourseworkTarget(jdbc,"fooddelivery_coursework_a21");as(Role.ADMIN);}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    void as(Role role){SecurityContextHolder.getContext().setAuthentication(new ActorAuthentication(new Actor(1L,"test",role,null,role==Role.RESTAURANT?1L:null,role==Role.DRIVER?1L:null)));}
    RestaurantRequestDTO input(String email){return RestaurantRequestDTO.builder().name("Bếp Hà Nội "+UUID.randomUUID()).email(email).password(UUID.randomUUID()+"-Test").phoneNumber("0901234567").address("12 Hà Nội").restaurantStatus(true).build();}
    String email(){return "a21-"+UUID.randomUUID()+"@test.example";}
    long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class);}
    @Test void createsBothRowsAndRereadsRealProfileById(){
        var created=auth.createRestaurant(input(email()));var detail=management.restaurant(created.restaurantId());
        assertEquals(created.accountId(),detail.accountId());assertEquals(created.email(),detail.email());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM accounts a JOIN restaurants r ON r.restaurant_id=a.restaurant_id WHERE a.account_id=? AND a.role='RESTAURANT' AND BINARY a.email=BINARY r.email",Integer.class,created.accountId()));
        String hash=jdbc.queryForObject("SELECT password_hash FROM accounts WHERE account_id=?",String.class,created.accountId());assertTrue(hash.startsWith("$2a$12$"));
    }
    @Test void rollbackRemovesAccountAndProfileTogether(){
        String email=email();long a=count("accounts"),r=count("restaurants");
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(manager).executeWithoutResult(tx->{auth.createRestaurant(input(email));throw new IllegalStateException("Rollback probe after account flush");}));
        assertEquals(a,count("accounts"));assertEquals(r,count("restaurants"));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM restaurants WHERE email=?",Integer.class,email));
    }
    @Test void normalizedDuplicateCannotCreateAnOrphanProfile(){
        String email=email();auth.createRestaurant(input(email));long a=count("accounts"),r=count("restaurants");
        assertThrows(RuntimeException.class,()->auth.createRestaurant(input(email.toUpperCase(java.util.Locale.ROOT))));assertEquals(a,count("accounts"));assertEquals(r,count("restaurants"));
    }
    @Test void twoConcurrentSubmissionsHaveExactlyOneAccountAndProfile()throws Exception {
        String email=email();var executor=Executors.newFixedThreadPool(2);var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        try {List<Future<Boolean>> jobs=new ArrayList<>();for(int i=0;i<2;i++)jobs.add(executor.submit(()->{as(Role.ADMIN);ready.countDown();start.await();try{auth.createRestaurant(input(email));return true;}catch(RuntimeException e){return false;}finally{clear();}}));
            assertTrue(ready.await(5,TimeUnit.SECONDS));start.countDown();int successes=0;for(var job:jobs)if(job.get(20,TimeUnit.SECONDS))successes++;assertEquals(1,successes);
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM accounts WHERE email=?",Integer.class,email));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM restaurants WHERE email=?",Integer.class,email));
        }finally{executor.shutdownNow();}
    }
    @Test void filteredExportReadsAllMatchingRowsAndEmptyWorkbookIsValid()throws Exception {
        String tag="Export "+UUID.randomUUID();for(int i=0;i<3;i++){var value=input(email());value.setName(tag+" "+i);auth.createRestaurant(value);}
        var query=management.restaurantExportQuery(Map.of("q",tag,"activity","open","sort","oldest"));assertFalse(query.sql().contains("LIMIT"));
        var out=new ByteArrayOutputStream();export.write(query,out);String xml=sheet(out.toByteArray());assertEquals(4,xml.split("<row ",-1).length-1);assertTrue(xml.contains(tag));assertFalse(xml.contains("password"));
        out.reset();export.write(management.restaurantExportQuery(Map.of("q","no-match-"+UUID.randomUUID())),out);assertEquals(1,sheet(out.toByteArray()).split("<row ",-1).length-1);
    }
    @Test void nonAdminCannotCreateOrExport(){
        var query=management.restaurantExportQuery(Map.of());
        for(var role:List.of(Role.CUSTOMER,Role.RESTAURANT,Role.DRIVER)){as(role);assertThrows(AccessDeniedException.class,()->auth.createRestaurant(input(email())));assertThrows(AccessDeniedException.class,()->export.write(query,new ByteArrayOutputStream()));}
    }
    @Test void rejectsPaginationAndUntrustedSortForFullExport(){
        assertThrows(RuntimeException.class,()->management.restaurantExportQuery(Map.of("page","1")));
        assertThrows(RuntimeException.class,()->management.restaurantExportQuery(Map.of("sort","r.password")));
    }
    String sheet(byte[] bytes)throws Exception {try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))){ZipEntry e;while((e=zip.getNextEntry())!=null)if(e.getName().equals("xl/worksheets/sheet1.xml"))return new String(zip.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}throw new AssertionError("Missing sheet");}
}
