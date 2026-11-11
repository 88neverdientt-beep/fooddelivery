package vn.gaugaugau.fooddelivery.auth.dto;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import vn.gaugaugau.fooddelivery.auth.model.*;
public final class AuthDtos {
    private AuthDtos(){}
    public record Login(@NotBlank @Size(max=255) String email,@NotBlank String password) {
        @JsonAnySetter public void unknown(String key,Object value){throw new IllegalArgumentException("Unexpected request field");}
        public String toString(){return "Login[redacted]";}
    }
    public record ChangePassword(@NotBlank String currentPassword,@NotBlank String newPassword) {
        @JsonAnySetter public void unknown(String key,Object value){throw new IllegalArgumentException("Unexpected request field");}
        public String toString(){return "ChangePassword[redacted]";}
    }
    public record Status(@NotNull AccountStatus status, AccountStatus expectedStatus, @PositiveOrZero Long expectedVersion) {
        public Status(AccountStatus status){this(status,null,null);}
        public Status(AccountStatus status,AccountStatus expectedStatus){this(status,expectedStatus,null);}
        @JsonAnySetter public void unknown(String key,Object value){throw new IllegalArgumentException("Unexpected request field");}
    }
    public record Me(Long accountId,String email,Role role,AccountStatus status,Long customerId,Long restaurantId,Long driverId){}
    public record Tokens(String accessToken,String tokenType,long expiresIn,Me account) {public String toString(){return "Tokens[redacted]";}}
    public record Issued(Tokens response,String refreshToken,long refreshExpiresIn) {public String toString(){return "Issued[redacted]";}}
}
