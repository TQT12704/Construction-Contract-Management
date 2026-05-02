package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.payment.BulkPaymentCreateRequest;
import com.tqt.detaithuctap.dto.payment.InstallmentCreate;
import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.repository.ContractRepository;
import com.tqt.detaithuctap.repository.PaymentRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@Transactional
@RequiredArgsConstructor
public class ContractPaymentPlanService {

    private final ContractRepository contractRepo;
    private final PaymentRepository paymentRepo;

    public void createBulk(Long contractId, BulkPaymentCreateRequest req) {
        if (req == null || req.getItems() == null || req.getItems().isEmpty()) return;
        Contract c = contractRepo.findById(contractId)
                .orElseThrow(() -> new EntityNotFoundException("Contract not found"));

        int autoNo = 1;
        for (InstallmentCreate it : req.getItems()) {
            Payment p = new Payment();
            p.setContract(c);
            p.setStatus(PaymentStatus.UNPAID);
            p.setAmount(it.getAmount());
            p.setInstallmentNo(it.getInstallmentNo() != null ? it.getInstallmentNo() : autoNo++);
            if (it.getPlanDate() != null && !it.getPlanDate().isBlank()) {
                p.setPlanDate(LocalDate.parse(it.getPlanDate()));
            }
            p.setNote(it.getNote());
            paymentRepo.save(p);
        }
    }
}
