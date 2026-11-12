package vn.gaugaugau.fooddelivery.service;

import java.io.*;
import java.sql.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** MySQL forward-only streaming: never materializes the complete result list. */
@Service @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RestaurantExcelExportService {
    private final JdbcTemplate jdbc;
    @Transactional(readOnly=true)
    public void write(AdminManagementService.RestaurantExportQuery query,OutputStream output) throws IOException {
        try(var workbook=new RestaurantWorkbook(output)) {
            jdbc.query(connection->{
                var statement=connection.prepareStatement(query.sql(),ResultSet.TYPE_FORWARD_ONLY,ResultSet.CONCUR_READ_ONLY);
                // Connector/J row streaming, not its default fetch-all behavior.
                statement.setFetchSize(Integer.MIN_VALUE);
                for(int i=0;i<query.arguments().size();i++)statement.setObject(i+1,query.arguments().get(i));
                return statement;
            },(RowCallbackHandler)rs->{
                try {
                    Object activity=rs.getObject("restaurant_status");
                    var created=rs.getTimestamp("created_at");
                    workbook.row(rs.getString("restaurant_id"),rs.getString("name"),rs.getString("email"),
                        rs.getString("phone_number"),rs.getString("address"),
                        activity==null?"Chưa ghi nhận":rs.getBoolean("restaurant_status")?"Mở cửa":"Đóng cửa",
                        created==null?"Chưa ghi nhận":created.toLocalDateTime().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),
                        rs.getString("account_id"),switch(java.util.Objects.toString(rs.getString("status"),"")) {
                            case "ACTIVE"->"Đang hoạt động";case "DISABLED"->"Đã vô hiệu hóa";default->"Chưa liên kết";
                        });
                } catch(IOException error){throw new UncheckedIOException(error);}
            });
            workbook.complete();
        } catch(UncheckedIOException error){throw error.getCause();}
    }
}
