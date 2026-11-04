package vn.gaugaugau.fooddelivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Payment;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

}
