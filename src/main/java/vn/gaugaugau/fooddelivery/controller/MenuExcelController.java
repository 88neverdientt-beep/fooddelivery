package vn.gaugaugau.fooddelivery.controller;

import java.io.IOException;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import vn.gaugaugau.fooddelivery.service.MenuExcelExportService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController @RequiredArgsConstructor @PreAuthorize("hasRole('RESTAURANT')")
public class MenuExcelController {
    private final MenuExcelExportService service;
    @GetMapping("/restaurant-management/menu/by-food/{foodItemId}")
    public ResponseEntity<?> ownByFood(@PathVariable Long foodItemId){return ApiResponse.success(service.ownByFood(foodItemId));}
    @GetMapping("/restaurant-management/menu/export.xlsx")
    public void export(@RequestParam Map<String,String> parameters,HttpServletResponse response)throws IOException {
        var query=service.prepare(parameters);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition","attachment; filename=\"DanhSachMonAn.xlsx\"");response.setHeader("Cache-Control","no-store");response.setHeader("X-Content-Type-Options","nosniff");
        service.write(query,response.getOutputStream());
    }
}
