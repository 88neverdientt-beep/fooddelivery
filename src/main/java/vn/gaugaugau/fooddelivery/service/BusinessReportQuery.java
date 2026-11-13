package vn.gaugaugau.fooddelivery.service;

import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.model.enums.*;

/** All identifiers/sort clauses come from this whitelist; values are JDBC parameters. */
public record BusinessReportQuery(boolean delivery,LocalDate from,LocalDate to,String status,Long profileId,int page,int size,String sort,int driverPage) {
    public static BusinessReportQuery parse(boolean delivery,Map<String,String> values){
        try {
            if(!Set.of("from","to","status",delivery?"driverId":"restaurantId","page","size","sort","driverPage").containsAll(values.keySet()))throw new IllegalArgumentException();
            LocalDate today=LocalDate.now(),from=date(values.get("from"),today.withDayOfMonth(1)),to=date(values.get("to"),today);
            if(from.getYear()<1||to.getYear()>9998||to.isBefore(from)||java.time.temporal.ChronoUnit.DAYS.between(from,to)>92)throw new IllegalArgumentException();
            String status=values.getOrDefault("status","");if(!status.isEmpty()){if(delivery)DeliveryStatus.valueOf(status);else OrderStatus.valueOf(status);}
            String id=values.getOrDefault(delivery?"driverId":"restaurantId","");Long profile=id.isEmpty()?null:Long.valueOf(id);if(profile!=null&&(profile<=0||!id.matches("[1-9][0-9]*")))throw new IllegalArgumentException();
            int driverPage=Integer.parseInt(values.getOrDefault("driverPage","0"));
            if(driverPage<0||driverPage>1000000||(!delivery&&driverPage!=0))throw new IllegalArgumentException();
            int page=Integer.parseInt(values.getOrDefault("page","0")),size=Integer.parseInt(values.getOrDefault("size","20"));
            String sort=values.getOrDefault("sort","newest");
            if(page<0||page>1000000||size<1||size>50||!Set.of("newest","oldest").contains(sort))throw new IllegalArgumentException();
            return new BusinessReportQuery(delivery,from,to,status,profile,page,size,sort,driverPage);
        }catch(RuntimeException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Bộ lọc không hợp lệ: ngày ISO, tối đa 93 ngày, size 1–50 và mã dương.");}
    }
    private static LocalDate date(String value,LocalDate fallback){if(value==null)return fallback;var date=LocalDate.parse(value);if(!date.toString().equals(value))throw new IllegalArgumentException();return date;}
    public String where(){return " WHERE o.created_at>=? AND o.created_at<?"+(status.isEmpty()?"":" AND "+(delivery?"d.delivery_status":"o.order_status")+"=?")+(profileId==null?"":" AND "+(delivery?"d.driver_id":"o.restaurant_id")+"=?");}
    public List<Object> arguments(){var a=new ArrayList<Object>(List.of(from.atStartOfDay(),to.plusDays(1).atStartOfDay()));if(!status.isEmpty())a.add(status);if(profileId!=null)a.add(profileId);return a;}
    public String ordering(){return (delivery?"d.delivery_id":"o.order_id")+(sort.equals("oldest")?" ASC":" DESC");}
}
