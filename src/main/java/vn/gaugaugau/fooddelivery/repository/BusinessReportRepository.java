package vn.gaugaugau.fooddelivery.repository;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;
import vn.gaugaugau.fooddelivery.service.BusinessReportQuery;

@Repository @RequiredArgsConstructor
public class BusinessReportRepository {
    private final JdbcTemplate jdbc;
    static final String ORDER_FROM=" FROM orders o LEFT JOIN customers c ON c.customer_id=o.customer_id LEFT JOIN restaurants r ON r.restaurant_id=o.restaurant_id LEFT JOIN payments p ON p.order_id=o.order_id";
    static final String DELIVERY_FROM=" FROM deliveries d JOIN orders o ON o.order_id=d.order_id LEFT JOIN drivers v ON v.driver_id=d.driver_id";
    static final String PAID="o.order_status='COMPLETED' AND p.payment_status='SUCCESS' AND p.paid_at IS NOT NULL AND p.amount=o.total_amount AND o.total_amount=o.subtotal+o.shipping_fee";
    static final String DURATION="d.driver_id IS NOT NULL AND d.delivery_status='DELIVERED' AND d.pickup_time IS NOT NULL AND d.delivered_time>=d.pickup_time";
    public String from(BusinessReportQuery q){return q.delivery()?DELIVERY_FROM:ORDER_FROM;}
    public Map<String,Object> summary(BusinessReportQuery q){
        String sql=q.delivery()?"COUNT(*) AS total,COALESCE(SUM(d.driver_id IS NOT NULL),0) AS assigned,COALESCE(SUM(d.driver_id IS NOT NULL AND d.delivery_status='DELIVERED'),0) AS delivered,COALESCE(SUM(d.delivery_status='CANCELLED'),0) AS cancelled,AVG(CASE WHEN "+DURATION+" THEN TIMESTAMPDIFF(MICROSECOND,d.pickup_time,d.delivered_time)/1000000.0 END) AS averageSeconds,COALESCE(SUM("+DURATION+"),0) AS validDurationCount":
            "COUNT(*) AS total,COALESCE(SUM(o.order_status='COMPLETED'),0) AS completed,COALESCE(SUM(o.order_status='CANCELLED'),0) AS cancelled,COALESCE(SUM(CASE WHEN "+PAID+" THEN o.total_amount ELSE 0 END),0) AS amount,COALESCE(SUM(CASE WHEN "+PAID+" THEN o.subtotal ELSE 0 END),0) AS subtotal,COALESCE(SUM(CASE WHEN "+PAID+" THEN o.shipping_fee ELSE 0 END),0) AS shipping,COALESCE(SUM("+PAID+"),0) AS paidCount";
        return new LinkedHashMap<>(jdbc.queryForMap("SELECT "+sql+from(q)+q.where(),q.arguments().toArray()));
    }
    public List<Map<String,Object>> series(BusinessReportQuery q){
        return jdbc.queryForList("SELECT DATE_FORMAT(o.created_at,'%Y-%m-%d') AS day,COUNT(*) AS orders,COALESCE(SUM(CASE WHEN "+PAID+" THEN o.total_amount ELSE 0 END),0) AS amount"+ORDER_FROM+q.where()+" GROUP BY DATE_FORMAT(o.created_at,'%Y-%m-%d') ORDER BY day",q.arguments().toArray());
    }
    public List<Map<String,Object>> drivers(BusinessReportQuery q){
        var a=q.arguments();a.add(q.size());a.add((long)q.driverPage()*q.size());
        return jdbc.queryForList("SELECT d.driver_id AS driverId,v.name AS driverName,COUNT(*) AS assigned,COUNT(CASE WHEN d.delivery_status='DELIVERED' THEN 1 END) AS delivered,COUNT(CASE WHEN d.delivery_status='CANCELLED' THEN 1 END) AS cancelled"+DELIVERY_FROM+q.where()+" AND d.driver_id IS NOT NULL GROUP BY d.driver_id,v.name ORDER BY d.driver_id LIMIT ? OFFSET ?",a.toArray());
    }
    public long driverCount(BusinessReportQuery q){return jdbc.queryForObject("SELECT COUNT(DISTINCT d.driver_id)"+DELIVERY_FROM+q.where(),Long.class,q.arguments().toArray());}
    public List<Map<String,Object>> exportDrivers(BusinessReportQuery q){return jdbc.queryForList("SELECT d.driver_id AS driverId,v.name AS driverName,COUNT(*) AS assigned,COUNT(CASE WHEN d.delivery_status='DELIVERED' THEN 1 END) AS delivered,COUNT(CASE WHEN d.delivery_status='CANCELLED' THEN 1 END) AS cancelled"+DELIVERY_FROM+q.where()+" AND d.driver_id IS NOT NULL GROUP BY d.driver_id,v.name ORDER BY d.driver_id LIMIT 10000",q.arguments().toArray());}
    public String detailSelect(BusinessReportQuery q){return q.delivery()?"SELECT o.order_id AS orderId,d.delivery_id AS deliveryId,v.name AS driverName,d.pickup_time AS pickupTime,d.delivered_time AS deliveredTime,d.delivery_status AS status,CASE WHEN "+DURATION+" THEN TIMESTAMPDIFF(MICROSECOND,d.pickup_time,d.delivered_time)/1000000.0 END AS durationSeconds":
        "SELECT o.order_id AS orderId,c.name AS customerName,r.name AS restaurantName,o.total_amount AS amount,o.shipping_fee AS shipping,o.created_at AS createdAt,o.order_status AS status,p.payment_status AS paymentStatus";}
    public List<Map<String,Object>> details(BusinessReportQuery q){var a=q.arguments();a.add(q.size());a.add((long)q.page()*q.size());var rows=jdbc.queryForList(detailSelect(q)+from(q)+q.where()+" ORDER BY "+q.ordering()+" LIMIT ? OFFSET ?",a.toArray());rows.forEach(row->row.replaceAll((key,value)->value instanceof java.sql.Timestamp t?t.toLocalDateTime().toString():value instanceof java.sql.Date d?d.toLocalDate().toString():value));return rows;}
    public void stream(BusinessReportQuery q,RowCallbackHandler handler){jdbc.query(connection->{var statement=connection.prepareStatement(detailSelect(q)+from(q)+q.where()+" ORDER BY "+q.ordering()+" LIMIT 10001",java.sql.ResultSet.TYPE_FORWARD_ONLY,java.sql.ResultSet.CONCUR_READ_ONLY);statement.setFetchSize(Integer.MIN_VALUE);var a=q.arguments();for(int i=0;i<a.size();i++)statement.setObject(i+1,a.get(i));return statement;},handler);}
}
