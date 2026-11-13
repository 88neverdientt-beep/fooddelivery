package vn.gaugaugau.fooddelivery.config;
import java.util.*;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.web.cors.*;
import vn.gaugaugau.fooddelivery.auth.config.JwtSettings;
import vn.gaugaugau.fooddelivery.auth.security.SessionJwtConverter;
import org.springframework.http.HttpMethod;
@Configuration @EnableMethodSecurity
@org.springframework.transaction.annotation.EnableTransactionManagement(order=100)
public class SecurityConfiguration {
    private static String path(jakarta.servlet.http.HttpServletRequest request){return request.getServletPath().isEmpty()?request.getRequestURI().substring(request.getContextPath().length()):request.getServletPath();}
    @Bean public PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(12);}
    public static void error(jakarta.servlet.http.HttpServletResponse response,int status) throws java.io.IOException {
        response.setStatus(status);response.setContentType("application/json");response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":\"error\",\"message\":\""+(status==401?"Authentication required":"Forbidden")+"\",\"errorCode\":\""+status+"\",\"data\":null}");
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http,SessionJwtConverter converter,JwtSettings settings) throws Exception {
        var csrf=CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrf.setCookieCustomizer(c->c.secure(true).sameSite("Strict").path("/"));
        http.csrf(c->c.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
            .requireCsrfProtectionMatcher(r->!Set.of("GET","HEAD","OPTIONS","TRACE").contains(r.getMethod()) && (path(r).startsWith("/auth/") || path(r).equals("/customers"))));
        var cors=new CorsConfiguration();cors.setAllowedOrigins(settings.allowedOrigins());cors.setAllowCredentials(true);
        cors.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));cors.setAllowedHeaders(List.of("Authorization","Content-Type","X-XSRF-TOKEN"));
        var source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",cors);http.cors(c->c.configurationSource(source));
        http.headers(h->h.contentSecurityPolicy(p->p.policyDirectives("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"))
            .referrerPolicy(r->r.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
            .addHeaderWriter(new org.springframework.security.web.header.writers.StaticHeadersWriter("Permissions-Policy","camera=(), microphone=(), geolocation=()")));
        http.formLogin(f->f.disable()).httpBasic(b->b.disable()).logout(l->l.disable()).requestCache(c->c.disable())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.exceptionHandling(e->e.authenticationEntryPoint((r,s,x)->error(s,401)).accessDeniedHandler((r,s,x)->error(s,403)));
        var resolver=new DefaultBearerTokenResolver();
        var publicAuth=Set.of("/auth/login","/auth/register/customer","/auth/refresh","/auth/logout","/auth/csrf");
        http.oauth2ResourceServer(o->o.bearerTokenResolver(r->(publicAuth.contains(path(r)) || (r.getMethod().equals("POST") && path(r).equals("/customers")))?null:resolver.resolve(r))
            .jwt(j->j.jwtAuthenticationConverter(converter)).authenticationEntryPoint((r,s,x)->error(s,401)).accessDeniedHandler((r,s,x)->error(s,403)));
        http.authorizeHttpRequests(a->a
            .requestMatchers(HttpMethod.GET,"/admin-management/reports/**").hasRole("ADMIN")
            .requestMatchers(HttpMethod.GET,"/admin-management/orders/export.xlsx").hasRole("ADMIN")
            .requestMatchers(HttpMethod.GET,"/restaurant-management/orders/export.xlsx").hasRole("RESTAURANT")
            .requestMatchers(HttpMethod.GET,"/admin-management/restaurants/export.xlsx").hasRole("ADMIN")
            .requestMatchers(HttpMethod.GET,"/admin-management/accounts","/admin-management/accounts/*","/admin-management/customers","/admin-management/restaurants","/admin-management/restaurants/*","/admin-management/drivers","/admin-management/orders","/admin-management/deliveries","/admin-management/deliveries/*","/admin-management/payments","/admin-management/reviews","/admin-management/analytics").hasRole("ADMIN")
            .requestMatchers(HttpMethod.GET,"/driver-management/deliveries","/driver-management/deliveries/*","/driver-management/available","/driver-management/analytics").hasRole("DRIVER")
            .requestMatchers(HttpMethod.GET,"/restaurant-management/menu/export.xlsx","/restaurant-management/menu/by-food/*").hasRole("RESTAURANT")
            .requestMatchers(HttpMethod.GET,"/restaurant-management/profile","/restaurant-management/catalog","/restaurant-management/orders","/restaurant-management/analytics").hasRole("RESTAURANT")
            .requestMatchers(HttpMethod.GET,"/","/auth/csrf","/food-items","/food-items/*","/food-categories","/restaurants","/restaurants/*","/restaurant-food-items","/restaurant-food-items/*","/restaurants/*/menu","/restaurants/*/ratings","/restaurants/*/ratings/average","/restaurants/*/ratings/page").permitAll()
            .requestMatchers(HttpMethod.POST,"/auth/login","/auth/register/customer","/auth/refresh","/auth/logout","/customers").permitAll()
            .requestMatchers("/auth/me","/auth/change-password","/auth/logout-all").authenticated()
            .requestMatchers("/admin/**").hasRole("ADMIN")
            .requestMatchers(HttpMethod.POST,"/restaurants","/drivers").hasRole("ADMIN")
            .requestMatchers(HttpMethod.GET,"/customers","/drivers").hasRole("ADMIN")
            .requestMatchers(HttpMethod.DELETE,"/customers/*","/restaurants/*","/drivers/*").hasRole("ADMIN")
            .requestMatchers(HttpMethod.GET,"/customers/*").hasAnyRole("CUSTOMER","ADMIN")
            .requestMatchers(HttpMethod.PUT,"/customers/*").hasAnyRole("CUSTOMER","ADMIN")
            .requestMatchers(HttpMethod.GET,"/drivers/*").hasAnyRole("DRIVER","ADMIN")
            .requestMatchers(HttpMethod.PUT,"/drivers/*").hasAnyRole("DRIVER","ADMIN")
            .requestMatchers(HttpMethod.PUT,"/restaurants/*").hasAnyRole("RESTAURANT","ADMIN")
            .requestMatchers(HttpMethod.POST,"/food-items").hasRole("ADMIN")
            .requestMatchers(HttpMethod.PUT,"/food-items/*").hasRole("ADMIN")
            .requestMatchers(HttpMethod.DELETE,"/food-items/*").hasRole("ADMIN")
            .requestMatchers(HttpMethod.POST,"/restaurant-food-items").hasAnyRole("RESTAURANT","ADMIN")
            .requestMatchers(HttpMethod.PUT,"/restaurant-food-items/*").hasAnyRole("RESTAURANT","ADMIN")
            .requestMatchers(HttpMethod.DELETE,"/restaurant-food-items/*").hasAnyRole("RESTAURANT","ADMIN")
            .requestMatchers("/cart/*","/*/cart-items","/cart-items/*").hasRole("CUSTOMER")
            .requestMatchers(HttpMethod.GET,"/payment-methods").hasRole("CUSTOMER")
            .requestMatchers(HttpMethod.POST,"/customers/*/orders").hasRole("CUSTOMER")
            .requestMatchers(HttpMethod.GET,"/customers/*/orders","/customers/*/orders/page").hasAnyRole("CUSTOMER","ADMIN")
            .requestMatchers(HttpMethod.GET,"/orders/*","/payments/orders/*").hasAnyRole("CUSTOMER","RESTAURANT","DRIVER","ADMIN")
            .requestMatchers(HttpMethod.PUT,"/orders/*/delivery-address").hasRole("CUSTOMER")
            .requestMatchers(HttpMethod.PATCH,"/orders/*/status").hasRole("RESTAURANT")
            .requestMatchers(HttpMethod.PATCH,"/orders/*/cancel").hasAnyRole("CUSTOMER","RESTAURANT")
            .requestMatchers("/deliveries/available","/deliveries/*/accept","/deliveries/*/status").hasRole("DRIVER")
            .requestMatchers(HttpMethod.POST,"/restaurants/*/ratings").hasRole("CUSTOMER")
            .requestMatchers(HttpMethod.PUT,"/ratings/*/customers/*").hasRole("CUSTOMER")
            .requestMatchers(HttpMethod.DELETE,"/ratings/*/customers/*").hasAnyRole("CUSTOMER","ADMIN")
            .anyRequest().denyAll());
        return http.build();
    }
    @Bean @org.springframework.core.annotation.Order(0)
    SecurityFilterChain managementSecurity(HttpSecurity http,SessionJwtConverter converter,
        @org.springframework.beans.factory.annotation.Value("${management.server.port:0}") int managementPort,
        @org.springframework.beans.factory.annotation.Value("${server.port:8080}") int applicationPort) throws Exception {
        http.securityMatcher(r->managementPort>0 && managementPort!=applicationPort && r.getLocalPort()==managementPort && path(r).startsWith("/actuator"))
            .csrf(c->c.disable()).formLogin(c->c.disable()).httpBasic(c->c.disable()).logout(c->c.disable()).requestCache(c->c.disable())
            .sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(HttpMethod.GET,"/actuator/health","/actuator/health/liveness","/actuator/health/readiness").permitAll()
                .requestMatchers(HttpMethod.GET,"/actuator/metrics","/actuator/metrics/**").hasRole("ADMIN").anyRequest().denyAll())
            .exceptionHandling(e->e.authenticationEntryPoint((r,s,x)->error(s,401)).accessDeniedHandler((r,s,x)->error(s,403)))
            .oauth2ResourceServer(o->o.jwt(j->j.jwtAuthenticationConverter(converter)).authenticationEntryPoint((r,s,x)->error(s,401)).accessDeniedHandler((r,s,x)->error(s,403)));
        return http.build();
    }

}
