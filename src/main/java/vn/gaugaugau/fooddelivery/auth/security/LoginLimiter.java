package vn.gaugaugau.fooddelivery.auth.security;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
/** Bounded single-instance demo limiter. Multi-instance deployment MUST add gateway/shared rate limits. */
@Component
public class LoginLimiter {
    private record Window(Instant expires,int count) {}
    private final Map<String,Window> windows=new HashMap<>();
    public synchronized void check(String ip,String email) {
        Instant now=Instant.now();windows.entrySet().removeIf(e->!e.getValue().expires().isAfter(now));
        if(windows.size()>10000) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Try again later");
        increment("ip:"+ip,100,now);increment("email:"+email,10,now);
    }
    private void increment(String key,int max,Instant now){
        var old=windows.getOrDefault(key,new Window(now.plusSeconds(900),0));
        if(old.count()>=max) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Try again later");
        windows.put(key,new Window(old.expires(),old.count()+1));
    }
}
