package vn.gaugaugau.fooddelivery.auth.model;

import java.time.LocalDateTime;
import java.util.UUID;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="auth_sessions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthSession {
    @Id @Column(name="session_id",length=36,columnDefinition="char(36)") private String sessionId;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="account_id",nullable=false) private Account account;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @Column(name="expires_at",nullable=false) private LocalDateTime expiresAt;
    @Column(name="revoked_at") private LocalDateTime revokedAt;

    public boolean isActiveAt(LocalDateTime now) {
        return revokedAt==null && createdAt!=null && !now.isBefore(createdAt) && expiresAt!=null && now.isBefore(expiresAt);
    }
    @PrePersist @PreUpdate
    public void validate() {
        if (sessionId==null) sessionId=UUID.randomUUID().toString();
        if (!UUID.fromString(sessionId).toString().equals(sessionId)) throw new IllegalArgumentException("Invalid session ID");
        if (account==null || createdAt==null || expiresAt==null || !expiresAt.isAfter(createdAt))
            throw new IllegalArgumentException("Invalid session lifetime or account");
    }
}
