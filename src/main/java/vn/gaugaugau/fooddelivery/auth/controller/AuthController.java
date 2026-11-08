package vn.gaugaugau.fooddelivery.auth.controller;
import java.util.Map;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import vn.gaugaugau.fooddelivery.auth.dto.AuthDtos.*;
import vn.gaugaugau.fooddelivery.auth.service.AuthService;
import vn.gaugaugau.fooddelivery.model.dto.CustomerRequestDTO;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;
@RestController @RequestMapping("/auth") @RequiredArgsConstructor
public class AuthController {
    public static final String COOKIE="fd_refresh";
    private final AuthService auth;
    @GetMapping("/csrf") public Object csrf(CsrfToken token){return Map.of("headerName",token.getHeaderName(),"token",token.getToken());}
    @PostMapping("/register/customer") public ResponseEntity<?> register(@Valid @RequestBody CustomerRequestDTO request){return ApiResponse.created(auth.registerCustomer(request));}
    @PostMapping("/login") public ResponseEntity<?> login(@Valid @RequestBody Login request,HttpServletRequest http,HttpServletResponse response){
        // Forwarded headers are disabled; only the direct peer is trusted. A trusted gateway must enforce shared limits.
        var issued=auth.login(request,http.getRemoteAddr());setCookie(response,issued.refreshToken(),issued.refreshExpiresIn());return ApiResponse.success(issued.response());
    }
    @PostMapping("/refresh") public ResponseEntity<?> refresh(@CookieValue(name=COOKIE,required=false) String raw,HttpServletResponse response){var issued=auth.rotate(raw);setCookie(response,issued.refreshToken(),issued.refreshExpiresIn());return ApiResponse.success(issued.response());}
    @PostMapping("/logout") public ResponseEntity<?> logout(@CookieValue(name=COOKIE,required=false) String raw,HttpServletResponse response){auth.logout(raw);setCookie(response,"",0);return ResponseEntity.noContent().build();}
    @PostMapping("/logout-all") public ResponseEntity<?> logoutAll(HttpServletResponse response){auth.logoutAll();setCookie(response,"",0);return ResponseEntity.noContent().build();}
    @PostMapping("/change-password") public ResponseEntity<?> change(@Valid @RequestBody ChangePassword request,HttpServletResponse response){auth.changePassword(request);setCookie(response,"",0);return ResponseEntity.noContent().build();}
    @GetMapping("/me") public ResponseEntity<?> me(){return ApiResponse.success(auth.me());}
    private void setCookie(HttpServletResponse response,String value,long maxAge){response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from(COOKIE,value).httpOnly(true).secure(true).sameSite("Strict").path("/auth").maxAge(maxAge).build().toString());}
}
