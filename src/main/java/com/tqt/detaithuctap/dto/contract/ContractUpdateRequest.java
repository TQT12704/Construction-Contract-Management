package com.tqt.detaithuctap.dto.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.ContractType;
import java.math.BigDecimal;
import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ContractUpdateRequest(
        String title,
        ContractType contractType,
        LocalDate signedDate,
        LocalDate dueDate,
        BigDecimal totalAmount,
        ContractStatus status
) {}
