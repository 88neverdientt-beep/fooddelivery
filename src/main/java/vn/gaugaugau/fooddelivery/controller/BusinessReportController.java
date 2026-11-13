package vn.gaugaugau.fooddelivery.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.gaugaugau.fooddelivery.service.BusinessReportService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController @RequestMapping("/admin-management/reports") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class BusinessReportController {
    private final BusinessReportService reports;
    @GetMapping("/orders") public Object orders(@RequestParam Map<String,String> query){return ApiResponse.success(reports.read(false,query));}
    @GetMapping("/delivery") public Object delivery(@RequestParam Map<String,String> query){return ApiResponse.success(reports.read(true,query));}
    @GetMapping("/orders/export.xlsx") public void orderExport(@RequestParam Map<String,String> query,HttpServletResponse response)throws IOException {export(false,query,response);}
    @GetMapping("/delivery/export.xlsx") public void deliveryExport(@RequestParam Map<String,String> query,HttpServletResponse response)throws IOException {export(true,query,response);}
    private void export(boolean delivery,Map<String,String> query,HttpServletResponse response)throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");response.setHeader("Content-Disposition","attachment; filename=\""+(delivery?"BaoCaoHieuSuatGiaoHang_":"BaoCaoDoanhThuDonHang_")+LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)+".xlsx\"");response.setHeader("Cache-Control","no-store");response.setHeader("X-Content-Type-Options","nosniff");reports.export(delivery,query,response.getOutputStream());
    }
}
