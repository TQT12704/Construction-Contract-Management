// src/main/java/com/tqt/detaithuctap/dto/contract/ContractResponse.java
package com.tqt.detaithuctap.dto.contract;

import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.ContractType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ContractResponse(
        Long id,
        String contractCode,
        String title,
        ContractType contractType,

        Long customerId,
        String customerName,

        Long salesId,
        String salesName,

        Long accountantId,
        String accountantName,

        LocalDate signedDate,
        LocalDate dueDate,

        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal remainingAmount,

        ContractStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
