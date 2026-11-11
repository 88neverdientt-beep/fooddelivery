package vn.gaugaugau.fooddelivery.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import vn.gaugaugau.fooddelivery.model.Restaurant;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Restaurant p where p.restaurantId=:id")
    java.util.Optional<Restaurant> findLockedById(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Query("""
        select r from Restaurant r
        where (:active is null or r.restaurantStatus = :active)
          and (lower(r.name) like :pattern escape '!' or lower(r.address) like :pattern escape '!')
        """)
    org.springframework.data.domain.Page<Restaurant> searchPublic(
        @org.springframework.data.repository.query.Param("pattern") String pattern,
        @org.springframework.data.repository.query.Param("active") Boolean active,
        org.springframework.data.domain.Pageable pageable);

	boolean existsByEmail(String email);

}
