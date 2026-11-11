package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Driver;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Driver p where p.driverId=:id")
    java.util.Optional<Driver> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);
	boolean existsByEmail(String email);
}
