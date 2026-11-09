package vn.gaugaugau.fooddelivery.auth;
import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.repository.*;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.repository.CustomerRepository;

// Run ONLY after resolving preflight and successfully migrating the approved test schema.
@EnabledIfEnvironmentVariable(named="RUN_STAGE2_AUTH_SCHEMA_TESTS",matches="true")
@SpringBootTest(properties={
    "fooddelivery.auth.persistence-enabled=true",
    "spring.datasource.url=jdbc:mysql://127.0.0.1:3307/${FOOD_TEST_DB_NAME:fooddelivery_stage2_rehearsal}?allowPublicKeyRetrieval=true&sslMode=DISABLED",
    "spring.datasource.username=${FOOD_TEST_DB_USERNAME:stage2_app}","spring.datasource.password=${STAGE2_MYSQL_PASSWORD}",
    "spring.jpa.hibernate.ddl-auto=validate","spring.jpa.open-in-view=false"})
class AuthPersistenceMySqlTest extends AuthTestKeys {
    static final String HASH=new BCryptPasswordEncoder(4).encode("integration-test-password");
    @Autowired AccountRepository accounts;
    @Autowired AuthSessionRepository sessions;
    @Autowired RefreshTokenRepository refresh;
    @Autowired CustomerRepository customers;
    @Autowired PlatformTransactionManager manager;
    @Autowired JdbcTemplate jdbc;
    TransactionTemplate tx() {
        ApprovedMySqlTestTarget.assertTarget(jdbc);
        return new TransactionTemplate(manager);
    }
    String email() {return UUID.randomUUID()+"@test.invalid";}
    Account admin(String email) {return Account.builder().email(email).passwordHash(HASH).role(Role.ADMIN).build();}
    @Test void customerLinkPersistsWithoutChangingProfileIdentity() {
        tx().executeWithoutResult(status -> {
            var profile=customers.save(Customer.builder().name("Auth test").email(email()).password(HASH).phoneNumber("0900000000").address("Test").build());
            var account=accounts.saveAndFlush(Account.builder().email(profile.getEmail()).passwordHash(HASH).role(Role.CUSTOMER).customer(profile).build());
            assertEquals(profile.getCustomerId(),accounts.findByEmail(account.getEmail()).orElseThrow().getCustomer().getCustomerId());
            status.setRollbackOnly();
        });
    }
    @Test void normalizedEmailIsGloballyUnique() {
        String email=email();
        assertThrows(DataIntegrityViolationException.class,()->tx().executeWithoutResult(s -> {
            accounts.saveAndFlush(admin(email));accounts.saveAndFlush(admin(email.toUpperCase(Locale.ROOT)));
        }));
        assertTrue(accounts.findByEmail(email).isEmpty());
    }
    @Test void roleProfileCheckIsEnforcedByMysql() {
        assertMysqlCheck("ck_accounts_profile", ()->tx().executeWithoutResult(s ->
            jdbc.update("INSERT INTO accounts(email,password_hash,role,status) VALUES (?,?,'CUSTOMER','ACTIVE')",email(),HASH)));
    }
    @Test void accountSessionAndTokenRollBackTogether() {
        String email=email();
        assertThrows(IllegalStateException.class,()->tx().executeWithoutResult(status -> {
            var a=accounts.saveAndFlush(admin(email));var now=LocalDateTime.now(ZoneOffset.UTC);
            var session=sessions.saveAndFlush(AuthSession.builder().account(a).createdAt(now).expiresAt(now.plusDays(7)).build());
            refresh.saveAndFlush(RefreshToken.builder().session(session).tokenHash(new byte[32]).createdAt(now).expiresAt(session.getExpiresAt()).build());
            throw new IllegalStateException("Simulated failure");
        }));
        assertTrue(accounts.findByEmail(email).isEmpty());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM auth_sessions s JOIN accounts a ON a.account_id=s.account_id WHERE a.email=?",Integer.class,email));
    }
    @Test void sessionForeignKeyIsEnforcedByMysql() {
        assertThrows(DataIntegrityViolationException.class,()->tx().executeWithoutResult(s ->
            jdbc.update("INSERT INTO auth_sessions(session_id,account_id,created_at,expires_at) VALUES (?,9223372036854775807,UTC_TIMESTAMP(6),DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 DAY))",UUID.randomUUID().toString())));
    }
    @Test void refreshHashIsUnique() {
        assertThrows(DataIntegrityViolationException.class,()->tx().executeWithoutResult(status -> {
            var a=accounts.saveAndFlush(admin(email()));var now=LocalDateTime.now(ZoneOffset.UTC);
            var session=sessions.saveAndFlush(AuthSession.builder().account(a).createdAt(now).expiresAt(now.plusDays(7)).build());
            byte[] hash=new byte[32];new java.security.SecureRandom().nextBytes(hash);
            refresh.saveAndFlush(RefreshToken.builder().session(session).tokenHash(hash).createdAt(now).expiresAt(session.getExpiresAt()).build());
            refresh.saveAndFlush(RefreshToken.builder().session(session).tokenHash(hash).createdAt(now).expiresAt(session.getExpiresAt()).build());
        }));
    }
    @Test void deletingTokenAndSessionDoesNotDeleteAccount() {
        tx().executeWithoutResult(status -> {
            var account=accounts.saveAndFlush(admin(email()));var now=LocalDateTime.now(ZoneOffset.UTC);
            var session=sessions.saveAndFlush(AuthSession.builder().account(account).createdAt(now).expiresAt(now.plusDays(7)).build());
            byte[] hash=new byte[32];new java.security.SecureRandom().nextBytes(hash);
            var token=refresh.saveAndFlush(RefreshToken.builder().session(session).tokenHash(hash).createdAt(now).expiresAt(session.getExpiresAt()).build());
            refresh.delete(token);refresh.flush();sessions.delete(session);sessions.flush();
            assertTrue(accounts.existsById(account.getAccountId()));status.setRollbackOnly();
        });
    }
    @Test void oneProfileCannotBelongToTwoAccounts() {
        assertThrows(DataIntegrityViolationException.class,()->tx().executeWithoutResult(status -> {
            var profile=customers.save(Customer.builder().name("Auth test").email(email()).password(HASH).phoneNumber("0900000000").address("Test").build());
            accounts.saveAndFlush(Account.builder().email(email()).passwordHash(HASH).role(Role.CUSTOMER).customer(profile).build());
            accounts.saveAndFlush(Account.builder().email(email()).passwordHash(HASH).role(Role.CUSTOMER).customer(profile).build());
        }));
    }

    @Test void backfillPreservesAllThreeRolesAndLazyProfileLinks() {
        tx().executeWithoutResult(status -> {
            for (String role:List.of("CUSTOMER","RESTAURANT","DRIVER")) {
                assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM accounts WHERE role=? AND (customer_id IN (1001,1002) OR restaurant_id IN (2001,2002) OR driver_id IN (3001,3002))",Integer.class,role));
            }
            var c=accounts.findByEmail("c1@rehearsal.invalid").orElseThrow();
            var r=accounts.findByEmail("r1@rehearsal.invalid").orElseThrow();
            var d=accounts.findByEmail("d1@rehearsal.invalid").orElseThrow();
            assertEquals(1001L,c.getCustomer().getCustomerId());assertNotNull(c.getCustomer().getName());
            assertEquals(2001L,r.getRestaurant().getRestaurantId());assertNotNull(r.getRestaurant().getName());
            assertEquals(3001L,d.getDriver().getDriverId());assertNotNull(d.getDriver().getName());
            assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM accounts a LEFT JOIN customers c ON c.customer_id=a.customer_id LEFT JOIN restaurants r ON r.restaurant_id=a.restaurant_id LEFT JOIN drivers d ON d.driver_id=a.driver_id WHERE (a.customer_id IN (1001,1002) OR a.restaurant_id IN (2001,2002) OR a.driver_id IN (3001,3002)) AND BINARY a.password_hash<>BINARY COALESCE(c.password,r.password,d.password)",Integer.class));
        });
    }
    // Connector/J reports MySQL CHECK violations as HY000/3819, which Spring JDBC
    // may classify as UncategorizedSQLException. Assert the exact database error,
    // not an assumed Spring translation; FK/UNIQUE tests retain their assertions.
    void assertMysqlCheck(String constraint,Runnable action) {
        var error=assertThrows(org.springframework.dao.DataAccessException.class,action::run);
        var sql=assertInstanceOf(java.sql.SQLException.class,error.getMostSpecificCause());
        assertEquals(3819,sql.getErrorCode());assertTrue(sql.getMessage().contains(constraint));
    }
    @Test void roleAndStatusChecksRejectUnknownValues() {
        String roleClause=jdbc.queryForObject("SELECT check_clause FROM information_schema.check_constraints WHERE constraint_schema=DATABASE() AND constraint_name='ck_accounts_role'",String.class);
        for(String role:List.of("CUSTOMER","RESTAURANT","DRIVER","ADMIN")) assertTrue(roleClause.contains(role));
        for(String[] values:new String[][]{{"SUPERADMIN","ACTIVE"},{"ADMIN","UNKNOWN"}}) {
            String constraint=values[0].equals("ADMIN") ? "ck_accounts_status" : "ck_accounts_profile";
            assertMysqlCheck(constraint, ()->tx().executeWithoutResult(status ->
                jdbc.update("INSERT INTO accounts(email,password_hash,role,status) VALUES (?,?,?,?)",email(),HASH,values[0],values[1])));
        }
    }
    @Test void missingProfileForeignKeyIsRejected() {
        assertThrows(DataIntegrityViolationException.class,()->tx().executeWithoutResult(status ->
            jdbc.update("INSERT INTO accounts(email,password_hash,role,status,customer_id) VALUES (?,?,'CUSTOMER','ACTIVE',9223372036854775807)",email(),HASH)));
    }
    @Test void failedRegistrationRollsBackNewProfileAndAccount() {
        String email=email();
        assertThrows(IllegalStateException.class,()->tx().executeWithoutResult(status -> {
            var profile=customers.saveAndFlush(Customer.builder().name("Rollback registration").email(email).password(HASH).phoneNumber("0900000000").address("Test").build());
            accounts.saveAndFlush(Account.builder().email(email).passwordHash(HASH).role(Role.CUSTOMER).customer(profile).build());
            throw new IllegalStateException("Simulated failure after registration writes");
        }));
        assertTrue(accounts.findByEmail(email).isEmpty());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM customers WHERE email=?",Integer.class,email));
    }

}
