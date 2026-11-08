package vn.gaugaugau.fooddelivery.auth.security;
public class AuthFailure extends org.springframework.security.core.AuthenticationException {
    public AuthFailure(){super("Authentication failed");}
}
