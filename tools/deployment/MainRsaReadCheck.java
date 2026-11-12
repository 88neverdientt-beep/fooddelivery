import java.nio.file.Path;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import vn.gaugaugau.fooddelivery.auth.config.*;

/** Offline signing check; no tokens, private material or exception text leave this JVM. */
public final class MainRsaReadCheck {
    static int checks=0;
    static void require(boolean condition){if(!condition)throw new IllegalStateException();checks++;}
    static String token(JwtEncoder e,String issuer,String audience,String type,String subject,Instant i,Instant x,String sid){
        return e.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).type(type).build(),
            JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience)).subject(subject).id(UUID.randomUUID().toString())
            .issuedAt(i).notBefore(i).expiresAt(x).claim("sid",sid).build())).getTokenValue();
    }
    static void reject(JwtDecoder d,String token){try{d.decode(token);}catch(JwtException expected){checks++;return;}throw new IllegalStateException();}
    public static void main(String[] args){
        try {
            ((ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME)).setLevel(ch.qos.logback.classic.Level.OFF);
            var s=new JwtSettings(args[2],"fooddelivery-main",Path.of(args[0]),Path.of(args[1]),List.of(args[2]));
            var c=new JwtConfiguration();var keys=c.authKeyPair(s);
            require(((RSAPublicKey)keys.getPublic()).getModulus().bitLength()==3072);
            var e=c.jwtEncoder(keys);var d=c.jwtDecoder(keys,s);var now=Instant.now();String sid=UUID.randomUUID().toString();
            var valid=token(e,s.issuer(),s.audience(),"at+jwt","1",now,now.plusSeconds(600),sid);
            var decoded=d.decode(valid);require("RS256".equals(decoded.getHeaders().get("alg")));require("1".equals(decoded.getSubject()));
            reject(d,token(e,"https://invalid.test",s.audience(),"at+jwt","1",now,now.plusSeconds(600),sid));
            reject(d,token(e,s.issuer(),"wrong","at+jwt","1",now,now.plusSeconds(600),sid));
            reject(d,token(e,s.issuer(),s.audience(),"JWT","1",now,now.plusSeconds(600),sid));
            reject(d,token(e,s.issuer(),s.audience(),"at+jwt","1",now.minusSeconds(1000),now.minusSeconds(200),sid));
            reject(d,token(e,s.issuer(),s.audience(),"at+jwt","0",now,now.plusSeconds(600),sid));
            reject(d,token(e,s.issuer(),s.audience(),"at+jwt","1",now,now.plusSeconds(600),"not-a-uuid"));
            var g=KeyPairGenerator.getInstance("RSA");g.initialize(2048);
            reject(d,token(c.jwtEncoder(g.generateKeyPair()),s.issuer(),s.audience(),"at+jwt","1",now,now.plusSeconds(600),sid));
            byte[] symmetric=new byte[32];new SecureRandom().nextBytes(symmetric);
            var hs=new com.nimbusds.jwt.SignedJWT(new com.nimbusds.jose.JWSHeader(com.nimbusds.jose.JWSAlgorithm.HS256),new com.nimbusds.jwt.JWTClaimsSet.Builder().subject("1").build());
            hs.sign(new com.nimbusds.jose.crypto.MACSigner(symmetric));reject(d,hs.serialize());
            System.out.println("{\"status\":\"PASS\",\"checks\":"+checks+",\"rsaBits\":3072,\"databaseConnected\":false,\"tokensLogged\":false}");
        }catch(Throwable failure){System.out.println("{\"status\":\"FAIL\",\"detailsWithheld\":true}");System.exit(1);}
    }
}
