package vn.gaugaugau.fooddelivery.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.dto.DriverRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.DriverResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.DriverUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.service.DriverService;
import vn.gaugaugau.fooddelivery.utils.ApiResponse;

@RestController
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping("/drivers")
    public ResponseEntity<ApiResponse<DriverResponseDTO>> createDriver(
            @Valid @RequestBody DriverRequestDTO request) {
        DriverResponseDTO response = this.driverService.createDriver(request);
        return ApiResponse.created(response);
    }

    @GetMapping("/drivers")
    public ResponseEntity<ApiResponse<List<DriverResponseDTO>>> getAllDrivers() {
        List<DriverResponseDTO> response = this.driverService.getAllDrivers();
        return ApiResponse.success(response);
    }

    @GetMapping("/drivers/{driverId}")
    public ResponseEntity<ApiResponse<DriverResponseDTO>> getDriverById(@PathVariable Long driverId) {
        DriverResponseDTO response = this.driverService.getDriverById(driverId);
        return ApiResponse.success(response);
    }

    @PutMapping("/drivers/{driverId}")
    public ResponseEntity<ApiResponse<DriverResponseDTO>> updateDriverById(@PathVariable Long driverId,
            @Valid @RequestBody DriverUpdateRequestDTO request) {
        DriverResponseDTO response = this.driverService.updateDriverById(driverId, request);
        return ApiResponse.success(response);
    }

    @DeleteMapping("/drivers/{driverId}")
    public ResponseEntity<ApiResponse<String>> deleteDriverById(@PathVariable Long driverId) {
        this.driverService.deleteDriverById(driverId);
        return ApiResponse.success("delete succesful");
    }
}
