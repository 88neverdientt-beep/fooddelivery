package vn.gaugaugau.fooddelivery.auth.repository;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import vn.gaugaugau.fooddelivery.auth.model.Account;
public interface AccountRepository extends JpaRepository<Account,Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from Account a where a.role=vn.gaugaugau.fooddelivery.auth.model.Role.ADMIN order by a.accountId")
    java.util.List<Account> findAdministratorsLocked();
    Optional<Account> findByEmail(String normalizedEmail);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from Account a where a.email=:email")
    Optional<Account> findLockedByEmail(@Param("email") String email);
    @Query("select a from Account a left join a.customer c left join a.restaurant r left join a.driver d where a.role=:role and (:profile=c.customerId or :profile=r.restaurantId or :profile=d.driverId)")
    Optional<Account> findProfileAccount(@Param("role") vn.gaugaugau.fooddelivery.auth.model.Role role,@Param("profile") Long profile);

    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from Account a where a.accountId=:id")
    Optional<Account> findLockedById(@Param("id") Long id);
}
