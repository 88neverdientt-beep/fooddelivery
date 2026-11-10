package vn.gaugaugau.fooddelivery.auth.service;
import java.time.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.transaction.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.*;
import vn.gaugaugau.fooddelivery.auth.config.*;
import vn.gaugaugau.fooddelivery.auth.dto.AuthDtos.*;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.repository.*;
import vn.gaugaugau.fooddelivery.auth.security.*;
import vn.gaugaugau.fooddelivery.model.*;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.repository.*;
import vn.gaugaugau.fooddelivery.utils.exception.*;
@Service @RequiredArgsConstructor
@Transactional(isolation=Isolation.READ_COMMITTED)
public class AuthService {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final AccountRepository accounts;
    private final AuthSessionRepository sessions;
    private final RefreshTokenRepository refresh;
    private final CustomerRepository customers;
    private final RestaurantRepository restaurants;
    private final DriverRepository drivers;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final JwtSettings jwtSettings;
    private final AuthProperties properties;
    private final Clock clock;
    private final LoginLimiter limiter;
    private final String dummyHash=new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(12).encode(UUID.randomUUID().toString());
    private static final org.slf4j.Logger audit=org.slf4j.LoggerFactory.getLogger(AuthService.class);

    public static void validatePassword(String password) {
        if(password==null || password.codePointCount(0,password.length())<12 || password.getBytes(StandardCharsets.UTF_8).length>72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Password must have at least 12 characters and at most 72 UTF-8 bytes");
    }
    private String newEmail(String raw,String password){validatePassword(password);String email;
        try{email=EmailAddress.normalize(raw);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid email");}
        if(accounts.findByEmail(email).isPresent())throw new ResourceAlreadyExistsException("Email is unavailable");return email;
    }
    public Me registerCustomer(CustomerRequestDTO r) {
        String email=newEmail(r.getEmail(),r.getPassword());String hash=encoder.encode(r.getPassword());
        var profile=customers.save(Customer.builder().name(r.getName()).email(email).password(hash).phoneNumber(r.getPhoneNumber()).address(r.getAddress()).build());
        return view(accounts.saveAndFlush(Account.builder().email(email).passwordHash(hash).role(Role.CUSTOMER).customer(profile).build()));
    }
    @PreAuthorize("hasRole('ADMIN')")
    public Me createRestaurant(RestaurantRequestDTO r) {
        String email=newEmail(r.getEmail(),r.getPassword());String hash=encoder.encode(r.getPassword());
        var profile=restaurants.save(Restaurant.builder().name(r.getName()).email(email).password(hash).phoneNumber(r.getPhoneNumber()).address(r.getAddress()).restaurantStatus(r.getRestaurantStatus()==null?true:r.getRestaurantStatus()).build());
        var account=accounts.saveAndFlush(Account.builder().email(email).passwordHash(hash).role(Role.RESTAURANT).restaurant(profile).build());
        audit.info("Account {} created with role RESTAURANT by account {}",account.getAccountId(),CurrentActor.get().accountId());return view(account);
    }
    @PreAuthorize("hasRole('ADMIN')")
    public Me createDriver(DriverRequestDTO r) {
        String email=newEmail(r.getEmail(),r.getPassword());String hash=encoder.encode(r.getPassword());
        var profile=drivers.save(Driver.builder().name(r.getName()).email(email).password(hash).phoneNumber(r.getPhoneNumber()).address(r.getAddress()).licensePlate(r.getLicensePlate()).driveStatus(r.getDriveStatus()==null?true:r.getDriveStatus()).build());
        var account=accounts.saveAndFlush(Account.builder().email(email).passwordHash(hash).role(Role.DRIVER).driver(profile).build());
        audit.info("Account {} created with role DRIVER by account {}",account.getAccountId(),CurrentActor.get().accountId());return view(account);
    }
    public Issued login(Login request,String ip) {
        String email;
        try{email=EmailAddress.normalize(request.email());}catch(IllegalArgumentException e){email="invalid";}
        limiter.check(ip,email);
        String password=request.password();
        if(password==null || password.getBytes(StandardCharsets.UTF_8).length>72)throw new AuthFailure();
        var a=accounts.findLockedByEmail(email).orElse(null);
        boolean matches=encoder.matches(password,a==null?dummyHash:a.getPasswordHash());
        if(!matches || a==null || a.getStatus()!=AccountStatus.ACTIVE)throw new AuthFailure();
        Actor.from(a,null);
        var now=LocalDateTime.now(clock);
        var session=sessions.saveAndFlush(AuthSession.builder().account(a).createdAt(now).expiresAt(now.plus(properties.refreshSessionTtl())).build());
        return issue(a,session);
    }
    // AuthFailure must commit replay revocation. Other failures still roll back rotation.
    @Transactional(isolation=Isolation.READ_COMMITTED,noRollbackFor=AuthFailure.class)
    public Issued rotate(String raw) {
        var hash=hash(raw);
        String sid=refresh.findSessionId(hash).orElseThrow(AuthFailure::new);
        Long aid=sessions.findAccountId(sid).orElseThrow(AuthFailure::new);
        var a=accounts.findLockedById(aid).orElseThrow(AuthFailure::new);
        var session=sessions.findLockedById(sid).orElseThrow(AuthFailure::new);
        var old=refresh.findLockedByTokenHash(hash).orElseThrow(AuthFailure::new);
        var now=LocalDateTime.now(clock);
        if(old.getUsedAt()!=null) {session.setRevokedAt(now);throw new AuthFailure();}
        if(a.getStatus()!=AccountStatus.ACTIVE || !session.isActiveAt(now) || !old.getExpiresAt().isAfter(now))throw new AuthFailure();
        Actor.from(a,sid);old.setUsedAt(now);return issue(a,session);
    }
    private Issued issue(Account a,AuthSession session) {
        byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);
        String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var now=LocalDateTime.now(clock);
        refresh.saveAndFlush(RefreshToken.builder().session(session).tokenHash(hash(raw)).createdAt(now).expiresAt(session.getExpiresAt()).build());
        Instant issued=clock.instant();Instant expires=issued.plus(properties.accessTokenTtl());
        if(expires.isAfter(session.getExpiresAt().toInstant(ZoneOffset.UTC)))expires=session.getExpiresAt().toInstant(ZoneOffset.UTC);
        var claims=JwtClaimsSet.builder().issuer(jwtSettings.issuer()).audience(List.of(jwtSettings.audience())).subject(a.getAccountId().toString())
            .id(UUID.randomUUID().toString()).issuedAt(issued).notBefore(issued).expiresAt(expires).claim("sid",session.getSessionId()).build();
        var headers=JwsHeader.with(SignatureAlgorithm.RS256).type("at+jwt").keyId("fooddelivery-rs256").build();
        String token=jwtEncoder.encode(JwtEncoderParameters.from(headers,claims)).getTokenValue();
        return new Issued(new Tokens(token,"Bearer",Duration.between(issued,expires).toSeconds(),view(a)),raw,Math.max(0,Duration.between(LocalDateTime.now(clock),session.getExpiresAt()).toSeconds()));
    }
    public static byte[] hash(String raw){
        if(raw==null || raw.length()<40 || raw.length()>128)throw new AuthFailure();
        try{return MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.US_ASCII));}catch(NoSuchAlgorithmException e){throw new IllegalStateException();}
    }
    public void logout(String raw) {
        if(raw==null)return;
        byte[] digest;try{digest=hash(raw);}catch(AuthFailure e){return;}
        var sid=refresh.findSessionId(digest);if(sid.isEmpty())return;
        var id=sessions.findAccountId(sid.get());if(id.isEmpty())return;
        accounts.findLockedById(id.get()).orElseThrow(AuthFailure::new);
        sessions.findLockedById(sid.get()).ifPresent(s->{if(s.getRevokedAt()==null)s.setRevokedAt(LocalDateTime.now(clock));});
    }
    @PreAuthorize("isAuthenticated()")
    public void logoutAll(){var a=accounts.findLockedById(CurrentActor.get().accountId()).orElseThrow(AuthFailure::new);revoke(a.getAccountId());}
    @PreAuthorize("isAuthenticated()")
    public void changePassword(ChangePassword r) {
        var a=accounts.findLockedById(CurrentActor.get().accountId()).orElseThrow(AuthFailure::new);
        if(r.currentPassword().getBytes(StandardCharsets.UTF_8).length>72 || !encoder.matches(r.currentPassword(),a.getPasswordHash()))throw new AuthFailure();
        validatePassword(r.newPassword());a.setPasswordHash(encoder.encode(r.newPassword()));a.setPasswordChangedAt(LocalDateTime.now(clock));revoke(a.getAccountId());
    }
    private void revoke(Long id){for(var s:sessions.findByAccount_AccountId(id))if(s.getRevokedAt()==null)s.setRevokedAt(LocalDateTime.now(clock));}
    @PreAuthorize("isAuthenticated()") @Transactional(readOnly=true)
    public Me me(){return view(accounts.findById(CurrentActor.get().accountId()).orElseThrow(AuthFailure::new));}
    @PreAuthorize("hasRole('ADMIN')") @Transactional(readOnly=true)
    public List<Me> listAccounts(){return accounts.findAll().stream().map(this::view).toList();}
    @PreAuthorize("hasRole('ADMIN')")
    public Me setStatus(Long id,AccountStatus status) {
        return setStatus(id,status,null);
    }
    @PreAuthorize("hasRole('ADMIN')")
    public Me setStatus(Long id,AccountStatus status,AccountStatus expectedStatus) {
        if(id==null || id<=0 || status==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Valid account and status required");
        // Serialize administrator status writers before taking any target-account lock.
        // Refresh managed entries as disableProfile may have loaded an account earlier.
        var administrators=accounts.findAdministratorsLocked();
        administrators.forEach(a->entityManager.refresh(a,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE));
        var actor=CurrentActor.get();
        var acting=administrators.stream().filter(a->a.getAccountId().equals(actor.accountId())).findFirst().orElseThrow(AuthFailure::new);
        if(acting.getStatus()!=AccountStatus.ACTIVE)throw new AuthFailure();
        var a=accounts.findLockedById(id).orElseThrow(()->new ResourceNotFoundException("Account not found"));
        entityManager.refresh(a,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        // Keep Account -> Session order used by refresh/logout; validate after waiting.
        var session=sessions.findLockedById(actor.sessionId()).orElseThrow(AuthFailure::new);
        entityManager.refresh(session,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(!session.getAccount().getAccountId().equals(acting.getAccountId()) || !session.isActiveAt(LocalDateTime.now(clock)))throw new AuthFailure();
        if(a.getAccountId().equals(acting.getAccountId()) && status==AccountStatus.DISABLED)throw new ResponseStatusException(HttpStatus.CONFLICT,"Cannot disable the current administrator");
        if(expectedStatus!=null && a.getStatus()!=expectedStatus)throw new ResponseStatusException(HttpStatus.CONFLICT,"Account status changed; reload before retrying");
        if(a.getRole()==Role.ADMIN && a.getStatus()==AccountStatus.ACTIVE && status==AccountStatus.DISABLED
            && administrators.stream().filter(admin->admin.getStatus()==AccountStatus.ACTIVE).count()<=1)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Cannot disable the last active administrator");
        a.setStatus(status);if(status==AccountStatus.DISABLED)revoke(id);
        audit.info("Account {} status set to {} by account {}",id,status,CurrentActor.get().accountId());return view(a);
    }
    @PreAuthorize("hasRole('ADMIN')")
    public void disableProfile(Role role,Long profile){var a=accounts.findProfileAccount(role,profile).orElseThrow(()->new ResourceNotFoundException("Account not found"));setStatus(a.getAccountId(),AccountStatus.DISABLED);}
    private Me view(Account a){var actor=Actor.from(a.getStatus()==AccountStatus.ACTIVE?a:copyActive(a),null);
        return new Me(a.getAccountId(),a.getEmail(),a.getRole(),a.getStatus(),actor.customerId(),actor.restaurantId(),actor.driverId());}
    private Account copyActive(Account a){return Account.builder().accountId(a.getAccountId()).role(a.getRole()).status(AccountStatus.ACTIVE).customer(a.getCustomer()).restaurant(a.getRestaurant()).driver(a.getDriver()).build();}
}
