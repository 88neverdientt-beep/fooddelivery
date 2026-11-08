package vn.gaugaugau.fooddelivery.auth.config;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
@ConfigurationProperties(prefix="fooddelivery.auth")
public record AuthProperties(boolean persistenceEnabled,Duration accessTokenTtl,Duration refreshSessionTtl) {
    public AuthProperties {
        if(accessTokenTtl==null) accessTokenTtl=Duration.ofMinutes(10);
        if(refreshSessionTtl==null) refreshSessionTtl=Duration.ofDays(7);
        if(accessTokenTtl.isZero() || accessTokenTtl.isNegative() || refreshSessionTtl.isZero()
            || refreshSessionTtl.isNegative() || accessTokenTtl.compareTo(refreshSessionTtl)>=0
            || refreshSessionTtl.compareTo(Duration.ofDays(7))>0)
            throw new IllegalArgumentException("Invalid authentication token lifetimes");
    }
}
