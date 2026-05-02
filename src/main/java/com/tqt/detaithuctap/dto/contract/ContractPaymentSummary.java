package com.tqt.detaithuctap.dto.contract;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractPaymentSummary {
    private Long contractId;
    private Long installments;         // số đợt thanh toán (đếm record Payment)
    private BigDecimal plannedAmount;  // tổng dự kiến (sum amount của các đợt)
    private BigDecimal paidAmount;     // tổng đã thu (sum amount status=PAID)
}
