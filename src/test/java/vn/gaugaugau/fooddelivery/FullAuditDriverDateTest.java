package vn.gaugaugau.fooddelivery;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.model.Role;
import vn.gaugaugau.fooddelivery.auth.security.*;
import vn.gaugaugau.fooddelivery.service.DriverManagementService;

class FullAuditDriverDateTest {
    final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    final DriverManagementService service = new DriverManagementService(jdbc, null, null);

    @BeforeEach void actor() {
        SecurityContextHolder.getContext().setAuthentication(new ActorAuthentication(
            new Actor(1L, UUID.randomUUID().toString(), Role.DRIVER, null, null, 1L)));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void defaultWindowMustNotCrossTheFirstSupportedYear() {
        assertEquals(400, assertThrows(ResponseStatusException.class,
            () -> service.analytics(null, "0001-01-01")).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void rejectsUnsupportedIsoYearsBeforeQuerying() {
        for (String end : List.of("+999999999-12-31", "9999-12-31", "0000-01-01")) {
            assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.analytics(null, end)).getStatusCode().value());
        }
        verifyNoInteractions(jdbc);
    }
    @Test void rejectsReversedAndOverlongRangesBeforeQuerying() {
        for (String end : List.of("2025-12-31", "2026-04-04")) {
            assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.analytics("2026-01-01", end)).getStatusCode().value());
        }
        verifyNoInteractions(jdbc);
    }
}
