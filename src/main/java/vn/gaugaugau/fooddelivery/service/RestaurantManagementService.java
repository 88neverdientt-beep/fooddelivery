package vn.gaugaugau.fooddelivery.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.security.CurrentActor;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantManagementDtos.*;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.repository.OrderRepository;

/** Owner-scoped read projections; analytics deliberately describes recorded food value, not payout. */
@Service @RequiredArgsConstructor @Transactional(readOnly=true)
@PreAuthorize("hasRole('RESTAURANT')")
public class RestaurantManagementService {
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final OrderService mapping;
    private Long own() { return CurrentActor.get().restaurantId(); }
    private static void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
    private static LocalDate date(String value) {
        try {
            if(value==null || value.isBlank()) return null;
            LocalDate date=LocalDate.parse(value);
            if(date.getYear()<1 || date.getYear()>9998) bad("Unsupported date");
            return date;
        }
        catch (java.time.format.DateTimeParseException exception) { bad("Invalid ISO date"); return null; }
    }
    private <T> PageResponse<T> result(List<T> items,int page,int size,long total) {
        return new PageResponse<>(items,page,size,total,(int)((total+size-1)/size));
    }
    public Profile profile() {
        return jdbc.queryForObject("SELECT restaurant_id,name,address,phone_number,restaurant_status,created_at,version FROM restaurants WHERE restaurant_id=?",
            (rs,n)->new Profile(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getBoolean(5),
                rs.getTimestamp(6)==null?null:rs.getTimestamp(6).toLocalDateTime(),rs.getLong(7)),own());
    }
    public PageResponse<CatalogItem> catalog(String q,String category,int page,int size) {
        ReadQuery.page(page,size,org.springframework.data.domain.Sort.unsorted());
        String where=" FROM food_items f WHERE NOT EXISTS (SELECT 1 FROM restaurant_food_items m WHERE m.item_id=f.item_id AND m.restaurant_id=?) AND (LOWER(f.name) LIKE ? ESCAPE '!' OR LOWER(COALESCE(f.description,'')) LIKE ? ESCAPE '!') AND (?='' OR LOWER(TRIM(f.category))=LOWER(?))";
        String pattern=ReadQuery.literalPattern(q),group=ReadQuery.category(category);
        Object[] args={own(),pattern,pattern,group,group};
        long total=jdbc.queryForObject("SELECT COUNT(*)"+where,Long.class,args);
        var bind=new ArrayList<Object>(Arrays.asList(args));bind.add(size);bind.add((long)page*size);
        var items=jdbc.query("SELECT f.item_id,f.name,f.category,f.description"+where+" ORDER BY f.name,f.item_id LIMIT ? OFFSET ?",
            (rs,n)->new CatalogItem(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4)),bind.toArray());
        return result(items,page,size,total);
    }
    public PageResponse<OrderResponseDTO> orders(String q,OrderStatus status,String from,String to,String sort,int page,int size) {
        ReadQuery.page(page,size,org.springframework.data.domain.Sort.unsorted());
        String ordering=switch(sort){case "newest"->"o.order_id DESC";case "oldest"->"o.order_id ASC";case "total-desc"->"o.total_amount DESC,o.order_id DESC";default->{bad("Invalid sort");yield "";}};
        String pattern=ReadQuery.literalPattern(q);LocalDate start=date(from),end=date(to);
        if(start!=null&&end!=null&&end.isBefore(start))bad("Invalid date range");
        String where=" FROM orders o JOIN customers c ON c.customer_id=o.customer_id WHERE o.restaurant_id=? AND (CAST(o.order_id AS CHAR) LIKE ? ESCAPE '!' OR LOWER(c.name) LIKE ? ESCAPE '!')";
        var args=new ArrayList<Object>(List.of(own(),pattern,pattern));
        if(status!=null){where+=" AND o.order_status=?";args.add(status.name());}
        if(start!=null){where+=" AND o.created_at>=?";args.add(start.atStartOfDay());}
        if(end!=null){where+=" AND o.created_at<?";args.add(end.plusDays(1).atStartOfDay());}
        long total=jdbc.queryForObject("SELECT COUNT(*)"+where,Long.class,args.toArray());
        args.add(size);args.add((long)page*size);
        var ids=jdbc.query("SELECT o.order_id"+where+" ORDER BY "+ordering+" LIMIT ? OFFSET ?",(rs,n)->rs.getLong(1),args.toArray());
        if(ids.isEmpty())return result(List.of(),page,size,total);
        var details=new HashMap<Long,vn.gaugaugau.fooddelivery.model.Order>();
        orders.findPageDetails(ids).forEach(order->details.put(order.getOrderId(),order));
        return result(ids.stream().map(id->mapping.convertToOrderResponseDTO(details.get(id))).toList(),page,size,total);
    }
    public Analytics analytics(String from,String to) {
        LocalDate end=date(to);if(end==null)end=LocalDate.now();LocalDate start=date(from);if(start==null)start=end.minusDays(29);
        if(start.getYear()<1 || end.getYear()>9998)bad("Unsupported date range");
        if(end.isBefore(start)||ChronoUnit.DAYS.between(start,end)>=93)bad("Range must be 1..93 days");
        Long id=own();Object[] period={id,start.atStartOfDay(),end.plusDays(1).atStartOfDay()};
        String cohort=" FROM orders o WHERE o.restaurant_id=? AND o.created_at>=? AND o.created_at<?";
        var states=new LinkedHashMap<String,Long>();for(var state:OrderStatus.values())states.put(state.name(),0L);
        jdbc.query("SELECT o.order_status,COUNT(*)"+cohort+" GROUP BY o.order_status",rs->{states.put(rs.getString(1),rs.getLong(2));},period);
        long total=states.values().stream().mapToLong(Long::longValue).sum();
        String paid=" FROM orders o JOIN payments p ON p.order_id=o.order_id WHERE o.restaurant_id=? AND o.order_status='COMPLETED' AND p.payment_status='SUCCESS' AND p.paid_at>=? AND p.paid_at<?";
        var money=jdbc.queryForMap("SELECT COUNT(*) AS n,COALESCE(SUM(o.subtotal),0) AS food,COALESCE(SUM(o.shipping_fee),0) AS shipping"+paid,period);
        long active=jdbc.queryForObject("SELECT COUNT(*) FROM restaurant_food_items WHERE restaurant_id=? AND is_available=1",Long.class,id);
        long ratingCount=jdbc.queryForObject("SELECT COUNT(*) FROM ratings WHERE restaurant_id=?",Long.class,id);
        Double average=jdbc.queryForObject("SELECT AVG(rating_score) FROM ratings WHERE restaurant_id=?",Double.class,id);
        var days=jdbc.query("SELECT DATE(o.created_at),COUNT(*)"+cohort+" GROUP BY DATE(o.created_at) ORDER BY DATE(o.created_at)",(rs,n)->new DayCount(rs.getDate(1).toLocalDate(),rs.getLong(2)),period);
        var paidDays=jdbc.query("SELECT DATE(p.paid_at),SUM(o.subtotal)"+paid+" GROUP BY DATE(p.paid_at) ORDER BY DATE(p.paid_at)",(rs,n)->new DayMoney(rs.getDate(1).toLocalDate(),rs.getBigDecimal(2)),period);
        String top=" FROM order_details d JOIN orders o ON o.order_id=d.order_id JOIN payments p ON p.order_id=o.order_id JOIN restaurant_food_items m ON m.restaurant_food_item_id=d.restaurant_food_item_id JOIN food_items f ON f.item_id=m.item_id WHERE o.restaurant_id=? AND o.order_status='COMPLETED' AND p.payment_status='SUCCESS' AND p.paid_at>=? AND p.paid_at<?";
        var items=jdbc.query("SELECT m.restaurant_food_item_id,f.name,SUM(d.quantity) AS qty,SUM(d.subtotal)"+top+" GROUP BY m.restaurant_food_item_id,f.name ORDER BY qty DESC,m.restaurant_food_item_id LIMIT 10",(rs,n)->new TopItem(rs.getLong(1),rs.getString(2),rs.getLong(3),rs.getBigDecimal(4)),period);
        return new Analytics(start,end,total,states,((Number)money.get("n")).longValue(),(java.math.BigDecimal)money.get("food"),(java.math.BigDecimal)money.get("shipping"),active,ratingCount,average,days,paidDays,items);
    }
}
