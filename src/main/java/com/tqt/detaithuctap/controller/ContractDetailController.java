package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.contract.AppendixCreateRequest;
import com.tqt.detaithuctap.dto.contract.AppendixResponse;
import com.tqt.detaithuctap.service.ContractDetailService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
public class ContractDetailController {

    private final ContractDetailService service;

    // ❌ KHÔNG khai báo:
    // @GetMapping("/{id}")                     // trùng với ContractController#get
    // @GetMapping("/{id}/payments/summary")    // trùng với ContractController#getPaymentSummaryByContract

    /** Tạo phụ lục cho hợp đồng */
    @PostMapping("/{id}/appendices")
    public AppendixResponse createAppendix(@PathVariable Long id,
                                           @RequestBody AppendixCreateRequest req) {
        return service.createAppendix(id, req.getTitle(), req.getNote());
    }

    /** Danh sách phụ lục theo hợp đồng */
    @GetMapping("/{id}/appendices")
    public List<AppendixResponse> listAppendices(@PathVariable Long id) {
        return service.listAppendices(id);
    }
}
