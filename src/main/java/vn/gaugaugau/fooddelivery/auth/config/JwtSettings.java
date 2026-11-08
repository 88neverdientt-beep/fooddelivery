package vn.gaugaugau.fooddelivery.auth.config;
import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
@ConfigurationProperties(prefix="fooddelivery.jwt")
public record JwtSettings(String issuer,String audience,Path privateKeyPath,Path publicKeyPath,List<String> allowedOrigins) {
    public JwtSettings {
        if(issuer==null || issuer.isBlank() || audience==null || audience.isBlank() || privateKeyPath==null || publicKeyPath==null)
            throw new IllegalArgumentException("JWT issuer, audience and external RSA key paths are required");
        allowedOrigins=allowedOrigins==null?List.of():List.copyOf(allowedOrigins);
        if(allowedOrigins.stream().anyMatch(o->o.contains("*"))) throw new IllegalArgumentException("Wildcard CORS origins are not allowed");
    }
}
