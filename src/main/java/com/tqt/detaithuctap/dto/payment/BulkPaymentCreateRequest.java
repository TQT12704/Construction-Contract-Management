package com.tqt.detaithuctap.dto.payment;

import lombok.Data;

import java.util.List;

@Data
public class BulkPaymentCreateRequest {
    private List<InstallmentCreate> items;
}
