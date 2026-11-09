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
        http.formLogin(f->f.disable()).httpBasic(b->b.disable()).logout(l->l.disable()).requestCache(c->c.disable())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.exceptionHandling(e->e.authenticationEntryPoint((r,s,x)->error(s,401)).accessDeniedHandler((r,s,x)->error(s,403)));
        var resolver=new DefaultBearerTokenResolver();
        var publicAuth=Set.of("/auth/login","/auth/register/customer","/auth/refresh","/auth/logout","/auth/csrf");
        http.oauth2ResourceServer(o->o.bearerTokenResolver(r->(publicAuth.contains(path(r)) || (r.getMethod().equals("POST") && path(r).equals("/customers")))?null:resolver.resolve(r))
            .jwt(j->j.jwtAuthenticationConverter(converter)).authenticationEntryPoint((r,s,x)->error(s,401)).accessDeniedHandler((r,s,x)->error(s,403)));
        http.authorizeHttpRequests(a->a
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
}
