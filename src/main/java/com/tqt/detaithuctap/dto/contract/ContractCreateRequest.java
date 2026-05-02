package com.tqt.detaithuctap.dto.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.tqt.detaithuctap.entity.enums.ContractType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ContractCreateRequest(
        String contractCode,                 // FE đang gửi "Mã hợp đồng" -> nhận luôn
        @NotBlank String title,
        @NotNull ContractType contractType,
        @NotNull Long customerId,
        LocalDate signedDate,
        LocalDate dueDate,
        @NotNull @Positive BigDecimal totalAmount,
        Long salesId                         // optional
) {}
