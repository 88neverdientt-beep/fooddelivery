package vn.gaugaugau.fooddelivery.controller;

import java.io.IOException;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import vn.gaugaugau.fooddelivery.service.*;

@RestController @RequiredArgsConstructor
public class RestaurantExcelController {
    private final AdminManagementService management;
    private final RestaurantExcelExportService export;
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin-management/restaurants/export.xlsx")
    public void download(@RequestParam Map<String,String> parameters,HttpServletResponse response)throws IOException {
        var query=management.restaurantExportQuery(parameters); // Validate before committing any bytes.
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition","attachment; filename=\"DanhSachNhaHang.xlsx\"");
        response.setHeader("Cache-Control","no-store");
        response.setHeader("X-Content-Type-Options","nosniff");
        export.write(query,response.getOutputStream());
    }
}
