package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.gaugaugau.fooddelivery.auth.migration.AuthMigrationPreflight;

@EnabledIfEnvironmentVariable(named="RUN_STAGE2_AUTH_SCHEMA_TESTS",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthMigrationMySqlTest {
    JdbcTemplate jdbc;
    TransactionTemplate tx;
    final String hash=new BCryptPasswordEncoder(4).encode("migration-test-fixture");
    final List<String> tables=List.of("customers","restaurants","drivers","food_items","restaurant_food_items","carts","cart_items","orders","order_details","payment_methods","payments","deliveries","ratings","accounts","auth_sessions","refresh_tokens");
    void assertTarget() {
        assertEquals(3307,jdbc.queryForObject("SELECT @@port",Integer.class));
        assertEquals("fooddelivery_stage2_rehearsal",jdbc.queryForObject("SELECT DATABASE()",String.class));
        assertEquals("F:/New folder/food-delivery-mysql-test/data/",jdbc.queryForObject("SELECT @@datadir",String.class).replace('\\','/'));
    }
    @BeforeAll void installGuards() throws Exception {
        var source=new DriverManagerDataSource("jdbc:mysql://127.0.0.1:3307/fooddelivery_stage2_rehearsal?allowPublicKeyRetrieval=true&sslMode=DISABLED",
            "stage2_migrator",System.getenv("STAGE2_MIGRATION_PASSWORD"));
        jdbc=new JdbcTemplate(source);tx=new TransactionTemplate(new DataSourceTransactionManager(source));assertTarget();
        for(String file:List.of("01_expand_auth.sql","02_backfill_accounts.sql")) {
            String script=new ClassPathResource("db/manual/"+file).getContentAsString(StandardCharsets.UTF_8);
            String routine=script.substring(script.indexOf("CREATE PROCEDURE"),script.lastIndexOf("END$$")+3);
            jdbc.execute(routine);
        }
    }
    @AfterAll void removeGuards() {
        if(jdbc!=null) {
            assertTarget();
            jdbc.execute("DROP PROCEDURE IF EXISTS stage2_expand_auth_v1");
            jdbc.execute("DROP PROCEDURE IF EXISTS stage2_backfill_accounts_v1");
        }
    }
    Map<String,Object> snapshot() {
        var result=new LinkedHashMap<String,Object>();
        for(String table:tables) {
            result.put(table+".rows",jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class));
            result.put(table+".checksum",jdbc.queryForMap("CHECKSUM TABLE "+table+" EXTENDED").get("Checksum"));
        }
        return result;
    }
    void assertRejected(String command,String reason) {
        var failure=assertThrows(DataAccessException.class,()->jdbc.execute(command));
        assertTrue(failure.getMostSpecificCause().getMessage().contains(reason),failure.getMostSpecificCause().getMessage());
    }
    @Test void duplicateNormalizedEmailBlocksWithoutChangingData() {
        var before=snapshot();
        tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO restaurants(name,email,password,phone_number,address,created_at,restaurant_status) VALUES ('Negative fixture',' C1@Rehearsal.invalid ',?,'0900000000','Test',UTC_TIMESTAMP(6),1)",hash);
            assertRejected("CALL stage2_expand_auth_v1()","Duplicate normalized emails");status.setRollbackOnly();
        });
        assertEquals(before,snapshot());
    }
    @Test void invalidHashBlocksWithoutChangingData() {
        var before=snapshot();
        tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO customers(name,email,password,phone_number,address,created_at) VALUES ('Negative fixture',?,?,'0900000000','Test',UTC_TIMESTAMP(6))",UUID.randomUUID()+"@test.invalid","INVALID_BCRYPT_FIXTURE");
            assertRejected("CALL stage2_expand_auth_v1()","Invalid BCrypt hashes");status.setRollbackOnly();
        });
        assertEquals(before,snapshot());
    }
    @Test void secondExpandAndBackfillAreRejectedWithoutOverwritingAccounts() {
        var before=snapshot();
        assertRejected("CALL stage2_expand_auth_v1()","already exists or is partial");
        assertRejected("CALL stage2_backfill_accounts_v1()","Auth tables must be empty");
        assertEquals(before,snapshot());
    }
    @Test void schemaCountsAndBackfillAreComplete() {
        assertEquals(16,jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()",Integer.class));
        for(var expected:Map.of("FOREIGN KEY",21,"UNIQUE",13,"CHECK",6).entrySet())
            assertEquals(expected.getValue(),jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND constraint_type=?",Integer.class,expected.getKey()));
        assertEquals(6,jdbc.queryForObject("SELECT COUNT(*) FROM accounts WHERE customer_id IN (1001,1002) OR restaurant_id IN (2001,2002) OR driver_id IN (3001,3002)",Integer.class));
        assertEquals(0,new AuthMigrationPreflight(jdbc).inspectApprovedTestDatabase().invalidHashes());
    }
}
