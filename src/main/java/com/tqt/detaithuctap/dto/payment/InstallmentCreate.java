package com.tqt.detaithuctap.dto.payment;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InstallmentCreate {
    private Integer installmentNo;  // 1..N
    private BigDecimal amount;      // dự kiến
    private String planDate;        // yyyy-MM-dd (optional)
    private String note;            // optional
}
