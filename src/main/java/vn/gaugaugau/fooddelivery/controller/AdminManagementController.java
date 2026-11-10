package vn.gaugaugau.fooddelivery.controller;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.gaugaugau.fooddelivery.service.AdminManagementService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController @RequestMapping("/admin-management") @RequiredArgsConstructor
public class AdminManagementController {
    private final AdminManagementService service;
    @GetMapping("/accounts") public ResponseEntity<?> accounts(@RequestParam Map<String,String> query){return ApiResponse.success(service.accounts(query));}
    @GetMapping("/accounts/{accountId}") public ResponseEntity<?> account(@PathVariable Long accountId){return ApiResponse.success(service.account(accountId));}
    @GetMapping("/customers") public ResponseEntity<?> customers(@RequestParam Map<String,String> query){return ApiResponse.success(service.customers(query));}
    @GetMapping("/restaurants") public ResponseEntity<?> restaurants(@RequestParam Map<String,String> query){return ApiResponse.success(service.restaurants(query));}
    @GetMapping("/restaurants/{restaurantId}") public ResponseEntity<?> restaurant(@PathVariable Long restaurantId){return ApiResponse.success(service.restaurant(restaurantId));}
    @GetMapping("/drivers") public ResponseEntity<?> drivers(@RequestParam Map<String,String> query){return ApiResponse.success(service.drivers(query));}
    @GetMapping("/orders") public ResponseEntity<?> orders(@RequestParam Map<String,String> query){return ApiResponse.success(service.orders(query));}
    @GetMapping("/deliveries") public ResponseEntity<?> deliveries(@RequestParam Map<String,String> query){return ApiResponse.success(service.deliveries(query));}
    @GetMapping("/deliveries/{deliveryId}") public ResponseEntity<?> delivery(@PathVariable Long deliveryId){return ApiResponse.success(service.delivery(deliveryId));}
    @GetMapping("/payments") public ResponseEntity<?> payments(@RequestParam Map<String,String> query){return ApiResponse.success(service.payments(query));}
    @GetMapping("/reviews") public ResponseEntity<?> reviews(@RequestParam Map<String,String> query){return ApiResponse.success(service.reviews(query));}
    @GetMapping("/analytics") public ResponseEntity<?> analytics(@RequestParam Map<String,String> query){return ApiResponse.success(service.analytics(query));}
}
