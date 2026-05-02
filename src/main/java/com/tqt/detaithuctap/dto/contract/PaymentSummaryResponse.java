package com.tqt.detaithuctap.dto.contract;

import java.math.BigDecimal;

public class PaymentSummaryResponse {
    public BigDecimal totalAmount;
    public BigDecimal totalPaid;
    public BigDecimal remaining;

    public PaymentSummaryResponse() {}
    public PaymentSummaryResponse(BigDecimal totalAmount, BigDecimal totalPaid) {
        this.totalAmount = totalAmount == null ? BigDecimal.ZERO : totalAmount;
        this.totalPaid = totalPaid == null ? BigDecimal.ZERO : totalPaid;
        this.remaining = this.totalAmount.subtract(this.totalPaid);
        if (this.remaining.signum() < 0) this.remaining = BigDecimal.ZERO;
    }
}
