package vn.gaugaugau.fooddelivery.auth;
import java.nio.file.*;
import java.security.*;
import java.util.Base64;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.DynamicPropertyRegistry;
public abstract class AuthTestKeys {
    public static final Path DIRECTORY;
    public static final KeyPair KEYS;
    static {
        try {
            DIRECTORY=Files.createTempDirectory("fooddelivery-test-keys-");
            var generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);KEYS=generator.generateKeyPair();
            Files.writeString(DIRECTORY.resolve("private.pem"),pem("PRIVATE KEY",KEYS.getPrivate().getEncoded()));
            Files.writeString(DIRECTORY.resolve("public.pem"),pem("PUBLIC KEY",KEYS.getPublic().getEncoded()));
        }catch(Exception e){throw new ExceptionInInitializerError(e);}
    }
    private static String pem(String type,byte[] bytes){return "-----BEGIN "+type+"-----\n"+Base64.getMimeEncoder(64,new byte[]{10}).encodeToString(bytes)+"\n-----END "+type+"-----\n";}
    @DynamicPropertySource static void keys(DynamicPropertyRegistry registry){
        registry.add("fooddelivery.jwt.allowed-origins",()->"https://ui.fooddelivery.test");
        registry.add("fooddelivery.auth.persistence-enabled",()->"true");
        registry.add("fooddelivery.jwt.issuer",()->"https://fooddelivery.test");registry.add("fooddelivery.jwt.audience",()->"fooddelivery-api");
        registry.add("fooddelivery.jwt.private-key-path",()->DIRECTORY.resolve("private.pem").toString());registry.add("fooddelivery.jwt.public-key-path",()->DIRECTORY.resolve("public.pem").toString());
    }
}
