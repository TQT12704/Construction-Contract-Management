package com.tqt.detaithuctap.dto.payment;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PaymentHistoryDTO {
    private Long id;
    private Long contractId;
    private Long paymentId;
    private String action;       // CREATED/UPDATED/MARK_PAID/DELETED
    private BigDecimal amountBefore;
    private BigDecimal amountAfter;
    private BigDecimal actualAmount;
    private String statusBefore;
    private String statusAfter;
    private String method;
    private String note;
    private Instant createdAt;
    private String actor;
}
