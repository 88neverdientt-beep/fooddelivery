package vn.gaugaugau.fooddelivery.service;

import static org.junit.jupiter.api.Assertions.*;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.model.dto.PageResponse;

class ReadQueryTest {
    @Test void paginationUsesStrictApprovedBounds() {
        assertEquals(50, ReadQuery.page(10000, 50, Sort.unsorted()).getPageSize());
        assertEquals(500000, ReadQuery.page(10000, 50, Sort.unsorted()).getOffset());
        for (int[] input : List.of(new int[]{-1, 12}, new int[]{10001, 12}, new int[]{0, 0}, new int[]{0, 51}))
            assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> ReadQuery.page(input[0], input[1], Sort.unsorted())).getStatusCode().value());
    }
    @Test void wildcardAndEscapeCharactersAreLiteral() {
        assertEquals("%100!%!_!! dish%", ReadQuery.literalPattern("  100%_! DISH  "));
        assertEquals("%%", ReadQuery.literalPattern(null));
        assertEquals("%phở%", ReadQuery.literalPattern("PHỞ"));
    }
    @Test void queryLengthsRespectActualCategoryColumn() {
        assertEquals(100, ReadQuery.label("q".repeat(100)).length());
        assertEquals(150, ReadQuery.category("c".repeat(150)).length());
        assertThrows(ResponseStatusException.class, () -> ReadQuery.label("q".repeat(101)));
        assertThrows(ResponseStatusException.class, () -> ReadQuery.category("c".repeat(151)));
    }
    @Test void sortPropertiesAreAllowlistedAndHaveStableIdTieBreaks() {
        assertEquals("name: DESC,restaurantId: ASC", ReadQuery.restaurantSort("name-desc").toString().replace(", ", ","));
        assertEquals("price: ASC,restaurantFoodItemId: ASC", ReadQuery.menuSort("price-asc").toString().replace(", ", ","));
        for (String value : List.of("", "email", "price desc", "random()")) {
            assertThrows(ResponseStatusException.class, () -> ReadQuery.restaurantSort(value));
            assertThrows(ResponseStatusException.class, () -> ReadQuery.menuSort(value));
        }
    }
    @Test void pageResponsePreservesMetadataWithoutFrameworkInternals() {
        var source = new PageImpl<>(List.of(1, 2), ReadQuery.page(1, 2, Sort.unsorted()), 7);
        var result = PageResponse.from(source, List.of("one", "two"));
        assertEquals(List.of("one", "two"), result.items());
        assertEquals(1, result.page()); assertEquals(2, result.size());
        assertEquals(7, result.totalElements()); assertEquals(4, result.totalPages());
    }
    @Test void pageItemsAreCopiedAndImmutable() {
        var input = new ArrayList<>(List.of("original"));
        var result = new PageResponse<>(input, 0, 12, 1, 1);
        input.clear(); assertEquals(List.of("original"), result.items());
        assertThrows(UnsupportedOperationException.class, () -> result.items().clear());
    }
}
