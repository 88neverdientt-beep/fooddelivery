package vn.gaugaugau.fooddelivery.model.dto;

import java.util.List;
import org.springframework.data.domain.Page;

/** Stable API envelope; never exposes JPA entities or framework pagination internals. */
public record PageResponse<T>(List<T> items, int page, int size, long totalElements, int totalPages) {
    public PageResponse { items = List.copyOf(items); }
    public static <T, S> PageResponse<T> from(Page<S> source, List<T> items) {
        return new PageResponse<>(items, source.getNumber(), source.getSize(), source.getTotalElements(), source.getTotalPages());
    }
}
