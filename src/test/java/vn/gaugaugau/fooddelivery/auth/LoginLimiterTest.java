package vn.gaugaugau.fooddelivery.auth;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.security.LoginLimiter;
class LoginLimiterTest {
 @Test void emailLimitCannotBeBypassedByChangingIp(){var l=new LoginLimiter();for(int i=0;i<10;i++)l.check("ip"+i,"same@test");assertEquals(429,assertThrows(ResponseStatusException.class,()->l.check("another","same@test")).getStatusCode().value());}
 @Test void ipLimitCannotBeBypassedByChangingEmail(){var l=new LoginLimiter();for(int i=0;i<100;i++)l.check("same","email"+i);assertThrows(ResponseStatusException.class,()->l.check("same","new"));}
}
