package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;

/** Explicit test-database selection; never accepts the application/development database. */
public final class ApprovedMySqlTestTarget {
    private ApprovedMySqlTestTarget() {}
    public static String databaseName() {
        String name = System.getenv().getOrDefault("FOOD_TEST_DB_NAME", "fooddelivery_stage2_rehearsal");
        if (!Set.of("fooddelivery_stage2_rehearsal", "fooddelivery_stage4_e2e", "fooddelivery_stage5_e2e", "fooddelivery_stage6_e2e", "fooddelivery_stage7_e2e", "fooddelivery_stage8_e2e", "fooddelivery_full_audit", "fooddelivery_phase8_2").contains(name))
            throw new IllegalStateException("Unapproved MySQL test database");
        return name;
    }
    public static String url() {
        return "jdbc:mysql://127.0.0.1:3307/" + databaseName() + "?allowPublicKeyRetrieval=true&sslMode=DISABLED";
    }
    public static String migratorUsername() {
        return System.getenv().getOrDefault("FOOD_TEST_DB_MIGRATOR", "stage2_migrator");
    }
    public static void assertTarget(JdbcTemplate jdbc) {
        assertEquals(3307, jdbc.queryForObject("SELECT @@port", Integer.class));
        assertEquals(databaseName(), jdbc.queryForObject("SELECT DATABASE()", String.class));
        assertEquals("F:/New folder/food-delivery-mysql-test/data/",
            jdbc.queryForObject("SELECT @@datadir", String.class).replace('\\', '/'));
    }
}
