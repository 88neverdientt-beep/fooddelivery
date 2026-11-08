package vn.gaugaugau.fooddelivery.auth.security;
import java.time.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import vn.gaugaugau.fooddelivery.auth.model.Role;
import vn.gaugaugau.fooddelivery.auth.repository.AuthSessionRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;
@Component("access") @RequiredArgsConstructor @Transactional(readOnly=true)
public class AccessRules {
    private final JdbcTemplate jdbc;
    private final AuthSessionRepository sessions;
    private final Clock clock;
    private Actor actor(){var a=CurrentActor.get();var s=sessions.findWithAccount(a.sessionId()).orElseThrow(AuthFailure::new);
        if(!s.isActiveAt(LocalDateTime.now(clock)) || !s.getAccount().getAccountId().equals(a.accountId()))throw new AuthFailure();
        return Actor.from(s.getAccount(),s.getSessionId());}
    private void role(Actor a,Role...allowed){for(var r:allowed)if(a.role()==r)return;throw new AccessDeniedException("Forbidden");}
    private boolean exists(String sql,Object...args){if(jdbc.queryForObject(sql,Long.class,args)==0)throw new ResourceNotFoundException("Resource not found");return true;}
    public boolean profile(String type,Long id,boolean admin){var a=actor();Role r=Role.valueOf(type);if(admin && a.role()==Role.ADMIN)return true;role(a,r);
        Long own=switch(r){case CUSTOMER->a.customerId();case RESTAURANT->a.restaurantId();case DRIVER->a.driverId();default->null;};
        if(!java.util.Objects.equals(id,own))throw new ResourceNotFoundException("Resource not found");return true;}
    public boolean cartItem(Long id){var a=actor();role(a,Role.CUSTOMER);return exists("SELECT COUNT(*) FROM cart_items i JOIN carts c ON c.cart_id=i.cart_id WHERE i.cart_item_id=? AND c.customer_id=?",id,a.customerId());}
    public boolean menu(Long id){var a=actor();role(a,Role.RESTAURANT,Role.ADMIN);if(a.role()==Role.ADMIN)return true;return exists("SELECT COUNT(*) FROM restaurant_food_items WHERE restaurant_food_item_id=? AND restaurant_id=?",id,a.restaurantId());}
    public boolean customerOrder(Long id){var a=actor();role(a,Role.CUSTOMER);return exists("SELECT COUNT(*) FROM orders WHERE order_id=? AND customer_id=?",id,a.customerId());}
    public boolean restaurantOrder(Long id){var a=actor();role(a,Role.RESTAURANT);return exists("SELECT COUNT(*) FROM orders WHERE order_id=? AND restaurant_id=?",id,a.restaurantId());}
    public boolean cancelOrder(Long id){var a=actor();role(a,Role.CUSTOMER,Role.RESTAURANT);return a.role()==Role.CUSTOMER?customerOrder(id):restaurantOrder(id);}
    public boolean readOrder(Long id){var a=actor();role(a,Role.CUSTOMER,Role.RESTAURANT,Role.DRIVER,Role.ADMIN);
        return switch(a.role()){
            case ADMIN->true;case CUSTOMER->customerOrder(id);case RESTAURANT->restaurantOrder(id);
            case DRIVER->exists("SELECT COUNT(*) FROM deliveries WHERE order_id=? AND driver_id=?",id,a.driverId());};}
    public boolean driverOrder(Long id){var a=actor();role(a,Role.DRIVER);return exists("SELECT COUNT(*) FROM deliveries WHERE order_id=? AND driver_id=?",id,a.driverId());}
    public boolean delivery(Long id){var a=actor();role(a,Role.DRIVER);return exists("SELECT COUNT(*) FROM deliveries WHERE delivery_id=? AND driver_id=?",id,a.driverId());}
    public boolean activeDriver(Long requested){var a=actor();role(a,Role.DRIVER);if(!a.driverId().equals(requested))throw new ResourceNotFoundException("Resource not found");return exists("SELECT COUNT(*) FROM drivers WHERE driver_id=? AND drive_status=1",a.driverId());}
    public boolean rating(Long id,Long customer,boolean admin){var a=actor();if(admin && a.role()==Role.ADMIN)return true;profile("CUSTOMER",customer,false);
        return exists("SELECT COUNT(*) FROM ratings WHERE rating_id=? AND customer_id=?",id,a.customerId());}
}
