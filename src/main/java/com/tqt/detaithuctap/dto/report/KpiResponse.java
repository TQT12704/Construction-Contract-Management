package com.tqt.detaithuctap.dto.report;

import lombok.Builder; import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data @Builder
public class KpiResponse {
    private long totalCustomers;
    private long totalContracts;
    private Map<String, Long> contractsByStatus; // PENDING/ACTIVE/COMPLETED/CANCELLED
    private BigDecimal totalContractValue;
    private BigDecimal totalPaid;
    private BigDecimal receivable; // totalContractValue - totalPaid
}
