package vn.gaugaugau.fooddelivery.auth.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="refresh_tokens",uniqueConstraints=@UniqueConstraint(name="uq_refresh_hash",columnNames="token_hash"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RefreshToken {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="refresh_token_id") private Long refreshTokenId;
    @ManyToOne(fetch=FetchType.LAZY,optional=false)
    @JoinColumn(name="session_id",nullable=false,columnDefinition="char(36)") private AuthSession session;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name="token_hash",nullable=false,length=32,columnDefinition="binary(32)") private byte[] tokenHash;
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @Column(name="expires_at",nullable=false) private LocalDateTime expiresAt;
    @Column(name="used_at") private LocalDateTime usedAt;
    @PrePersist @PreUpdate
    public void validate() {
        if (session==null || tokenHash==null || tokenHash.length!=32 || createdAt==null
            || expiresAt==null || !expiresAt.isAfter(createdAt)
            || session.getExpiresAt()==null || expiresAt.isAfter(session.getExpiresAt()))
            throw new IllegalArgumentException("Invalid refresh token hash or lifetime");
    }
}
