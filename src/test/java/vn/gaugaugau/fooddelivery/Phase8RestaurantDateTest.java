package vn.gaugaugau.fooddelivery;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.model.Role;
import vn.gaugaugau.fooddelivery.auth.security.*;
import vn.gaugaugau.fooddelivery.service.RestaurantManagementService;
class Phase8RestaurantDateTest {
 final JdbcTemplate jdbc=mock(JdbcTemplate.class);
 final RestaurantManagementService service=new RestaurantManagementService(jdbc,null,null);
 @BeforeEach void actor(){SecurityContextHolder.getContext().setAuthentication(new ActorAuthentication(new Actor(1L,java.util.UUID.randomUUID().toString(),Role.RESTAURANT,null,1L,null)));}
 @AfterEach void cleanup(){SecurityContextHolder.clearContext();}
 @Test void analyticsRejectsUnsupportedIsoYearsBeforeAnyQuery(){for(String end:java.util.List.of("+999999999-12-31","9999-12-31","0000-01-01")){assertEquals(400,assertThrows(ResponseStatusException.class,()->service.analytics(null,end)).getStatusCode().value());verifyNoInteractions(jdbc);}}
 @Test void ordersRejectUnsupportedIsoYearsBeforeAnyQuery(){for(String end:java.util.List.of("+999999999-12-31","9999-12-31","0000-01-01")){assertEquals(400,assertThrows(ResponseStatusException.class,()->service.orders("",null,null,end,"newest",0,20)).getStatusCode().value());verifyNoInteractions(jdbc);}}
 @Test void defaultWindowCannotCrossBelowSupportedFirstYear(){assertEquals(400,assertThrows(ResponseStatusException.class,()->service.analytics(null,"0001-01-01")).getStatusCode().value());verifyNoInteractions(jdbc);}
}
