// src/main/java/com/tqt/detaithuctap/dto/payment/PaymentResponse.java
package com.tqt.detaithuctap.dto.payment;

import com.tqt.detaithuctap.entity.enums.PaymentMethod;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentResponse(
        Long id,
        Long contractId,
        BigDecimal amount,
        PaymentStatus status,
        LocalDate paymentDate,
        LocalDate planDate,
        PaymentMethod method,
        String note,
        Long confirmedById,
        String confirmedByName
) {}
