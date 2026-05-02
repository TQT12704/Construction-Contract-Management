// src/main/java/com/tqt/detaithuctap/dto/payment/PaymentCreateRequest.java
package com.tqt.detaithuctap.dto.payment;

import com.tqt.detaithuctap.entity.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentCreateRequest(
        @NotNull
        @DecimalMin(value = "0.01", message = "Amount must be > 0")
        BigDecimal amount,
        LocalDate planDate,
        PaymentMethod method,
        String note
) {}
