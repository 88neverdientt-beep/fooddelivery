package vn.gaugaugau.fooddelivery;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.gaugaugau.fooddelivery.auth.migration.AuthMigrationPreflight;

class FullAuditTargetGuardTest {
    final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    @Test void rejectsProductionPortBeforeInspectingAnyData() {
        when(jdbc.queryForObject("SELECT @@port", Integer.class)).thenReturn(3306);
        assertThrows(IllegalStateException.class,
            () -> new AuthMigrationPreflight(jdbc).inspectApprovedTestDatabase());
        verify(jdbc).queryForObject("SELECT @@port", Integer.class);
        verifyNoMoreInteractions(jdbc);
    }
    @Test void rejectsProductionDatabaseEvenOnTheTestPort() {
        when(jdbc.queryForObject("SELECT @@port", Integer.class)).thenReturn(3307);
        when(jdbc.queryForObject("SELECT DATABASE()", String.class)).thenReturn("fooddelivery");
        assertThrows(IllegalStateException.class,
            () -> new AuthMigrationPreflight(jdbc).inspectApprovedTestDatabase());
        verify(jdbc).queryForObject("SELECT @@port", Integer.class);
        verify(jdbc).queryForObject("SELECT DATABASE()", String.class);
        verifyNoMoreInteractions(jdbc);
    }
    @Test void rejectsAnUnexpectedDatadirBeforeInspectingAnyData() {
        when(jdbc.queryForObject("SELECT @@port", Integer.class)).thenReturn(3307);
        when(jdbc.queryForObject("SELECT DATABASE()", String.class)).thenReturn("fooddelivery_phase8_2");
        when(jdbc.queryForObject("SELECT @@datadir", String.class)).thenReturn("C:/wrong/data/");
        assertThrows(IllegalStateException.class,
            () -> new AuthMigrationPreflight(jdbc).inspectApprovedTestDatabase());
        verify(jdbc).queryForObject("SELECT @@port", Integer.class);
        verify(jdbc).queryForObject("SELECT DATABASE()", String.class);
        verify(jdbc).queryForObject("SELECT @@datadir", String.class);
        verifyNoMoreInteractions(jdbc);
    }
}
