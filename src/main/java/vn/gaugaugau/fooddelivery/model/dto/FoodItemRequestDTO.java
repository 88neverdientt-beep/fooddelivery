package vn.gaugaugau.fooddelivery.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class FoodItemRequestDTO {

    @NotBlank(message = "Name cannot be blank")
    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;

    @Size(max = 150, message = "Category must not exceed 150 characters")
    private String category;

    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;

}
