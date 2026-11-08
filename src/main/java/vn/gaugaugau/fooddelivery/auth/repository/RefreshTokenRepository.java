package vn.gaugaugau.fooddelivery.auth.repository;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import vn.gaugaugau.fooddelivery.auth.model.RefreshToken;
public interface RefreshTokenRepository extends JpaRepository<RefreshToken,Long> {
    Optional<RefreshToken> findByTokenHash(byte[] tokenHash);
    @Query("select t.session.sessionId from RefreshToken t where t.tokenHash=:hash")
    Optional<String> findSessionId(@Param("hash") byte[] hash);

    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from RefreshToken t where t.tokenHash=:hash")
    Optional<RefreshToken> findLockedByTokenHash(@Param("hash") byte[] hash);
}
