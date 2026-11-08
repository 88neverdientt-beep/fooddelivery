package vn.gaugaugau.fooddelivery.auth.security;
import java.time.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import vn.gaugaugau.fooddelivery.auth.repository.AuthSessionRepository;
@Component @RequiredArgsConstructor
public class SessionJwtConverter implements Converter<Jwt,AbstractAuthenticationToken> {
    private final AuthSessionRepository sessions;
    private final Clock clock;
    @Transactional(readOnly=true)
    public AbstractAuthenticationToken convert(Jwt jwt) {
        var s=sessions.findWithAccount(jwt.getClaimAsString("sid")).orElseThrow(AuthFailure::new);
        if(!s.isActiveAt(LocalDateTime.now(clock)) || !s.getAccount().getAccountId().toString().equals(jwt.getSubject())
            || jwt.getExpiresAt().isAfter(s.getExpiresAt().toInstant(ZoneOffset.UTC))) throw new AuthFailure();
        return new ActorAuthentication(Actor.from(s.getAccount(),s.getSessionId()));
    }
}
