package vn.gaugaugau.fooddelivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Delivery;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

	List<Delivery> findByDeliveryStatusAndDriverIsNull(DeliveryStatus deliveryStatus);
}
