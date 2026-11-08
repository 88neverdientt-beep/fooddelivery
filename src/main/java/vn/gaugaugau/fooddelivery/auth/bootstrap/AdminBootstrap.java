package vn.gaugaugau.fooddelivery.auth.bootstrap;
import java.nio.file.*;
import java.sql.*;
import java.util.Properties;
import vn.gaugaugau.fooddelivery.auth.EmailAddress;
import vn.gaugaugau.fooddelivery.auth.service.AuthService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
/** Explicit CLI entry point: no SpringApplication, HTTP server, default account or default credential. */
public final class AdminBootstrap {
    public static void main(String[] args) throws Exception {
        if(!"true".equals(System.getenv("FOOD_ADMIN_BOOTSTRAP_ENABLED"))) throw new IllegalStateException("Admin bootstrap is disabled");
        String credentialPath=required("FOOD_ADMIN_CREDENTIAL_FILE");var credential=new Properties();
        try(var input=Files.newInputStream(Path.of(credentialPath))){credential.load(input);}
        String email=EmailAddress.normalize(credential.getProperty("email"));String password=credential.getProperty("password");AuthService.validatePassword(password);
        String hash=new BCryptPasswordEncoder(12).encode(password);credential.clear();
        try(var connection=DriverManager.getConnection(required("FOOD_DB_URL"),required("FOOD_DB_USERNAME"),required("FOOD_DB_PASSWORD"))) {
            try(var lock=connection.prepareStatement("SELECT GET_LOCK('fooddelivery.admin.bootstrap',10)")){
                try(var result=lock.executeQuery()){if(!result.next() || result.getInt(1)!=1)throw new IllegalStateException("Bootstrap lock unavailable");}
            }
            try {
                connection.setAutoCommit(false);
                try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT COUNT(*) FROM accounts WHERE role='ADMIN'")){
                    rows.next();if(rows.getLong(1)>0)throw new IllegalStateException("An ADMIN already exists; bootstrap refused");
                }
                try(var insert=connection.prepareStatement("INSERT INTO accounts(email,password_hash,role,status) VALUES (?,?,'ADMIN','ACTIVE')")){
                    insert.setString(1,email);insert.setString(2,hash);insert.executeUpdate();
                }
                connection.commit();System.out.println("ADMIN bootstrap completed");
            } finally {
                connection.rollback();
                try(var statement=connection.createStatement()){statement.execute("SELECT RELEASE_LOCK('fooddelivery.admin.bootstrap')");}
            }
        }
    }
    private static String required(String name){String value=System.getenv(name);if(value==null || value.isBlank())throw new IllegalArgumentException("Missing required setting: "+name);return value;}
}
