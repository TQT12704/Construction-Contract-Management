package com.tqt.detaithuctap.exception;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> badCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "UNAUTHORIZED", "message", "Invalid username or password"));
    }

    // 400 - Illegal argument
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error","BAD_REQUEST","message", ex.getMessage()));
    }

    // 404 - Not found
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error","NOT_FOUND","message", ex.getMessage()));
    }

    // 409 - Illegal state / conflict
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error","CONFLICT","message", ex.getMessage()));
    }

    // 400 - Validation (body @Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgNotValid(MethodArgumentNotValidException ex) {
        var field = ex.getBindingResult().getFieldError();
        String msg = (field != null) ? field.getField() + " " + field.getDefaultMessage() : "Validation error";
        return ResponseEntity.badRequest().body(Map.of("error","VALIDATION_ERROR","message", msg));
    }

    // 400 - Validation (query/path @Validated) - tuỳ chọn, hữu ích
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        String msg = ex.getConstraintViolations().stream().findFirst()
                .map(v -> v.getPropertyPath() + " " + v.getMessage())
                .orElse("Validation error");
        return ResponseEntity.badRequest().body(Map.of("error","VALIDATION_ERROR","message", msg));
    }

    // 400 - Validation (form/model binding) - tuỳ chọn
    @ExceptionHandler(BindException.class)
    public ResponseEntity<Map<String, Object>> handleBindException(BindException ex) {
        var fe = ex.getFieldError();
        String msg = (fe != null) ? fe.getField() + " " + fe.getDefaultMessage() : "Validation error";
        return ResponseEntity.badRequest().body(Map.of("error","VALIDATION_ERROR","message", msg));
    }
}
