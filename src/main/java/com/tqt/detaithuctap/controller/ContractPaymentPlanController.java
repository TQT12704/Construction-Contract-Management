package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.payment.BulkPaymentCreateRequest;
import com.tqt.detaithuctap.service.ContractPaymentPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contracts/{id}/payments")
@RequiredArgsConstructor
public class ContractPaymentPlanController {

    private final ContractPaymentPlanService service;

    // FE gọi sau khi tạo HĐ xong (nếu user bật "Chia đợt")
    @PostMapping("/bulk")
    public ResponseEntity<?> createBulk(@PathVariable("id") Long contractId,
                                        @RequestBody BulkPaymentCreateRequest req) {
        service.createBulk(contractId, req);
        return ResponseEntity.ok().build();
    }
}
