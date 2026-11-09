package vn.gaugaugau.fooddelivery.model.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class RestaurantManagementDtos {
    private RestaurantManagementDtos() {}
    public record Profile(Long restaurantId, String name, String address, String phoneNumber,
            Boolean restaurantStatus, LocalDateTime createdAt) {}
    public record CatalogItem(Long itemId, String name, String category, String description) {}
    public record DayCount(LocalDate date, long count) {}
    public record DayMoney(LocalDate date, BigDecimal amount) {}
    public record TopItem(Long restaurantFoodItemId, String name, long quantity, BigDecimal amount) {}
    public record Analytics(LocalDate from, LocalDate to, long totalOrders, Map<String,Long> states,
            long paidOrderCount, BigDecimal paidFoodValue, BigDecimal paidShipping,
            long activeMenuCount, long ratingsCount, Double averageRating,
            List<DayCount> ordersByDay, List<DayMoney> paidFoodByDay, List<TopItem> topItems) {}
}
