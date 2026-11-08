package vn.gaugaugau.fooddelivery.auth.security;
import org.springframework.security.core.context.SecurityContextHolder;
public final class CurrentActor {
    private CurrentActor(){}
    public static Actor get(){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof Actor actor))throw new AuthFailure();
        return actor;
    }
}
