package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.report.KpiResponse;
import com.tqt.detaithuctap.dto.report.SeriesPoint;
import com.tqt.detaithuctap.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List; import java.util.Map;

@RestController @RequestMapping("/api/reports") @RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    // ADMIN + ACCOUNTANT: xem báo cáo tổng hợp
    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<KpiResponse> kpis(){
        return ResponseEntity.ok(reportService.kpis());
    }

    @GetMapping("/revenue-by-month")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<List<SeriesPoint>> revenueByMonth(@RequestParam(defaultValue = "12") int months){
        return ResponseEntity.ok(reportService.revenueByMonth(months));
    }

    @GetMapping("/top-customers")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<List<Map<String,Object>>> topCustomers(@RequestParam(defaultValue = "10") int top){
        return ResponseEntity.ok(reportService.topCustomersByContractValue(top));
    }
}
