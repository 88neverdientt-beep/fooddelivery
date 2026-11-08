package vn.gaugaugau.fooddelivery.auth.config;
import java.nio.file.*;
import java.security.*;
import java.security.interfaces.*;
import java.security.spec.*;
import java.time.*;
import java.util.*;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.springframework.context.annotation.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
@Configuration(proxyBeanMethods=false)
@EnableConfigurationProperties(JwtSettings.class)
public class JwtConfiguration {
    @Bean public Clock authClock(){return Clock.systemUTC();}
    private byte[] pem(Path path) throws Exception {
        String text=Files.readString(path).replaceAll("-----[^-]+-----", "").replaceAll("\\s", "");
        return Base64.getDecoder().decode(text);
    }
    @Bean public KeyPair authKeyPair(JwtSettings settings) {
        try {
            var factory=KeyFactory.getInstance("RSA");
            var privateKey=(RSAPrivateKey)factory.generatePrivate(new PKCS8EncodedKeySpec(pem(settings.privateKeyPath())));
            var publicKey=(RSAPublicKey)factory.generatePublic(new X509EncodedKeySpec(pem(settings.publicKeyPath())));
            if(publicKey.getModulus().bitLength()<2048 || !publicKey.getModulus().equals(privateKey.getModulus())) throw new IllegalArgumentException();
            return new KeyPair(publicKey,privateKey);
        }catch(Exception e){throw new IllegalStateException("Cannot load matching external RSA keys (2048 bits minimum)");}
    }
    @Bean public JwtEncoder jwtEncoder(KeyPair keys) {
        var jwk=new com.nimbusds.jose.jwk.RSAKey.Builder((RSAPublicKey)keys.getPublic()).privateKey(keys.getPrivate()).keyID("fooddelivery-rs256").build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwk)));
    }
    @Bean public JwtDecoder jwtDecoder(KeyPair keys,JwtSettings settings) {
        var decoder=NimbusJwtDecoder.withPublicKey((RSAPublicKey)keys.getPublic()).signatureAlgorithm(SignatureAlgorithm.RS256).validateType(false).build();
        OAuth2TokenValidator<Jwt> required=jwt->{
            boolean valid="at+jwt".equals(jwt.getHeaders().get("typ")) && jwt.getAudience()!=null && jwt.getAudience().contains(settings.audience())
                && jwt.getIssuedAt()!=null && jwt.getNotBefore()!=null && jwt.getExpiresAt()!=null
                && jwt.getExpiresAt().isAfter(jwt.getIssuedAt()) && jwt.getIssuedAt().isBefore(Instant.now().plusSeconds(30));
            try {valid=valid && Long.parseLong(jwt.getSubject())>0 && UUID.fromString(jwt.getClaimAsString("sid"))!=null && UUID.fromString(jwt.getId())!=null;}
            catch(Exception e){valid=false;}
            return valid?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(),new JwtIssuerValidator(settings.issuer()),required));
        return decoder;
    }
}
