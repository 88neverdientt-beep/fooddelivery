package vn.gaugaugau.fooddelivery.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Delivery;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select d from Delivery d where d.order.orderId = :orderId")
    java.util.Optional<Delivery> findLockedByOrderId(@org.springframework.data.repository.query.Param("orderId") Long orderId);
    @org.springframework.data.jpa.repository.Query("select d.order.orderId from Delivery d where d.deliveryId = :id")
    java.util.Optional<Long> findOrderId(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select d from Delivery d where d.deliveryId = :id")
    java.util.Optional<Delivery> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);


	List<Delivery> findByDeliveryStatusAndDriverIsNull(DeliveryStatus deliveryStatus);
}
