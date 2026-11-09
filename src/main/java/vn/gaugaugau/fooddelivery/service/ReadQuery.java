package vn.gaugaugau.fooddelivery.service;

import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Bounded, explicitly allowlisted query inputs for the additive customer read APIs. */
public final class ReadQuery {
    private ReadQuery() {}
    public static PageRequest page(int page, int size, Sort sort) {
        if (page < 0 || page > 10000 || size < 1 || size > 50)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be 0..10000 and size 1..50");
        return PageRequest.of(page, size, sort);
    }
    public static String label(String value) {
        return label(value, 100);
    }
    public static String category(String value) {
        return label(value, 150);
    }
    private static String label(String value, int maximum) {
        String clean = value == null ? "" : value.strip();
        if (clean.length() > maximum)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search or category is too long");
        return clean;
    }
    public static String literalPattern(String query) {
        return "%" + label(query).toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }
    public static Sort restaurantSort(String value) {
        return switch (value) {
            case "name" -> Sort.by("name").ascending().and(Sort.by("restaurantId"));
            case "name-desc" -> Sort.by("name").descending().and(Sort.by("restaurantId"));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported restaurant sort");
        };
    }
    public static Sort menuSort(String value) {
        return switch (value) {
            case "name" -> Sort.by("foodItem.name").ascending().and(Sort.by("restaurantFoodItemId"));
            case "price-asc" -> Sort.by("price").ascending().and(Sort.by("restaurantFoodItemId"));
            case "price-desc" -> Sort.by("price").descending().and(Sort.by("restaurantFoodItemId"));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported menu sort");
        };
    }
}
