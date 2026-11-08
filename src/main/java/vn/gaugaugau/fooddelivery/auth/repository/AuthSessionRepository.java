package vn.gaugaugau.fooddelivery.auth.repository;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import vn.gaugaugau.fooddelivery.auth.model.AuthSession;
public interface AuthSessionRepository extends JpaRepository<AuthSession,String> {
    @Query("select s from AuthSession s join fetch s.account where s.sessionId=:id")
    Optional<AuthSession> findWithAccount(@Param("id") String id);
    @Query("select s.account.accountId from AuthSession s where s.sessionId=:id")
    Optional<Long> findAccountId(@Param("id") String id);
    java.util.List<AuthSession> findByAccount_AccountId(Long accountId);

    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from AuthSession s where s.sessionId=:id")
    Optional<AuthSession> findLockedById(@Param("id") String id);
}
