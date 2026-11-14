package vn.gaugaugau.fooddelivery.service;

import java.io.*;
import java.sql.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.security.CurrentActor;
import vn.gaugaugau.fooddelivery.repository.RestaurantFoodItemRepository;
import vn.gaugaugau.fooddelivery.model.dto.RestaurantFoodItemResponseDTO;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
@PreAuthorize("hasRole('RESTAURANT')")
public class MenuExcelExportService {
    private final JdbcTemplate jdbc;
    private final RestaurantFoodItemRepository menus;
    private final RestaurantFoodItemService mapping;
    public static final String[] HEADERS={"Mã món thực đơn","Mã nội dung món","Tên món","Danh mục","Mô tả","Giá bán (VND)","Trạng thái"};
    public record Query(String sql,List<Object> arguments) {}
    public Query prepare(Map<String,String> parameters) {
        if(!Set.of("q","category","available","sort").containsAll(parameters.keySet()))bad("Tham số xuất thực đơn không hợp lệ");
        String sorting=parameters.getOrDefault("sort","name");ReadQuery.menuSort(sorting);
        String sort=switch(sorting){case "price-asc"->"m.price ASC,m.restaurant_food_item_id ASC";case "price-desc"->"m.price DESC,m.restaurant_food_item_id ASC";default->"f.name ASC,m.restaurant_food_item_id ASC";};
        String category=ReadQuery.category(parameters.get("category")),pattern=ReadQuery.literalPattern(parameters.get("q"));
        String where=" FROM restaurant_food_items m JOIN food_items f ON f.item_id=m.item_id WHERE m.restaurant_id=? AND (?='' OR LOWER(TRIM(f.category))=LOWER(?)) AND (LOWER(f.name) LIKE ? ESCAPE '!' OR LOWER(COALESCE(f.description,'')) LIKE ? ESCAPE '!')";
        var arguments=new ArrayList<Object>(List.of(CurrentActor.get().restaurantId(),category,category,pattern,pattern));
        String available=parameters.get("available");
        if(available!=null&&!available.isBlank()) {
            if(!Set.of("true","false").contains(available))bad("Trạng thái món không hợp lệ");
            where+=" AND m.is_available=?";arguments.add(Boolean.valueOf(available));
        }
        return new Query("SELECT m.restaurant_food_item_id,m.item_id,f.name,f.category,f.description,m.price,m.is_available"+where+" ORDER BY "+sort,List.copyOf(arguments));
    }
    public RestaurantFoodItemResponseDTO ownByFood(Long foodId) {
        if(foodId==null||foodId<=0)bad("Mã món phải là số nguyên dương");
        return mapping.convertToRestaurantFoodItemResponseDTO(menus.findOwnByFoodId(CurrentActor.get().restaurantId(),foodId).orElseThrow(()->new ResourceNotFoundException("Món chưa có trong thực đơn nhà hàng")));
    }
    public void write(Query query,OutputStream output)throws IOException {
        try(var workbook=new RestaurantWorkbook(output,HEADERS,"Thực đơn",5)) {
            jdbc.query(connection->{
                var statement=connection.prepareStatement(query.sql(),ResultSet.TYPE_FORWARD_ONLY,ResultSet.CONCUR_READ_ONLY);statement.setFetchSize(Integer.MIN_VALUE);
                for(int i=0;i<query.arguments().size();i++)statement.setObject(i+1,query.arguments().get(i));return statement;
            },(RowCallbackHandler)rs->{try {
                workbook.row(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getBigDecimal(6).toPlainString(),rs.getBoolean(7)?"Còn bán":"Ngừng bán");
            }catch(IOException error){throw new UncheckedIOException(error);}});
            workbook.complete();
        }catch(UncheckedIOException error){throw error.getCause();}
    }
    private static void bad(String message){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
}
