package vn.gaugaugau.fooddelivery.auth;
import static org.junit.jupiter.api.Assertions.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.config.AuthProperties;
import vn.gaugaugau.fooddelivery.model.*;

class AuthModelTest {
    static final String HASH=new BCryptPasswordEncoder(4).encode("unit-test-password");
    Account account(Role role) {return Account.builder().email(" Test@Example.COM ").passwordHash(HASH).role(role).build();}
    @Test void normalizeEmailDeterministically() {
        assertEquals("test@example.com",EmailAddress.normalize(" Test@Example.COM "));
        for(String value:new String[]{"", "not-an-email", "a@", "a b@example.com", "\u212A@example.com", "\ttest@example.com", "a@example.com\nBcc:x@y.com"})
            assertThrows(IllegalArgumentException.class,()->EmailAddress.normalize(value));
        assertThrows(IllegalArgumentException.class,()->EmailAddress.normalize(null));
    }
    @Test void eachRoleHasExactlyItsProfile() {
        var c=account(Role.CUSTOMER);c.setCustomer(new Customer());c.validate();assertEquals("test@example.com",c.getEmail());
        var r=account(Role.RESTAURANT);r.setRestaurant(new Restaurant());r.validate();
        var d=account(Role.DRIVER);d.setDriver(new Driver());d.validate();
        account(Role.ADMIN).validate();
    }
    @Test void missingOrConflictingProfilesFail() {
        for(Role role:new Role[]{Role.CUSTOMER,Role.RESTAURANT,Role.DRIVER})
            assertThrows(IllegalArgumentException.class,()->account(role).validate());
        var mixed=account(Role.CUSTOMER);mixed.setCustomer(new Customer());mixed.setDriver(new Driver());
        assertThrows(IllegalArgumentException.class,mixed::validate);
        var admin=account(Role.ADMIN);admin.setCustomer(new Customer());assertThrows(IllegalArgumentException.class,admin::validate);
    }
    @Test void plaintextAndMalformedHashesAreRejectedWithoutLeakingValue() {
        for(String hash:new String[]{"test-hash", "plaintext-secret", "$2a$99$"+"A".repeat(53)}) {
            var a=account(Role.ADMIN);a.setPasswordHash(hash);
            var error=assertThrows(IllegalArgumentException.class,a::validate);
            assertFalse(error.getMessage().contains(hash));
        }
        assertTrue(new BCryptPasswordEncoder().matches("unit-test-password",HASH));
    }
    @Test void sessionExpiryAndRevocationAreExclusive() {
        var start=LocalDateTime.of(2026,1,1,0,0);
        var s=AuthSession.builder().account(account(Role.ADMIN)).createdAt(start).expiresAt(start.plusDays(7)).build();s.validate();
        assertTrue(s.isActiveAt(start));assertFalse(s.isActiveAt(start.minusNanos(1)));assertFalse(s.isActiveAt(s.getExpiresAt()));
        s.setRevokedAt(start);assertFalse(s.isActiveAt(start.plusMinutes(1)));
    }
    @Test void invalidSessionCannotPersist() {
        var s=AuthSession.builder().account(account(Role.ADMIN)).createdAt(LocalDateTime.now()).build();
        assertThrows(IllegalArgumentException.class,s::validate);
    }
    @Test void refreshRequiresHashAndCannotOutliveSession() {
        var start=LocalDateTime.of(2026,1,1,0,0);
        var session=AuthSession.builder().account(account(Role.ADMIN)).createdAt(start).expiresAt(start.plusDays(7)).build();session.validate();
        var t=RefreshToken.builder().session(session).tokenHash(new byte[32]).createdAt(start).expiresAt(session.getExpiresAt()).build();t.validate();
        t.setTokenHash(new byte[31]);assertThrows(IllegalArgumentException.class,t::validate);
        t.setTokenHash(new byte[32]);t.setExpiresAt(session.getExpiresAt().plusSeconds(1));assertThrows(IllegalArgumentException.class,t::validate);
    }
    @Test void configurableTtlsHaveSafeDefaultsAndBounds() {
        var defaults=new AuthProperties(false,null,null);assertFalse(defaults.persistenceEnabled());
        assertEquals(Duration.ofMinutes(10),defaults.accessTokenTtl());assertEquals(Duration.ofDays(7),defaults.refreshSessionTtl());
        assertThrows(IllegalArgumentException.class,()->new AuthProperties(false,Duration.ZERO,null));
        assertThrows(IllegalArgumentException.class,()->new AuthProperties(false,Duration.ofDays(8),null));
        assertThrows(IllegalArgumentException.class,()->new AuthProperties(false,null,Duration.ofDays(8)));
    }
}
