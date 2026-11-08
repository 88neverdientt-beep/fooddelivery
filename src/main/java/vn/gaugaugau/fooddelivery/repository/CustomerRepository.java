package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Customer;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Customer e where e.customerId = :id")
    java.util.Optional<Customer> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

	boolean existsByEmail(String email);

}
