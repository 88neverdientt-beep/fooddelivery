package vn.gaugaugau.fooddelivery.auth;

import java.util.Locale;
import java.util.regex.Pattern;

public final class EmailAddress {
    private static final Pattern SUPPORTED = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private EmailAddress() {}
    // Conservative ASCII policy shared by migration and future registration.
    public static String normalize(String value) {
        if (value == null) throw new IllegalArgumentException("Email is required");
        String trimmed = value.replaceAll("^ +| +$", "");
        if (!SUPPORTED.matcher(trimmed).matches()) throw new IllegalArgumentException("Unsupported email format");
        String result = trimmed.toLowerCase(Locale.ROOT);
        if (result.length() > 255 || !SUPPORTED.matcher(result).matches())
            throw new IllegalArgumentException("Unsupported email format");
        return result;
    }
}
