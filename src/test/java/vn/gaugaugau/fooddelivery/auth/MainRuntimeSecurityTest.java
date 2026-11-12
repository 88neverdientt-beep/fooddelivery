package vn.gaugaugau.fooddelivery.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.nio.file.Path;
import java.security.*;
import java.time.*;
import java.util.*;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.*;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import vn.gaugaugau.fooddelivery.auth.config.*;
import vn.gaugaugau.fooddelivery.auth.controller.AuthController;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.auth.model.Role;
import vn.gaugaugau.fooddelivery.auth.repository.*;
import vn.gaugaugau.fooddelivery.auth.security.*;
import vn.gaugaugau.fooddelivery.auth.service.*;
import vn.gaugaugau.fooddelivery.config.SecurityConfiguration;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.repository.*;

/** Real MVC/filter/controller/service/RS256 assembly; repository state stays in RAM.
 * No DataSource, Boot startup, SQL, Main credentials or Main keys are loaded.
 * Not evidence for database transactions, locking or live HTTPS browser behavior.
 */
@ExtendWith(SpringExtension.class) @WebAppConfiguration
@ContextConfiguration(classes=MainRuntimeSecurityTest.Config.class)
class MainRuntimeSecurityTest {
    static final String ORIGIN="https://runtime-security.test";
    @Configuration @EnableWebMvc @EnableWebSecurity @EnableAspectJAutoProxy(proxyTargetClass=true)
    @Import({SecurityConfiguration.class,AuthController.class,vn.gaugaugau.fooddelivery.utils.GlobalExceptionHandler.class})
    static class Config {
        @Bean JwtSettings settings(){return new JwtSettings(ORIGIN,"test-runtime",Path.of("unused-private"),Path.of("unused-public"),List.of(ORIGIN));}
        @Bean KeyPair pair() throws Exception {var g=KeyPairGenerator.getInstance("RSA");g.initialize(2048);return g.generateKeyPair();}
        @Bean JwtEncoder jwtEncoder(KeyPair p){return new JwtConfiguration().jwtEncoder(p);}
        @Bean JwtDecoder jwtDecoder(KeyPair p,JwtSettings s){return new JwtConfiguration().jwtDecoder(p,s);}
        @Bean Clock clock(){return Clock.systemUTC();}
        @Bean AccountRepository accounts(){return mock(AccountRepository.class);}
        @Bean AuthSessionRepository sessions(){return mock(AuthSessionRepository.class);}
        @Bean RefreshTokenRepository refresh(){return mock(RefreshTokenRepository.class);}
        @Bean CustomerRepository customers(){return mock(CustomerRepository.class);}
        @Bean RestaurantRepository restaurants(){return mock(RestaurantRepository.class);}
        @Bean DriverRepository drivers(){return mock(DriverRepository.class);}
        @Bean jakarta.persistence.EntityManagerFactory entityManagerFactory(){return mock(jakarta.persistence.EntityManagerFactory.class);}
        @Bean org.springframework.transaction.PlatformTransactionManager transactions(){return new org.springframework.transaction.support.AbstractPlatformTransactionManager(){
            protected Object doGetTransaction(){return new Object();}
            protected void doBegin(Object t,org.springframework.transaction.TransactionDefinition d){}
            protected void doCommit(org.springframework.transaction.support.DefaultTransactionStatus s){}
            protected void doRollback(org.springframework.transaction.support.DefaultTransactionStatus s){}
        };}
        @Bean SessionJwtConverter converter(AuthSessionRepository s,Clock c){return new SessionJwtConverter(s,c);}
        // No-op transaction coordinator: SQL transaction semantics are not tested here.
        @Bean AuthService auth(AccountRepository a,AuthSessionRepository s,RefreshTokenRepository r,CustomerRepository c,RestaurantRepository t,DriverRepository d,PasswordEncoder p,JwtEncoder e,JwtSettings j,Clock k){return new AuthService(a,s,r,c,t,d,p,e,j,new AuthProperties(true,Duration.ofMinutes(10),Duration.ofDays(7)),k,new LoginLimiter());}
    }
    @Autowired WebApplicationContext context;
    @Autowired AccountRepository accounts;
    @Autowired AuthSessionRepository sessions;
    @Autowired RefreshTokenRepository refresh;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtEncoder encoder;
    @Autowired JwtDecoder decoder;
    @Autowired AuthService auth;
    MockMvc mvc; Account account; String password;
    Map<String,AuthSession> sessionRows; Map<String,RefreshToken> refreshRows;
    final tools.jackson.databind.ObjectMapper json=new tools.jackson.databind.ObjectMapper();
    @BeforeEach void setup(){
        reset(accounts,sessions,refresh);sessionRows=new HashMap<>();refreshRows=new HashMap<>();
        password=UUID.randomUUID().toString();
        account=Account.builder().accountId(71L).email(UUID.randomUUID()+"@example.test").passwordHash(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4).encode(password)).role(Role.CUSTOMER).customer(Customer.builder().customerId(91L).build()).build();
        when(accounts.findLockedByEmail(account.getEmail())).thenReturn(Optional.of(account));
        when(accounts.findLockedById(71L)).thenReturn(Optional.of(account));when(accounts.findById(71L)).thenReturn(Optional.of(account));
        when(sessions.saveAndFlush(any())).thenAnswer(i->{AuthSession s=i.getArgument(0);s.validate();sessionRows.put(s.getSessionId(),s);return s;});
        when(sessions.findWithAccount(anyString())).thenAnswer(i->Optional.ofNullable(sessionRows.get(i.getArgument(0))));
        when(sessions.findLockedById(anyString())).thenAnswer(i->Optional.ofNullable(sessionRows.get(i.getArgument(0))));
        when(sessions.findAccountId(anyString())).thenAnswer(i->Optional.ofNullable(sessionRows.get(i.getArgument(0))).map(s->s.getAccount().getAccountId()));
        when(sessions.findByAccount_AccountId(71L)).thenAnswer(i->new ArrayList<>(sessionRows.values()));
        when(refresh.saveAndFlush(any())).thenAnswer(i->{RefreshToken r=i.getArgument(0);r.validate();refreshRows.put(Base64.getEncoder().encodeToString(r.getTokenHash()),r);return r;});
        when(refresh.findSessionId(any())).thenAnswer(i->Optional.ofNullable(refreshRows.get(Base64.getEncoder().encodeToString(i.getArgument(0,byte[].class)))).map(r->r.getSession().getSessionId()));
        when(refresh.findLockedByTokenHash(any())).thenAnswer(i->Optional.ofNullable(refreshRows.get(Base64.getEncoder().encodeToString(i.getArgument(0,byte[].class)))));
        mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(context).addFilters(context.getBean("springSecurityFilterChain",Filter.class)).build();
    }
    @AfterEach void noProfilesOrAccountsWritten(){
        verify(accounts,never()).save(any());verify(accounts,never()).saveAndFlush(any());
        verifyNoInteractions(context.getBean(CustomerRepository.class),context.getBean(RestaurantRepository.class),context.getBean(DriverRepository.class));
        assertTrue(context.getBeansOfType(javax.sql.DataSource.class).isEmpty());
    }
    MvcResult send(String path,String body,String raw,String access) throws Exception {
        var csrf=mvc.perform(get("/auth/csrf").secure(true)).andReturn();
        String value=json.readTree(csrf.getResponse().getContentAsString()).get("token").asText();
        var request=post(path).secure(true).header("Origin",ORIGIN).header("X-XSRF-TOKEN",value).cookie(new Cookie("XSRF-TOKEN",value)).contentType(MediaType.APPLICATION_JSON).content(body);
        if(raw!=null)request.cookie(new Cookie("fd_refresh",raw));if(access!=null)request.header("Authorization","Bearer "+access);
        return mvc.perform(request).andReturn();
    }
    record LoginResult(String access,String raw,MvcResult response){}
    LoginResult login() throws Exception {
        var result=send("/auth/login",json.writeValueAsString(Map.of("email",account.getEmail(),"password",password)),null,null);
        assertEquals(200,result.getResponse().getStatus());
        return new LoginResult(json.readTree(result.getResponse().getContentAsString()).get("data").get("accessToken").asText(),result.getResponse().getCookie("fd_refresh").getValue(),result);
    }
    int me(String access) throws Exception {return mvc.perform(get("/auth/me").secure(true).header("Authorization","Bearer "+access)).andReturn().getResponse().getStatus();}
    @Test void csrfCookieAndMissingCsrfRejected() throws Exception {
        var r=mvc.perform(get("/auth/csrf").secure(true)).andReturn();var c=r.getResponse().getCookie("XSRF-TOKEN");
        assertTrue(c.getSecure());assertFalse(c.isHttpOnly());assertEquals("/",c.getPath());assertEquals("Strict",c.getAttribute("SameSite"));
        assertEquals(403,mvc.perform(post("/auth/login").secure(true).contentType(MediaType.APPLICATION_JSON).content("{}")).andReturn().getResponse().getStatus());assertTrue(sessionRows.isEmpty());
    }
    @Test void refreshCookieFlagsAndNoServletSession() throws Exception {
        var l=login();var c=l.response.getResponse().getCookie("fd_refresh");assertTrue(c.getSecure());assertTrue(c.isHttpOnly());assertEquals("Strict",c.getAttribute("SameSite"));assertEquals("/auth",c.getPath());assertTrue(c.getMaxAge()<=604800 && c.getMaxAge()>604790);assertNull(l.response.getRequest().getSession(false));assertEquals(200,me(l.access));
    }
    @Test void corsAllowsOnlyExactOrigin() throws Exception {
        var allowed=mvc.perform(options("/auth/login").header("Origin",ORIGIN).header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","Content-Type,X-XSRF-TOKEN")).andReturn().getResponse();
        assertEquals(200,allowed.getStatus());assertEquals(ORIGIN,allowed.getHeader("Access-Control-Allow-Origin"));assertEquals("true",allowed.getHeader("Access-Control-Allow-Credentials"));
        assertEquals(403,mvc.perform(get("/auth/csrf").header("Origin","https://untrusted.test")).andReturn().getResponse().getStatus());
    }
    @Test void issuedJwtUsesRs256AndConfiguredLifetimes() throws Exception {var l=login();var jwt=decoder.decode(l.access);assertEquals("RS256",jwt.getHeaders().get("alg"));assertEquals("at+jwt",jwt.getHeaders().get("typ"));assertEquals(600,Duration.between(jwt.getIssuedAt(),jwt.getExpiresAt()).toSeconds());var s=sessionRows.values().iterator().next();assertEquals(Duration.ofDays(7),Duration.between(s.getCreatedAt(),s.getExpiresAt()));assertEquals(32,refreshRows.values().iterator().next().getTokenHash().length);}
    @Test void rotationReplacesRefreshAndMarksOldUsed() throws Exception {var l=login();var r=send("/auth/refresh","{}",l.raw,null);assertEquals(200,r.getResponse().getStatus());assertTrue(!l.raw.equals(r.getResponse().getCookie("fd_refresh").getValue()));assertEquals(2,refreshRows.size());assertEquals(1,refreshRows.values().stream().filter(v->v.getUsedAt()!=null).count());}
    @Test void replayRevokesSessionAndExistingAccess() throws Exception {var l=login();auth.rotate(l.raw);assertThrows(AuthFailure.class,()->auth.rotate(l.raw));assertNotNull(sessionRows.values().iterator().next().getRevokedAt());assertEquals(401,me(l.access));}
    @Test void logoutRevokesAndClearsCookie() throws Exception {var l=login();var r=send("/auth/logout","{}",l.raw,null);assertEquals(204,r.getResponse().getStatus());assertEquals(0,r.getResponse().getCookie("fd_refresh").getMaxAge());assertEquals(401,me(l.access));assertThrows(AuthFailure.class,()->auth.rotate(l.raw));}
    @Test void logoutAllRevokesBothSessions() throws Exception {var a=login();var b=login();assertEquals(204,send("/auth/logout-all","{}",null,a.access).getResponse().getStatus());assertEquals(401,me(a.access));assertEquals(401,me(b.access));}
    @Test void disabledAccountRejected() throws Exception {var l=login();account.setStatus(AccountStatus.DISABLED);assertEquals(401,me(l.access));assertThrows(AuthFailure.class,()->auth.rotate(l.raw));}
    @Test void expiredSessionRejected() throws Exception {var l=login();sessionRows.values().iterator().next().setExpiresAt(LocalDateTime.now(Clock.systemUTC()).minusSeconds(1));assertEquals(401,me(l.access));}
    String signed(String issuer,String audience,String typ,Instant issued,Instant expires,String subject,JwtEncoder signing,String sid){return signing.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).type(typ).build(),JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience)).subject(subject).id(UUID.randomUUID().toString()).issuedAt(issued).notBefore(issued).expiresAt(expires).claim("sid",sid).claim("role","ADMIN").build())).getTokenValue();}
    @Test void wrongSignatureIssuerAudienceTypeExpiredSubjectRejected() throws Exception {
        var now=Instant.now();var sid=UUID.randomUUID().toString();var g=KeyPairGenerator.getInstance("RSA");g.initialize(2048);var foreign=new JwtConfiguration().jwtEncoder(g.generateKeyPair());
        for(String token:List.of(signed("https://wrong.test","test-runtime","at+jwt",now,now.plusSeconds(600),"71",encoder,sid),signed(ORIGIN,"wrong","at+jwt",now,now.plusSeconds(600),"71",encoder,sid),signed(ORIGIN,"test-runtime","JWT",now,now.plusSeconds(600),"71",encoder,sid),signed(ORIGIN,"test-runtime","at+jwt",now.minusSeconds(1000),now.minusSeconds(200),"71",encoder,sid),signed(ORIGIN,"test-runtime","at+jwt",now,now.plusSeconds(600),"0",encoder,sid),signed(ORIGIN,"test-runtime","at+jwt",now,now.plusSeconds(600),"71",foreign,sid)))assertThrows(JwtException.class,()->decoder.decode(token));
    }
    @Test void signedRoleClaimCannotElevateCustomer() throws Exception {var l=login();var now=Instant.now();var token=signed(ORIGIN,"test-runtime","at+jwt",now,now.plusSeconds(500),"71",encoder,sessionRows.keySet().iterator().next());assertEquals(200,me(token));assertEquals(403,mvc.perform(get("/admin-management/accounts").header("Authorization","Bearer "+token)).andReturn().getResponse().getStatus());}
}
