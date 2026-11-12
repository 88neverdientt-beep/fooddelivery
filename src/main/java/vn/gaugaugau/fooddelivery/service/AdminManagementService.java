package vn.gaugaugau.fooddelivery.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.model.*;
import vn.gaugaugau.fooddelivery.model.dto.*;
import vn.gaugaugau.fooddelivery.model.dto.AdminManagementDtos.*;
import vn.gaugaugau.fooddelivery.model.enums.*;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
@PreAuthorize("hasRole('ADMIN')")
public class AdminManagementService {
    private final JdbcTemplate jdbc;
    private final OrderService orders;
    private static void bad(String reason){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,reason);}
    private static LocalDateTime time(ResultSet r,String key)throws SQLException{var t=r.getTimestamp(key);return t==null?null:t.toLocalDateTime();}
    private static Long id(ResultSet r,String key)throws SQLException{return r.getObject(key,Long.class);}
    private static Boolean bool(ResultSet r,String key)throws SQLException{return r.getObject(key,Boolean.class);}
    private static Ref ref(ResultSet r,String prefix)throws SQLException{var id=id(r,prefix+"_id");return id==null?null:new Ref(id,r.getString(prefix+"_name"));}
    private static void validId(Long id){if(id==null||id<=0)bad("Positive ID required");}
    private <T> T one(String sql,RowMapper<T> mapper,Long id){validId(id);var rows=jdbc.query(sql,mapper,id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Resource not found");return rows.getFirst();}
    private static class Query {
        final Map<String,String> p;final List<Object> args=new ArrayList<>();String where;final String ordering;final int page,size;
        Query(Map<String,String> p,String from,String id,String...fields){
            this.p=p;this.where=from+" WHERE 1=1";
            var allowed=new HashSet<>(List.of("q","page","size","sort"));allowed.addAll(Arrays.asList(fields));
            if(!allowed.containsAll(p.keySet()))bad("Unsupported query parameter");
            page=number("page",0);size=number("size",20);ReadQuery.page(page,size,org.springframework.data.domain.Sort.unsorted());
            ordering=switch(value("sort","newest")){case "newest"->id+" DESC";case "oldest"->id+" ASC";default->{bad("Invalid sort");yield "";}};
        }
        int number(String key,int fallback){try{return p.containsKey(key)?Integer.parseInt(p.get(key)):fallback;}catch(NumberFormatException e){bad("Invalid number");return 0;}}
        String value(String key,String fallback){String value=p.get(key);return value==null||value.isBlank()?fallback:value;}
        void search(String...columns){var pattern=ReadQuery.literalPattern(p.get("q"));where+=" AND ("+String.join(" OR ",Arrays.stream(columns).map(c->"LOWER(COALESCE(CAST("+c+" AS CHAR),'')) LIKE ? ESCAPE '!' ").toList())+")";for(String ignored:columns)args.add(pattern);}
        void filter(String parameter,String column,Set<String> values){String v=value(parameter,"");if(v.isEmpty())return;if(!values.contains(v))bad("Invalid "+parameter);where+=" AND "+column+"=?";args.add(v);}
        void linked(String parameter,String column){String v=value(parameter,"");if(v.isEmpty())return;try{long n=Long.parseLong(v);validId(n);where+=" AND "+column+"=?";args.add(n);}catch(NumberFormatException e){bad("Invalid ID");}}
        void activity(String column,String yes,String no){String v=value("activity","all");if(v.equals("all"))return;if(!v.equals(yes)&&!v.equals(no))bad("Invalid activity");where+=" AND "+column+"=?";args.add(v.equals(yes));}
        void dates(String column){LocalDate from=date(p.get("from")),to=date(p.get("to"));if(from!=null&&to!=null&&to.isBefore(from))bad("Invalid date range");if(from!=null){where+=" AND "+column+">=?";args.add(from.atStartOfDay());}if(to!=null){where+=" AND "+column+"<?";args.add(to.plusDays(1).atStartOfDay());}}
    }
    private static LocalDate date(String value){if(value==null||value.isBlank())return null;try{LocalDate d=LocalDate.parse(value);if(d.getYear()<1900||d.getYear()>9998)bad("Date out of range");return d;}catch(java.time.format.DateTimeParseException e){bad("Invalid ISO date");return null;}}
    private static Set<String> names(Enum<?>[] values){var names=new HashSet<String>();for(var v:values)names.add(v.name());return names;}
    private <T> PageResponse<T> page(Query q,String select,RowMapper<T> mapper){
        long total=jdbc.queryForObject("SELECT COUNT(*)"+q.where,Long.class,q.args.toArray());
        var args=new ArrayList<>(q.args);args.add(q.size);args.add((long)q.page*q.size);
        return new PageResponse<>(jdbc.query("SELECT "+select+q.where+" ORDER BY "+q.ordering+" LIMIT ? OFFSET ?",mapper,args.toArray()),q.page,q.size,total,(int)((total+q.size-1)/q.size));
    }
    private static final String ACCOUNTS=" FROM accounts a LEFT JOIN customers c ON c.customer_id=a.customer_id LEFT JOIN restaurants r ON r.restaurant_id=a.restaurant_id LEFT JOIN drivers d ON d.driver_id=a.driver_id";
    private static final String ACCOUNT_FIELDS="a.account_id,a.email,a.role,a.status,a.created_at,a.version,a.customer_id,a.restaurant_id,a.driver_id,COALESCE(c.name,r.name,d.name) AS name";
    private static final RowMapper<AccountRow> ACCOUNT=(r,n)->new AccountRow(id(r,"account_id"),r.getString("email"),r.getString("role"),r.getString("status"),time(r,"created_at"),id(r,"customer_id"),id(r,"restaurant_id"),id(r,"driver_id"),r.getString("name"),r.getLong("version"));
    public PageResponse<AccountRow> accounts(Map<String,String> p){var q=new Query(p,ACCOUNTS,"a.account_id","role","status");q.search("a.account_id","a.email","c.name","r.name","d.name");q.filter("role","a.role",names(Role.values()));q.filter("status","a.status",names(AccountStatus.values()));return page(q,ACCOUNT_FIELDS,ACCOUNT);}
    public AccountRow account(Long id){return one("SELECT "+ACCOUNT_FIELDS+ACCOUNTS+" WHERE a.account_id=?",ACCOUNT,id);}
    public PageResponse<CustomerRow> customers(Map<String,String> p){
        var q=new Query(p," FROM customers c LEFT JOIN accounts a ON a.customer_id=c.customer_id","c.customer_id","accountStatus");q.search("c.customer_id","c.name","c.email");q.filter("accountStatus","a.status",names(AccountStatus.values()));
        return page(q,"c.customer_id,c.name,c.email,c.created_at,a.account_id,a.status,(SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.customer_id) AS order_count",(r,n)->new CustomerRow(id(r,"customer_id"),r.getString("name"),r.getString("email"),time(r,"created_at"),id(r,"account_id"),r.getString("status"),r.getLong("order_count")));
    }
    private static final String RESTAURANTS=" FROM restaurants r LEFT JOIN accounts a ON a.restaurant_id=r.restaurant_id";
    private static final String RESTAURANT_FIELDS="r.restaurant_id,r.name,r.address,r.restaurant_status,r.created_at,a.account_id,a.status,(SELECT COUNT(*) FROM orders o WHERE o.restaurant_id=r.restaurant_id) AS order_count,(SELECT COUNT(*) FROM restaurant_food_items m WHERE m.restaurant_id=r.restaurant_id) AS menu_count";
    public PageResponse<RestaurantRow> restaurants(Map<String,String> p){var q=new Query(p,RESTAURANTS,"r.restaurant_id","accountStatus","activity");q.search("r.restaurant_id","r.name","r.address");q.filter("accountStatus","a.status",names(AccountStatus.values()));q.activity("r.restaurant_status","open","closed");return page(q,RESTAURANT_FIELDS,(r,n)->new RestaurantRow(id(r,"restaurant_id"),r.getString("name"),r.getString("address"),bool(r,"restaurant_status"),time(r,"created_at"),id(r,"account_id"),r.getString("status"),r.getLong("order_count"),r.getLong("menu_count")));}
    public record RestaurantExportQuery(String sql,List<Object> arguments) {}
    public RestaurantExportQuery restaurantExportQuery(Map<String,String> parameters) {
        if(!Set.of("q","sort","accountStatus","activity").containsAll(parameters.keySet()))
            bad("Tham số xuất nhà hàng không hợp lệ");
        var q=new Query(parameters,RESTAURANTS,"r.restaurant_id","accountStatus","activity");
        q.search("r.restaurant_id","r.name","r.address");
        q.filter("accountStatus","a.status",names(AccountStatus.values()));
        q.activity("r.restaurant_status","open","closed");
        return new RestaurantExportQuery("SELECT r.restaurant_id,r.name,r.email,r.phone_number,r.address,r.restaurant_status,r.created_at,a.account_id,a.status"+q.where+" ORDER BY "+q.ordering,List.copyOf(q.args));
    }
    public RestaurantDetail restaurant(Long id){return one("SELECT "+RESTAURANT_FIELDS+",r.email,r.phone_number,r.version"+RESTAURANTS+" WHERE r.restaurant_id=?",(r,n)->new RestaurantDetail(id(r,"restaurant_id"),r.getString("name"),r.getString("email"),r.getString("phone_number"),r.getString("address"),bool(r,"restaurant_status"),time(r,"created_at"),id(r,"account_id"),r.getString("status"),r.getLong("order_count"),r.getLong("menu_count"),r.getLong("version")),id);}
    public PageResponse<DriverRow> drivers(Map<String,String> p){var q=new Query(p," FROM drivers d LEFT JOIN accounts a ON a.driver_id=d.driver_id","d.driver_id","accountStatus","activity");q.search("d.driver_id","d.name","d.email","d.license_plate");q.filter("accountStatus","a.status",names(AccountStatus.values()));q.activity("d.drive_status","receiving","paused");return page(q,"d.driver_id,d.name,d.email,d.license_plate,d.drive_status,d.created_at,a.account_id,a.status,(SELECT COUNT(*) FROM deliveries x WHERE x.driver_id=d.driver_id) AS total,(SELECT COUNT(*) FROM deliveries x WHERE x.driver_id=d.driver_id AND x.delivery_status IN ('PENDING','PICKED_UP','DELIVERING')) AS active",(r,n)->new DriverRow(id(r,"driver_id"),r.getString("name"),r.getString("email"),r.getString("license_plate"),bool(r,"drive_status"),time(r,"created_at"),id(r,"account_id"),r.getString("status"),r.getLong("total"),r.getLong("active")));}
    private static final String ORDER_JOINS=" FROM orders o LEFT JOIN customers c ON c.customer_id=o.customer_id LEFT JOIN restaurants r ON r.restaurant_id=o.restaurant_id LEFT JOIN payments p ON p.order_id=o.order_id LEFT JOIN deliveries d ON d.order_id=o.order_id";
    public PageResponse<OrderRow> orders(Map<String,String> p){var q=new Query(p,ORDER_JOINS,"o.order_id","status","paymentStatus","restaurantId","customerId","from","to");q.search("o.order_id","c.name","r.name");q.filter("status","o.order_status",names(OrderStatus.values()));q.filter("paymentStatus","p.payment_status",names(PaymentStatus.values()));q.linked("restaurantId","o.restaurant_id");q.linked("customerId","o.customer_id");q.dates("o.created_at");return page(q,"o.order_id,c.customer_id,c.name AS customer_name,r.restaurant_id,r.name AS restaurant_name,o.created_at,o.subtotal,o.shipping_fee,o.total_amount,o.order_status,p.payment_id,p.payment_status,d.delivery_id,d.delivery_status",(r,n)->new OrderRow(id(r,"order_id"),ref(r,"customer"),ref(r,"restaurant"),time(r,"created_at"),r.getBigDecimal("subtotal"),r.getBigDecimal("shipping_fee"),r.getBigDecimal("total_amount"),r.getString("order_status"),id(r,"payment_id"),r.getString("payment_status"),id(r,"delivery_id"),r.getString("delivery_status")));}
    public OrderExcelExportService.Query orderExportQuery(Map<String,String> p) {
        if(!Set.of("q","sort","status","paymentStatus","restaurantId","customerId","from","to").containsAll(p.keySet()))bad("Tham số xuất đơn hàng không hợp lệ");
        var q=new Query(p,ORDER_JOINS,"o.order_id","status","paymentStatus","restaurantId","customerId","from","to");
        q.search("o.order_id","c.name","r.name");q.filter("status","o.order_status",names(OrderStatus.values()));q.filter("paymentStatus","p.payment_status",names(PaymentStatus.values()));q.linked("restaurantId","o.restaurant_id");q.linked("customerId","o.customer_id");q.dates("o.created_at");
        return new OrderExcelExportService.Query(OrderExcelExportService.SELECT+q.where+" ORDER BY "+q.ordering,List.copyOf(q.args));
    }
    private static final String DELIVERY_JOINS=" FROM deliveries d JOIN orders o ON o.order_id=d.order_id LEFT JOIN drivers v ON v.driver_id=d.driver_id LEFT JOIN restaurants r ON r.restaurant_id=o.restaurant_id";
    private static final String DELIVERY_FIELDS="d.delivery_id,o.order_id,v.driver_id,v.name AS driver_name,r.restaurant_id,r.name AS restaurant_name,o.order_status,d.delivery_status,d.pickup_time,d.delivered_time,o.created_at";
    private static final RowMapper<DeliveryRow> DELIVERY=(r,n)->new DeliveryRow(id(r,"delivery_id"),id(r,"order_id"),ref(r,"driver"),ref(r,"restaurant"),r.getString("order_status"),r.getString("delivery_status"),time(r,"pickup_time"),time(r,"delivered_time"),time(r,"created_at"));
    public PageResponse<DeliveryRow> deliveries(Map<String,String> p){var q=new Query(p,DELIVERY_JOINS,"d.delivery_id","status","driverId","restaurantId","from","to");q.search("d.delivery_id","o.order_id","v.name","r.name");q.filter("status","d.delivery_status",names(DeliveryStatus.values()));q.linked("driverId","d.driver_id");q.linked("restaurantId","o.restaurant_id");q.dates("o.created_at");return page(q,DELIVERY_FIELDS,DELIVERY);}
    public DeliveryDetail delivery(Long id){
        var row=one("SELECT "+DELIVERY_FIELDS+",r.address AS pickup_address,o.delivery_address,v.license_plate"+DELIVERY_JOINS+" WHERE d.delivery_id=?",(r,n)->new DeliveryDetail(DELIVERY.mapRow(r,n),r.getString("pickup_address"),r.getString("delivery_address"),r.getString("license_plate"),null),id);
        return new DeliveryDetail(row.delivery(),row.pickupAddress(),row.deliveryAddress(),row.licensePlate(),orders.getOrderByOrderId(row.delivery().orderId()));
    }
    public PageResponse<PaymentRow> payments(Map<String,String> p){
        var q=new Query(p," FROM payments p JOIN orders o ON o.order_id=p.order_id LEFT JOIN payment_methods m ON m.method_id=p.payment_method_id","p.payment_id","status","method","from","to");q.search("p.payment_id","o.order_id");q.filter("status","p.payment_status",names(PaymentStatus.values()));
        String method=q.value("method","");if(!method.isEmpty()){if(!method.matches("[A-Za-z0-9_-]{1,30}"))bad("Invalid payment method");q.where+=" AND m.method_code=?";q.args.add(method);}
        q.dates("p.created_at");return page(q,"p.payment_id,o.order_id,m.method_code,m.method_name,p.amount,p.payment_status,p.created_at,p.paid_at,p.refunded_at,o.order_status",(r,n)->new PaymentRow(id(r,"payment_id"),id(r,"order_id"),r.getString("method_code"),r.getString("method_name"),r.getBigDecimal("amount"),r.getString("payment_status"),time(r,"created_at"),time(r,"paid_at"),time(r,"refunded_at"),r.getString("order_status")));
    }
    public PageResponse<ReviewRow> reviews(Map<String,String> p){var q=new Query(p," FROM ratings t LEFT JOIN customers c ON c.customer_id=t.customer_id LEFT JOIN restaurants r ON r.restaurant_id=t.restaurant_id","t.rating_id","restaurantId","score","from","to");q.search("t.rating_id","t.comment","r.name");q.linked("restaurantId","t.restaurant_id");String score=q.value("score","");if(!score.isEmpty()){int s=q.number("score",0);if(s<1||s>5)bad("Score must be1..5");q.where+=" AND t.rating_score=?";q.args.add(s);}q.dates("t.created_at");return page(q,"t.rating_id,t.rating_score,t.comment,t.created_at,c.customer_id,c.name AS customer_name,r.restaurant_id,r.name AS restaurant_name",(r,n)->new ReviewRow(id(r,"rating_id"),r.getInt("rating_score"),r.getString("comment"),time(r,"created_at"),ref(r,"customer"),ref(r,"restaurant")));}
    private Map<String,Long> states(String sql,Enum<?>[] values,Object...args){var result=new LinkedHashMap<String,Long>();for(var v:values)result.put(v.name(),0L);jdbc.query(sql,rs->{result.put(Objects.toString(rs.getString(1),"UNKNOWN"),rs.getLong(2));},args);return result;}
    public Analytics analytics(Map<String,String> p){
        if(!Set.of("from","to").containsAll(p.keySet()))bad("Unsupported analytics parameter");
        LocalDate today=LocalDate.now(),end=date(p.get("to"));if(end==null)end=today;LocalDate start=date(p.get("from"));if(start==null)start=end.minusDays(29);
        if(end.isBefore(start)||ChronoUnit.DAYS.between(start,end)>=93)bad("Range must be1..93 days");
        Object[] period={start.atStartOfDay(),end.plusDays(1).atStartOfDay()};var all=new LinkedHashMap<String,Long>();
        for(String table:List.of("customers","restaurants","drivers","accounts","orders"))all.put(table,jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class));
        String cohort=" FROM orders o WHERE o.created_at>=? AND o.created_at<?";
        var orderStates=states("SELECT o.order_status,COUNT(*)"+cohort+" GROUP BY o.order_status",OrderStatus.values(),period);
        long total=orderStates.values().stream().mapToLong(Long::longValue).sum();
        BigDecimal value=jdbc.queryForObject("SELECT COALESCE(SUM(o.total_amount),0)"+cohort+" AND o.order_status<>'CANCELLED'",BigDecimal.class,period);
        var days=jdbc.query("SELECT DATE(o.created_at),COUNT(*)"+cohort+" GROUP BY DATE(o.created_at) ORDER BY DATE(o.created_at)",(r,n)->new DayCount(r.getDate(1).toLocalDate(),r.getLong(2)),period);
        String paid=" FROM orders o JOIN payments p ON p.order_id=o.order_id WHERE o.order_status='COMPLETED' AND p.payment_status='SUCCESS' AND p.amount=o.total_amount AND p.amount=o.subtotal+o.shipping_fee AND p.paid_at>=? AND p.paid_at<?";
        var money=jdbc.queryForMap("SELECT COUNT(*) AS n,COALESCE(SUM(o.subtotal),0) AS food,COALESCE(SUM(o.shipping_fee),0) AS shipping,COALESCE(SUM(p.amount),0) AS total"+paid,period);
        var paidDays=jdbc.query("SELECT DATE(p.paid_at),SUM(p.amount)"+paid+" GROUP BY DATE(p.paid_at) ORDER BY DATE(p.paid_at)",(r,n)->new DayMoney(r.getDate(1).toLocalDate(),r.getBigDecimal(2)),period);
        var deliveryStates=states("SELECT d.delivery_status,COUNT(*) FROM deliveries d JOIN orders o ON o.order_id=d.order_id WHERE o.created_at>=? AND o.created_at<? GROUP BY d.delivery_status",DeliveryStatus.values(),period);
        long delivered=deliveryStates.get("DELIVERED"),terminal=delivered+deliveryStates.get("CANCELLED");
        var ratio=terminal==0?null:BigDecimal.valueOf(delivered).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(terminal),4,RoundingMode.HALF_UP);
        var methods=jdbc.query("SELECT m.method_code,m.method_name,COUNT(*),SUM(CASE WHEN p.payment_status='SUCCESS' THEN 1 ELSE 0 END) FROM payments p LEFT JOIN payment_methods m ON m.method_id=p.payment_method_id WHERE p.created_at>=? AND p.created_at<? GROUP BY m.method_id,m.method_code,m.method_name ORDER BY m.method_code",(r,n)->new MethodCount(r.getString(1),r.getString(2),r.getLong(3),r.getLong(4)),period);
        var topRestaurants=jdbc.query("SELECT r.restaurant_id,r.name,COUNT(*) AS total,SUM(CASE WHEN o.order_status='COMPLETED' THEN 1 ELSE 0 END) FROM orders o JOIN restaurants r ON r.restaurant_id=o.restaurant_id WHERE o.created_at>=? AND o.created_at<? GROUP BY r.restaurant_id,r.name ORDER BY total DESC,r.restaurant_id LIMIT 10",(r,n)->new Ranked(new Ref(r.getLong(1),r.getString(2)),r.getLong(3),r.getLong(4)),period);
        var topDrivers=jdbc.query("SELECT v.driver_id,v.name,COUNT(*) AS total FROM deliveries d JOIN drivers v ON v.driver_id=d.driver_id WHERE d.delivery_status='DELIVERED' AND d.delivered_time>=? AND d.delivered_time<? GROUP BY v.driver_id,v.name ORDER BY total DESC,v.driver_id LIMIT 10",(r,n)->new Ranked(new Ref(r.getLong(1),r.getString(2)),r.getLong(3),r.getLong(3)),period);
        return new Analytics(start,end,today,ZoneId.systemDefault().getId(),all,new OrderCohort(total,orderStates,value,days),new RecordedPayments(((Number)money.get("n")).longValue(),(BigDecimal)money.get("food"),(BigDecimal)money.get("shipping"),(BigDecimal)money.get("total"),paidDays),new DeliveryCohort(deliveryStates,terminal,delivered,ratio),methods,topRestaurants,topDrivers);
    }
}
