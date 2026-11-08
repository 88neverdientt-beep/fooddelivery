package vn.gaugaugau.fooddelivery.auth.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import vn.gaugaugau.fooddelivery.auth.EmailAddress;
import vn.gaugaugau.fooddelivery.model.Customer;
import vn.gaugaugau.fooddelivery.model.Restaurant;
import vn.gaugaugau.fooddelivery.model.Driver;

@Entity
@Table(name="accounts", uniqueConstraints={
    @UniqueConstraint(name="uq_accounts_email",columnNames="email"),
    @UniqueConstraint(name="uq_accounts_customer",columnNames="customer_id"),
    @UniqueConstraint(name="uq_accounts_restaurant",columnNames="restaurant_id"),
    @UniqueConstraint(name="uq_accounts_driver",columnNames="driver_id")})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Account {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    @Column(name="account_id") private Long accountId;
    @Column(nullable=false,length=255) private String email;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name="password_hash",nullable=false,length=255) private String passwordHash;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable=false,length=20) private Role role;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable=false,length=20) @Builder.Default private AccountStatus status=AccountStatus.ACTIVE;
    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="customer_id",unique=true) private Customer customer;
    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="restaurant_id",unique=true) private Restaurant restaurant;
    @OneToOne(fetch=FetchType.LAZY) @JoinColumn(name="driver_id",unique=true) private Driver driver;
    @CreationTimestamp @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @Column(name="password_changed_at") private LocalDateTime passwordChangedAt;

    @PrePersist @PreUpdate
    public void validate() {
        email=EmailAddress.normalize(email);
        if (passwordHash == null || !passwordHash.matches("^\\$2[aby]\\$(0[4-9]|[12][0-9]|3[01])\\$[./A-Za-z0-9]{53}$"))
            throw new IllegalArgumentException("A valid BCrypt hash is required");
        if (role == null || status == null) throw new IllegalArgumentException("Role and status are required");
        boolean valid=switch(role) {
            case CUSTOMER -> customer!=null && restaurant==null && driver==null;
            case RESTAURANT -> restaurant!=null && customer==null && driver==null;
            case DRIVER -> driver!=null && customer==null && restaurant==null;
            case ADMIN -> customer==null && restaurant==null && driver==null;
        };
        if (!valid) throw new IllegalArgumentException("Account role does not match its profile");
    }
}
