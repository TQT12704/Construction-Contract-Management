package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.contract.ContractPaymentSummary;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.repository.PaymentRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ContractSummaryService {

    private final PaymentRepository paymentRepo;

    public List<ContractPaymentSummary> getSummaries(Collection<Long> contractIds) {
        if (contractIds == null || contractIds.isEmpty()) return List.of();

        // 1) Đếm số đợt + tổng dự kiến (tất cả status)
        Map<Long, ContractPaymentSummary> map = new HashMap<>();
        for (Object[] row : paymentRepo.countAndSumByContractIds(contractIds)) {
            Long cid = ((Number) row[0]).longValue();
            Long installments = ((Number) row[1]).longValue();
            BigDecimal planned = (BigDecimal) row[2];

            map.put(cid, ContractPaymentSummary.builder()
                    .contractId(cid)
                    .installments(installments)
                    .plannedAmount(planned)
                    .paidAmount(BigDecimal.ZERO)
                    .build());
        }

        // 2) Tổng đã thu (status = PAID)
        for (Object[] row : paymentRepo.sumByContractIdsAndStatus(contractIds, PaymentStatus.PAID)) {
            Long cid = ((Number) row[0]).longValue();
            BigDecimal paid = (BigDecimal) row[1];
            map.computeIfAbsent(cid, k -> ContractPaymentSummary.builder()
                    .contractId(cid)
                    .installments(0L)
                    .plannedAmount(BigDecimal.ZERO)
                    .paidAmount(BigDecimal.ZERO)
                    .build()).setPaidAmount(paid);
        }

        // Trả về đúng thứ tự contractIds nếu cần
        return contractIds.stream()
                .map(id -> map.getOrDefault(id, ContractPaymentSummary.builder()
                        .contractId(id)
                        .installments(0L)
                        .plannedAmount(BigDecimal.ZERO)
                        .paidAmount(BigDecimal.ZERO)
                        .build()))
                .collect(Collectors.toList());
    }

    public ContractPaymentSummary getSummary(Long contractId) {
        if (contractId == null) return null;
        Object[] a = paymentRepo.countAndSumByContract(contractId);
        Long installments = ((Number) a[0]).longValue();
        BigDecimal planned = (BigDecimal) a[1];
        BigDecimal paid = paymentRepo.sumByContractAndStatus(contractId, PaymentStatus.PAID);
        if (paid == null) paid = BigDecimal.ZERO;

        return ContractPaymentSummary.builder()
                .contractId(contractId)
                .installments(installments)
                .plannedAmount(planned)
                .paidAmount(paid)
                .build();
    }
}
