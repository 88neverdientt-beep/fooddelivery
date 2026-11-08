package vn.gaugaugau.fooddelivery.auth.security;
import vn.gaugaugau.fooddelivery.auth.model.*;
public record Actor(Long accountId,String sessionId,Role role,Long customerId,Long restaurantId,Long driverId) {
    public static Actor from(Account a,String sid) {
        if(a.getStatus()!=AccountStatus.ACTIVE || a.getRole()==null) throw new AuthFailure();
        Long c=a.getCustomer()==null?null:a.getCustomer().getCustomerId();
        Long r=a.getRestaurant()==null?null:a.getRestaurant().getRestaurantId();
        Long d=a.getDriver()==null?null:a.getDriver().getDriverId();
        boolean valid=switch(a.getRole()) {
            case CUSTOMER -> c!=null && r==null && d==null;
            case RESTAURANT -> r!=null && c==null && d==null;
            case DRIVER -> d!=null && c==null && r==null;
            case ADMIN -> c==null && r==null && d==null;
        };
        if(!valid) throw new AuthFailure();
        return new Actor(a.getAccountId(),sid,a.getRole(),c,r,d);
    }
}
