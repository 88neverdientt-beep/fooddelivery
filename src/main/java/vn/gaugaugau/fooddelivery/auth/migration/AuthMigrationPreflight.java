package vn.gaugaugau.fooddelivery.auth.migration;

import org.springframework.jdbc.core.JdbcTemplate;

/** Read-only audit. Never creates tables, modifies credentials or runs automatically. */
public final class AuthMigrationPreflight {
    private static final String PROFILES = "SELECT email,password FROM customers UNION ALL SELECT email,password FROM restaurants UNION ALL SELECT email,password FROM drivers";
    private static final String BCRYPT = "^\\$2[aby]\\$(0[4-9]|[12][0-9]|3[01])\\$[./A-Za-z0-9]{53}$";
    private static final String EMAIL = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
    private final JdbcTemplate jdbc;
    public AuthMigrationPreflight(JdbcTemplate jdbc) {this.jdbc=jdbc;}
    public record Report(long profiles,long duplicateEmailGroups,long invalidEmails,long invalidHashes,
                         long incompatibleProfileIds,long authTablesPresent) {
        public boolean readyToExpand() {
            return duplicateEmailGroups==0 && invalidEmails==0 && invalidHashes==0
                && incompatibleProfileIds==0 && authTablesPresent==0;
        }
    }
    public Report inspectApprovedTestDatabase() {
        if(!Integer.valueOf(3307).equals(jdbc.queryForObject("SELECT @@port",Integer.class))
            || !java.util.Set.of("fooddelivery_stage1_test", "fooddelivery_stage2_rehearsal", "fooddelivery_stage4_e2e", "fooddelivery_stage5_e2e", "fooddelivery_stage6_e2e", "fooddelivery_stage7_e2e", "fooddelivery_stage8_e2e", "fooddelivery_full_audit", "fooddelivery_phase8_2").contains(jdbc.queryForObject("SELECT DATABASE()",String.class)))
            throw new IllegalStateException("Not the approved isolated test database");
        String dir=jdbc.queryForObject("SELECT @@datadir",String.class);
        if(dir==null || !dir.replace('\\','/').equalsIgnoreCase("F:/New folder/food-delivery-mysql-test/data/"))
            throw new IllegalStateException("Unexpected MySQL test datadir");
        long profiles=number("SELECT COUNT(*) FROM ("+PROFILES+") p");
        long duplicates=number("SELECT COUNT(*) FROM (SELECT LOWER(TRIM(email)) e FROM ("+PROFILES+") p GROUP BY e HAVING COUNT(*)>1) d");
        long emails=jdbc.queryForObject("SELECT COUNT(*) FROM ("+PROFILES+") p WHERE email IS NULL OR CHAR_LENGTH(TRIM(email))>255 OR NOT REGEXP_LIKE(TRIM(email),?,'c')",Long.class,EMAIL);
        long hashes=jdbc.queryForObject("SELECT COUNT(*) FROM ("+PROFILES+") p WHERE password IS NULL OR NOT REGEXP_LIKE(password,?,'c')",Long.class,BCRYPT);
        long ids=number("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND ((table_name='customers' AND column_name='customer_id') OR (table_name='restaurants' AND column_name='restaurant_id') OR (table_name='drivers' AND column_name='driver_id')) AND column_type='bigint' AND is_nullable='NO' AND column_key='PRI'");
        long tables=number("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('accounts','auth_sessions','refresh_tokens')");
        return new Report(profiles,duplicates,emails,hashes,3-ids,tables);
    }
    public void requireReady(Report report) {
        if(!report.readyToExpand()) throw new IllegalStateException("Migration blocked: resolve preflight findings before DDL/backfill");
    }
    private long number(String query) {return jdbc.queryForObject(query,Long.class);}
}
