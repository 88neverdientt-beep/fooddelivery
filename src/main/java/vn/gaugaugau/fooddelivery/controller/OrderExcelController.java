package vn.gaugaugau.fooddelivery.controller;
import java.io.IOException;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.gaugaugau.fooddelivery.service.*;
@RestController @RequiredArgsConstructor
public class OrderExcelController {
    private final AdminManagementService admin;private final RestaurantManagementService restaurant;private final OrderExcelExportService excel;
    @GetMapping("/admin-management/orders/export.xlsx") @PreAuthorize("hasRole('ADMIN')")
    public void admin(@RequestParam Map<String,String> parameters,HttpServletResponse response)throws IOException {write(admin.orderExportQuery(parameters),response);}
    @GetMapping("/restaurant-management/orders/export.xlsx") @PreAuthorize("hasRole('RESTAURANT')")
    public void restaurant(@RequestParam Map<String,String> parameters,HttpServletResponse response)throws IOException {write(restaurant.orderExportQuery(parameters),response);}
    private void write(OrderExcelExportService.Query query,HttpServletResponse response)throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");response.setHeader("Content-Disposition","attachment; filename=\"DanhSachDonHang.xlsx\"");response.setHeader("Cache-Control","no-store");response.setHeader("X-Content-Type-Options","nosniff");excel.write(query,response.getOutputStream());
    }
}
