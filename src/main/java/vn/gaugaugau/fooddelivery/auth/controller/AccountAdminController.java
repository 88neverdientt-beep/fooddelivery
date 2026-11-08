package vn.gaugaugau.fooddelivery.auth.controller;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import vn.gaugaugau.fooddelivery.auth.service.AuthService;
import vn.gaugaugau.fooddelivery.auth.dto.AuthDtos.Status;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;
@RestController @RequestMapping("/admin/accounts") @RequiredArgsConstructor
public class AccountAdminController {
    private final AuthService auth;
    @GetMapping public ResponseEntity<?> list(){return ApiResponse.success(auth.listAccounts());}
    @PutMapping("/{id}/status") public ResponseEntity<?> status(@PathVariable Long id,@Valid @RequestBody Status status){return ApiResponse.success(auth.setStatus(id,status.status()));}
}
