import java.nio.file.*;
import java.util.*;
/** Creates synthetic test-only credentials in an already protected external directory. No DB. */
public final class ReportFixtureIdentity {
    public static void main(String[] args)throws Exception {
        var path=Path.of(args[0]).toAbsolutePath();if(!path.getFileName().toString().equals("fixture-auth.json")||Files.exists(path))throw new IllegalArgumentException();
        String password=UUID.randomUUID().toString();String hash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(12).encode(password);
        Files.writeString(path,new tools.jackson.databind.ObjectMapper().writeValueAsString(Map.of("password",password,"hash",hash)),StandardOpenOption.CREATE_NEW);
        System.out.println("{\"fixtureCreated\":true,\"credentialPrinted\":false}");
    }
}
