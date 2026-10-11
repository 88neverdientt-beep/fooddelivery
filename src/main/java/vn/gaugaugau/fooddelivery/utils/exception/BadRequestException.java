package vn.gaugaugau.fooddelivery.utils.exception;

public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
