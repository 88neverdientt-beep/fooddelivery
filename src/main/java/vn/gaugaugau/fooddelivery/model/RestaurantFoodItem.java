package vn.gaugaugau.fooddelivery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "restaurant_food_items", uniqueConstraints = {
		@UniqueConstraint(columnNames = { "restaurant_id", "item_id" }),
        @UniqueConstraint(name="uq_menu_private_food", columnNames="item_id"),
        @UniqueConstraint(name="uq_menu_creation_key", columnNames="creation_key")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantFoodItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "restaurant_food_item_id")
	private Long restaurantFoodItemId;

    @jakarta.persistence.Version
    @Column(name="version", nullable=false)
    private Long version;

    @Column(name="creation_key", length=36)
    private String creationKey;

	@Column(name = "price", nullable = false, precision = 12, scale = 2)
	private BigDecimal price;

	@Column(name = "is_available", nullable = false)
	@Builder.Default
	private Boolean isAvailable = true;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "restaurant_id", nullable = false)
	private Restaurant restaurant;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "item_id", nullable = false)
	private FoodItem foodItem;

	@OneToMany(mappedBy = "restaurantFoodItem")
	private List<CartItem> cartItems;

	@OneToMany(mappedBy = "restaurantFoodItem")
	private List<OrderDetail> orderDetails;

}
