package vn.gaugaugau.fooddelivery.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import vn.gaugaugau.fooddelivery.service.RestaurantManagementService;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController @RequestMapping("/restaurant-management") @RequiredArgsConstructor
public class RestaurantManagementController {
    private final RestaurantManagementService service;
    @GetMapping("/profile") public ResponseEntity<?> profile(){return ApiResponse.success(service.profile());}
    @GetMapping("/catalog") public ResponseEntity<?> retiredCatalog(){throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.GONE,"Catalog đã ngừng sử dụng; tạo món trực tiếp trong thực đơn riêng");}
    @GetMapping("/orders") public ResponseEntity<?> orders(@RequestParam(defaultValue="")String q,@RequestParam(required=false)OrderStatus status,@RequestParam(required=false)String from,@RequestParam(required=false)String to,@RequestParam(defaultValue="newest")String sort,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="12")int size){return ApiResponse.success(service.orders(q,status,from,to,sort,page,size));}
    @GetMapping("/analytics") public ResponseEntity<?> analytics(@RequestParam(required=false)String from,@RequestParam(required=false)String to){return ApiResponse.success(service.analytics(from,to));}
}
