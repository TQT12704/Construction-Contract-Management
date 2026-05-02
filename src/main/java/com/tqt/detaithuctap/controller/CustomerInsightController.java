package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.customer.CustomerDetailResponse;
import com.tqt.detaithuctap.service.CustomerInsightService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerInsightController {

    private final CustomerInsightService service;

    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('ADMIN','SALES','ACCOUNTANT')")
    public ResponseEntity<CustomerDetailResponse> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(service.getDetail(id));
    }
}
