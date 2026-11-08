package vn.gaugaugau.fooddelivery.auth.security;
import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
public final class ActorAuthentication extends AbstractAuthenticationToken {
    private final Actor actor;
    public ActorAuthentication(Actor actor){super(List.of(new SimpleGrantedAuthority("ROLE_"+actor.role().name())));this.actor=actor;setAuthenticated(true);}
    public Object getCredentials(){return "";}
    public Actor getPrincipal(){return actor;}
    public String getName(){return actor.accountId().toString();}
}
