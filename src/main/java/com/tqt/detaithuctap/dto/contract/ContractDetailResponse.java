package com.tqt.detaithuctap.dto.contract;

import java.math.BigDecimal;

public class ContractDetailResponse {
    public Long id;
    public String contractCode;
    public String title;
    public String contractType;
    public Long customerId;
    public String customerName;
    public Long salesId;
    public String salesName;
    public String signedDate; // yyyy-MM-dd
    public String dueDate;    // yyyy-MM-dd
    public BigDecimal totalAmount;
    public BigDecimal paidAmount;
    public BigDecimal remainingAmount;
    public String status;
    public String note;
}
