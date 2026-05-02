package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.contract.ContractPaymentSummary;
import com.tqt.detaithuctap.service.ContractSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping(path = "/api/contracts", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ContractPaymentController {

    private final ContractSummaryService contractSummaryService;

    // GET /api/contracts/{id}/payment-summary
    @GetMapping("/{id}/payment-summary")
    public ContractPaymentSummary getOne(@PathVariable("id") Long id) {
        return contractSummaryService.getSummary(id);
    }

    // GET /api/contracts/payment-summaries?ids=1,2,3
    @GetMapping("/payment-summaries")
    public List<ContractPaymentSummary> getMany(@RequestParam("ids") String ids) {
        var idList = Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::valueOf)
                .collect(Collectors.toList());
        return contractSummaryService.getSummaries(idList);
    }
}
