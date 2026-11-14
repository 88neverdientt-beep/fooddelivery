package vn.gaugaugau.fooddelivery.auth;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import vn.gaugaugau.fooddelivery.auth.migration.AuthMigrationPreflight;

@EnabledIfEnvironmentVariable(named="RUN_STAGE1_MYSQL_TESTS",matches="true")
class AuthPreflightMySqlTest {
    @Test void dirtyLegacyHashesBlockBeforeAnyAuthDdlOrBackfill() {
        var source=new DriverManagerDataSource("jdbc:mysql://127.0.0.1:3307/fooddelivery_stage1_test?sslMode=REQUIRED",
            "stage1_app",System.getenv("STAGE1_MYSQL_PASSWORD"));
        var jdbc=new JdbcTemplate(source);var audit=new AuthMigrationPreflight(jdbc);
        var report=audit.inspectApprovedTestDatabase();
        assertEquals(0,report.incompatibleProfileIds());
        assertEquals(88,report.invalidHashes());
        assertEquals(0,report.authTablesPresent());
        assertFalse(report.readyToExpand());
        assertThrows(IllegalStateException.class,()->audit.requireReady(report));
        var after=audit.inspectApprovedTestDatabase();assertEquals(report,after);
    }
}
