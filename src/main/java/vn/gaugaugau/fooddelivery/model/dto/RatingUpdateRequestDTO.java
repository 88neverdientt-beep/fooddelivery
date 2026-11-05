package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingUpdateRequestDTO {

	@NotNull(message = "Rating score cannot be null")
	@Min(value = 1, message = "Rating score must be at least 1")
	@Max(value = 5, message = "Rating score must not exceed 5")
	private Integer ratingScore;

	private String comment;
}
