package vn.gaugaugau.fooddelivery.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "food_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "category", length = 150)
    private String category;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "is_available")
    private Boolean isAvailable;

    @ManyToMany(mappedBy = "foodItems", fetch = FetchType.LAZY)
    private List<Restaurant> restaurants;

    @OneToMany(mappedBy = "foodItem")
    private List<OrderDetail> orderDetails;

    @OneToMany(mappedBy = "foodItem")
    private List<Rating> ratings;
}
