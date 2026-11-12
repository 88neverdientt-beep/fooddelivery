package vn.gaugaugau.fooddelivery.service;

import java.io.*;
import java.sql.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** One row per order: never joins order_details or multiplies monetary totals. */
@Service @RequiredArgsConstructor @PreAuthorize("hasAnyRole('ADMIN','RESTAURANT')")
public class OrderExcelExportService {
    private final JdbcTemplate jdbc;
    public record Query(String sql,List<Object> arguments) {}
    public static final String SELECT="SELECT o.order_id,o.created_at,o.restaurant_id,r.name AS restaurant_name,o.customer_id,o.order_status,o.subtotal,o.shipping_fee,o.total_amount,p.payment_status,d.delivery_status";
    private static final String[] HEADERS={"Mã đơn hàng","Ngày đặt (giờ máy chủ)","Mã nhà hàng","Nhà hàng","Mã khách hàng","Trạng thái đơn","Tạm tính (VND)","Phí giao hàng (VND)","Tổng tiền (VND)","Thanh toán","Giao hàng"};
    static String status(String type,String value) {
        if(value==null)return type.equals("delivery")?"Chưa tạo giao hàng":"Chưa ghi nhận";
        return switch(type+":"+value) {
            case "order:PENDING"->"Chờ nhà hàng xác nhận";case "order:CONFIRMED"->"Nhà hàng đã xác nhận";case "order:PREPARING"->"Đang chuẩn bị món";case "order:READY"->"Sẵn sàng giao";case "order:DELIVERING"->"Đang giao hàng";case "order:COMPLETED"->"Đã hoàn thành";case "order:CANCELLED"->"Đã hủy";
            case "payment:PENDING"->"Chờ thanh toán";case "payment:SUCCESS"->"Đã thanh toán";case "payment:CANCELLED"->"Đã hủy thanh toán";case "payment:REFUNDED"->"Đã hoàn tiền";
            case "delivery:PENDING"->"Chờ tài xế nhận / lấy món";case "delivery:PICKED_UP"->"Tài xế đã lấy món";case "delivery:DELIVERING"->"Tài xế đang giao";case "delivery:DELIVERED"->"Đã giao đến khách hàng";case "delivery:CANCELLED"->"Chuyến giao đã hủy";default->value;
        };
    }
    private static String amount(ResultSet rs,String column)throws SQLException {var value=rs.getBigDecimal(column);return value==null?null:value.toPlainString();}
    @Transactional(readOnly=true)
    public void write(Query query,OutputStream output)throws IOException {
        try(var workbook=new RestaurantWorkbook(output,HEADERS,"Đơn hàng",Set.of(6,7,8))) {
            jdbc.query(connection->{var statement=connection.prepareStatement(query.sql(),ResultSet.TYPE_FORWARD_ONLY,ResultSet.CONCUR_READ_ONLY);statement.setFetchSize(Integer.MIN_VALUE);for(int i=0;i<query.arguments().size();i++)statement.setObject(i+1,query.arguments().get(i));return statement;},(RowCallbackHandler)rs->{
                try {var time=rs.getTimestamp("created_at");workbook.row(rs.getString("order_id"),time==null?"Chưa ghi nhận":time.toLocalDateTime().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),rs.getString("restaurant_id"),rs.getString("restaurant_name"),rs.getString("customer_id"),status("order",rs.getString("order_status")),amount(rs,"subtotal"),amount(rs,"shipping_fee"),amount(rs,"total_amount"),status("payment",rs.getString("payment_status")),status("delivery",rs.getString("delivery_status")));}catch(IOException e){throw new UncheckedIOException(e);}
            });workbook.complete();
        }catch(UncheckedIOException e){throw e.getCause();}
    }
}
