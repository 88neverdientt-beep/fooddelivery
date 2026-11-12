package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** Resource-only regression: no Spring context, connection, routine or SQL execution. */
class DatabaseMigrationResourceTest {
    @Test void relocatedMigrationResourcesRetainExactBytes() throws Exception {
        var expected = Map.of(
            "00_preflight_readonly.sql", "1a06a9029b6053f530dbd658ad545f137a06ee3c15957f19ad359dcbe9bba580",
            "01_expand_auth.sql", "0ac7ddd802fff02eff543c2a3edfc78785e98732c224459c6235f8a6e74a79a4",
            "02_backfill_accounts.sql", "1996cedacc10b25858e6964e037b3f210091d992a4c8fc25da2e2303707914b9",
            "03_stage8_versions.sql", "b6dc2c321a37d37a5a35ef8917cbb7f38fe1653e5662ad556ec5fdd89de0b7b8");
        for (var entry : expected.entrySet()) {
            try (var input = new ClassPathResource("database/migrations/" + entry.getKey()).getInputStream()) {
                var hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.readAllBytes()));
                assertEquals(entry.getValue(), hash, entry.getKey());
            }
        }
    }
}
