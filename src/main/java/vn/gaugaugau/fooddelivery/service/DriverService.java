package vn.gaugaugau.fooddelivery.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.gaugaugau.fooddelivery.model.Driver;
import vn.gaugaugau.fooddelivery.model.dto.DriverRequestDTO;
import vn.gaugaugau.fooddelivery.model.dto.DriverResponseDTO;
import vn.gaugaugau.fooddelivery.model.dto.DriverUpdateRequestDTO;
import vn.gaugaugau.fooddelivery.repository.DriverRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceAlreadyExistsException;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;
    private final PasswordEncoder passwordEncoder;

    private DriverResponseDTO driverToDriverResponseDTO(Driver driver) {
        DriverResponseDTO response = new DriverResponseDTO();
        response.setDriverId(driver.getDriverId());
        response.setName(driver.getName());
        response.setEmail(driver.getEmail());
        response.setPhoneNumber(driver.getPhoneNumber());
        response.setAddress(driver.getAddress());
        response.setLicensePlate(driver.getLicensePlate());
        response.setDriveStatus(driver.getDriveStatus());
        response.setCreatedAt(driver.getCreatedAt());
        return response;
    }

    public DriverResponseDTO createDriver(DriverRequestDTO request) {
        if (driverRepository.existsByEmail(request.getEmail())) {
            throw new ResourceAlreadyExistsException("Email already exists!");
        }
        Driver driver = new Driver();
        driver.setName(request.getName());
        driver.setEmail(request.getEmail());
        driver.setPassword(this.passwordEncoder.encode(request.getPassword()));
        driver.setPhoneNumber(request.getPhoneNumber());
        driver.setAddress(request.getAddress());
        driver.setLicensePlate(request.getLicensePlate());
        driver.setDriveStatus(request.getDriveStatus() != null ? request.getDriveStatus() : Boolean.TRUE);
        driver.setCreatedAt(LocalDateTime.now());

        Driver savedDriver = driverRepository.save(driver);
        return driverToDriverResponseDTO(savedDriver);
    }

    public List<DriverResponseDTO> getAllDrivers() {
        List<DriverResponseDTO> drivers = this.driverRepository.findAll().stream()
                .map(driver -> driverToDriverResponseDTO(driver))
                .collect(Collectors.toList());
        return drivers;
    }

    public DriverResponseDTO getDriverById(Long driverId) {
        Driver driver = driverRepository.findById(driverId).orElse(null);
        if (driver == null) {
            throw new ResourceNotFoundException("Driver not found with ID: " + driverId);
        }
        return driverToDriverResponseDTO(driver);
    }

    public DriverResponseDTO updateDriverById(Long driverId, DriverUpdateRequestDTO request) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with ID: " + driverId));

        driver.setName(request.getName());
        driver.setPhoneNumber(request.getPhoneNumber());
        driver.setAddress(request.getAddress());
        if (request.getLicensePlate() != null) {
            driver.setLicensePlate(request.getLicensePlate());
        }
        if (request.getDriveStatus() != null) {
            driver.setDriveStatus(request.getDriveStatus());
        }

        Driver updatedDriver = driverRepository.save(driver);
        return driverToDriverResponseDTO(updatedDriver);
    }

    public DriverResponseDTO deleteDriverById(Long driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with ID: " + driverId));
        this.driverRepository.delete(driver);
        return driverToDriverResponseDTO(driver);
    }
}
