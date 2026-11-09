package vn.gaugaugau.fooddelivery.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.gaugaugau.fooddelivery.auth.security.CurrentActor;
import vn.gaugaugau.fooddelivery.model.dto.AvailableDelivery;
import vn.gaugaugau.fooddelivery.model.dto.DriverManagementDtos.*;
import vn.gaugaugau.fooddelivery.model.dto.PageResponse;
import vn.gaugaugau.fooddelivery.model.enums.DeliveryStatus;
import vn.gaugaugau.fooddelivery.model.enums.OrderStatus;
import vn.gaugaugau.fooddelivery.repository.OrderRepository;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

/** Principal-scoped read projections. No lifecycle or assignment writers. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@PreAuthorize("hasRole('DRIVER')")
public class DriverManagementService {
    private final JdbcTemplate jdbc;
    private final OrderRepository orders;
    private final OrderService mapper;
    private Long own() { return CurrentActor.get().driverId(); }
    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
    private static String ordering(String sort) {
        return switch (sort) {
            case "newest" -> "d.delivery_id DESC";
            case "oldest" -> "d.delivery_id ASC";
            default -> throw bad("Unsupported delivery sort");
        };
    }
    private static LocalDate date(String input) {
        if (input == null || input.isBlank()) return null;
        try {
            LocalDate date = LocalDate.parse(input);
            if (date.getYear() < 1 || date.getYear() > 9998) throw bad("Unsupported date");
            return date;
        } catch (java.time.format.DateTimeParseException exception) { throw bad("Invalid ISO date"); }
    }
    private static LocalDateTime timestamp(ResultSet rs, String field) throws SQLException {
        var value = rs.getTimestamp(field);
        return value == null ? null : value.toLocalDateTime();
    }
    private static Pickup pickup(ResultSet rs) throws SQLException {
        return new Pickup(rs.getLong("restaurant_id"), rs.getString("name"), rs.getString("address"));
    }
    private static final String JOINS = " FROM deliveries d JOIN orders o ON o.order_id=d.order_id JOIN restaurants r ON r.restaurant_id=o.restaurant_id ";
    private <T> PageResponse<T> page(List<T> items, int page, int size, long count) {
        return new PageResponse<>(items, page, size, count, (int)((count + size - 1) / size));
    }

    public PageResponse<AssignedDelivery> deliveries(String q, DeliveryStatus status, String scope,
            String sort, int page, int size) {
        ReadQuery.page(page, size, Sort.unsorted());
        String order = ordering(sort), pattern = ReadQuery.literalPattern(q);
        String where = JOINS + " WHERE d.driver_id=? AND (CAST(d.delivery_id AS CHAR) LIKE ? ESCAPE '!' OR CAST(o.order_id AS CHAR) LIKE ? ESCAPE '!' OR LOWER(r.name) LIKE ? ESCAPE '!')";
        var args = new ArrayList<Object>(List.of(own(), pattern, pattern, pattern));
        where += switch (scope) {
            case "active" -> " AND d.delivery_status IN ('PENDING','PICKED_UP','DELIVERING')";
            case "history" -> " AND d.delivery_status IN ('DELIVERED','CANCELLED')";
            case "all" -> "";
            default -> throw bad("Unsupported delivery scope");
        };
        if (status != null) { where += " AND d.delivery_status=?"; args.add(status.name()); }
        long total = jdbc.queryForObject("SELECT COUNT(*)" + where, Long.class, args.toArray());
        args.add(size); args.add((long)page * size);
        var items = jdbc.query("""
            SELECT d.delivery_id,d.driver_id,d.delivery_status,d.pickup_time,d.delivered_time,
                   o.order_id,o.order_status,o.created_at,o.delivery_address,o.total_amount,
                   r.restaurant_id,r.name,r.address,
                   (SELECT m.method_code FROM payments p JOIN payment_methods m ON m.method_id=p.payment_method_id WHERE p.order_id=o.order_id) AS method_code,
                   (SELECT p.payment_status FROM payments p WHERE p.order_id=o.order_id) AS payment_status
            """ + where + " ORDER BY " + order + " LIMIT ? OFFSET ?", (rs, n) ->
            new AssignedDelivery(rs.getLong("delivery_id"), rs.getLong("order_id"), rs.getLong("driver_id"),
                DeliveryStatus.valueOf(rs.getString("delivery_status")), OrderStatus.valueOf(rs.getString("order_status")),
                timestamp(rs, "created_at"), timestamp(rs, "pickup_time"), timestamp(rs, "delivered_time"), pickup(rs),
                rs.getString("delivery_address"), rs.getBigDecimal("total_amount"), rs.getString("method_code"), rs.getString("payment_status")), args.toArray());
        return page(items, page, size, total);
    }

    public Detail detail(Long id) {
        if (id == null || id <= 0) throw bad("Positive delivery ID required");
        var rows = jdbc.query("SELECT d.delivery_id,d.driver_id,d.delivery_status,d.pickup_time,d.delivered_time,o.order_id,r.restaurant_id,r.name,r.address" + JOINS + " WHERE d.delivery_id=? AND d.driver_id=?",
            (rs, n) -> new Object[]{rs.getLong("order_id"), DeliveryStatus.valueOf(rs.getString("delivery_status")),
                timestamp(rs, "pickup_time"), timestamp(rs, "delivered_time"), pickup(rs)}, id, own());
        if (rows.isEmpty()) throw new ResourceNotFoundException("Delivery not found");
        Object[] row = rows.getFirst();
        var order = orders.findPageDetails(List.of((Long)row[0])).stream().findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return new Detail(id, own(), (DeliveryStatus)row[1], (LocalDateTime)row[2], (LocalDateTime)row[3],
            (Pickup)row[4], mapper.convertToOrderResponseDTO(order));
    }

    @PreAuthorize("@access.activeDriver(@currentDriver.id())")
    public PageResponse<AvailableDelivery> available(String q, String sort, int page, int size) {
        ReadQuery.page(page, size, Sort.unsorted());
        String order = ordering(sort), pattern = ReadQuery.literalPattern(q);
        String where = JOINS + " WHERE d.driver_id IS NULL AND d.delivery_status='PENDING' AND o.order_status IN ('CONFIRMED','PREPARING','READY') AND (CAST(d.delivery_id AS CHAR) LIKE ? ESCAPE '!' OR CAST(o.order_id AS CHAR) LIKE ? ESCAPE '!' OR LOWER(r.name) LIKE ? ESCAPE '!')";
        long total = jdbc.queryForObject("SELECT COUNT(*)" + where, Long.class, pattern, pattern, pattern);
        var items = jdbc.query("SELECT d.delivery_id,o.order_id,r.restaurant_id,r.name,r.address" + where + " ORDER BY " + order + " LIMIT ? OFFSET ?",
            (rs, n) -> new AvailableDelivery(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getString(4), rs.getString(5)),
            pattern, pattern, pattern, size, (long)page * size);
        return page(items, page, size, total);
    }

    public Analytics analytics(String from, String to) {
        LocalDate end = date(to); if (end == null) end = LocalDate.now();
        LocalDate start = date(from); if (start == null) start = end.minusDays(29);
        if (end.isBefore(start) || ChronoUnit.DAYS.between(start, end) >= 93) throw bad("Range must be 1..93 days");
        var states = new LinkedHashMap<String, Long>();
        for (var state : DeliveryStatus.values()) states.put(state.name(), 0L);
        jdbc.query("SELECT delivery_status,COUNT(*) FROM deliveries WHERE driver_id=? GROUP BY delivery_status",
            rs -> { states.put(rs.getString(1), rs.getLong(2)); }, own());
        long total = states.values().stream().mapToLong(Long::longValue).sum();
        long active = states.get("PENDING") + states.get("PICKED_UP") + states.get("DELIVERING");
        Object[] period = {own(), start.atStartOfDay(), end.plusDays(1).atStartOfDay()};
        String completed = " FROM deliveries WHERE driver_id=? AND delivery_status='DELIVERED' AND delivered_time>=? AND delivered_time<?";
        String pickedUp = " FROM deliveries WHERE driver_id=? AND pickup_time>=? AND pickup_time<?";
        long completeCount = jdbc.queryForObject("SELECT COUNT(*)" + completed, Long.class, period);
        long pickupCount = jdbc.queryForObject("SELECT COUNT(*)" + pickedUp, Long.class, period);
        Double average = jdbc.queryForObject("SELECT AVG(TIMESTAMPDIFF(SECOND,pickup_time,delivered_time)/60.0)" + completed + " AND pickup_time IS NOT NULL AND delivered_time>=pickup_time", Double.class, period);
        var completeDays = jdbc.query("SELECT DATE(delivered_time),COUNT(*)" + completed + " GROUP BY DATE(delivered_time) ORDER BY DATE(delivered_time)",
            (rs, n) -> new DayCount(rs.getDate(1).toLocalDate(), rs.getLong(2)), period);
        var pickupDays = jdbc.query("SELECT DATE(pickup_time),COUNT(*)" + pickedUp + " GROUP BY DATE(pickup_time) ORDER BY DATE(pickup_time)",
            (rs, n) -> new DayCount(rs.getDate(1).toLocalDate(), rs.getLong(2)), period);
        return new Analytics(start, end, total, active, states, completeCount, pickupCount, completeDays, pickupDays, average);
    }
}
