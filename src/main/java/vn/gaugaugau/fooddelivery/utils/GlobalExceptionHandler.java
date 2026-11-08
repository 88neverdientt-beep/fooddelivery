package vn.gaugaugau.fooddelivery.utils;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityNotFoundException;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceAlreadyExistsException;
import vn.gaugaugau.fooddelivery.utils.exception.ResourceNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<?> authentication(Exception e){return ApiResponse.error(HttpStatus.UNAUTHORIZED,"Authentication failed");}
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<?> authorization(Exception e){return ApiResponse.error(HttpStatus.FORBIDDEN,"Forbidden");}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<?> handleAllException(Exception e) {
		return ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred");
	}

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<?> handleStatusException(ResponseStatusException e) {
		return ApiResponse.error(HttpStatus.valueOf(e.getStatusCode().value()), e.getReason());
	}

	@ExceptionHandler(EntityNotFoundException.class)
	public ResponseEntity<?> handleNotFound(EntityNotFoundException e) {
		return ApiResponse.error(HttpStatus.NOT_FOUND, "Resource not found");
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<?> handleNotFoundOrAlreadyExists(Exception e) {
		return ApiResponse.error(HttpStatus.NOT_FOUND, e.getMessage());
	}

    @ExceptionHandler(ResourceAlreadyExistsException.class)
    public ResponseEntity<?> handleConflict(ResourceAlreadyExistsException e) {
        return ApiResponse.error(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler({org.springframework.dao.DataIntegrityViolationException.class,
        org.springframework.dao.ConcurrencyFailureException.class})
    public ResponseEntity<?> handleDataConflict(Exception e) {
        return ApiResponse.error(HttpStatus.CONFLICT, "Data changed or violates a constraint");
    }

    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
        jakarta.validation.ConstraintViolationException.class,
        org.springframework.web.method.annotation.HandlerMethodValidationException.class,
        vn.gaugaugau.fooddelivery.utils.exception.BadRequestException.class})
    public ResponseEntity<?> handleInvalidInput(Exception e) {
        return ApiResponse.error(HttpStatus.BAD_REQUEST, "Invalid request data");
    }

	// todo: xử lý invalid input
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<?> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		String errorMessage = "Invalid format for parameter: " + ex.getName();
		return ApiResponse.error(HttpStatus.BAD_REQUEST, errorMessage);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiResponse<Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
		List<String> errorList = ex.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + ": " + error.getDefaultMessage()).collect(Collectors.toList());
		String errors = String.join("; ", errorList);

		ApiResponse<Object> response = new ApiResponse<>(HttpStatus.BAD_REQUEST, errors, null, "VALIDATION_ERROR");
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
	}
}
