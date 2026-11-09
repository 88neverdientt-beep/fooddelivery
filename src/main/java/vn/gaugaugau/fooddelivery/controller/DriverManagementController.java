package vn.gaugaugau.fooddelivery.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import vn.gaugaugau.fooddelivery.service.DriverManagementService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequestMapping("/driver-management")
@RequiredArgsConstructor
public class DriverManagementController {
    private final DriverManagementService service;
    @GetMapping("/deliveries")
    public ResponseEntity<?> deliveries(@RequestParam(defaultValue="") String q,
            @RequestParam(required=false) DeliveryStatus status, @RequestParam(defaultValue="active") String scope,
            @RequestParam(defaultValue="newest") String sort, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="12") int size) {
        return ApiResponse.success(service.deliveries(q, status, scope, sort, page, size));
    }
    @GetMapping("/deliveries/{deliveryId}")
    public ResponseEntity<?> detail(@PathVariable Long deliveryId) { return ApiResponse.success(service.detail(deliveryId)); }
    @GetMapping("/available")
    public ResponseEntity<?> available(@RequestParam(defaultValue="") String q,
            @RequestParam(defaultValue="newest") String sort, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="12") int size) {
        return ApiResponse.success(service.available(q, sort, page, size));
    }
    @GetMapping("/analytics")
    public ResponseEntity<?> analytics(@RequestParam(required=false) String from, @RequestParam(required=false) String to) {
        return ApiResponse.success(service.analytics(from, to));
    }
}
