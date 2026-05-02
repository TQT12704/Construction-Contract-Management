package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.ContractAppendix;
import com.tqt.detaithuctap.repository.ContractAppendixRepository;
import com.tqt.detaithuctap.repository.ContractRepository;
import com.tqt.detaithuctap.repository.PaymentRepository;
import com.tqt.detaithuctap.dto.contract.AppendixResponse;
import com.tqt.detaithuctap.dto.contract.ContractDetailResponse;
import com.tqt.detaithuctap.dto.contract.PaymentSummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ContractDetailService {

    private final ContractRepository contractRepo;
    private final PaymentRepository paymentRepo;
    private final ContractAppendixRepository appendixRepo;

    public ContractDetailService(ContractRepository contractRepo,
                                 PaymentRepository paymentRepo,
                                 ContractAppendixRepository appendixRepo) {
        this.contractRepo = contractRepo;
        this.paymentRepo = paymentRepo;
        this.appendixRepo = appendixRepo;
    }

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public ContractDetailResponse getDetail(Long id) {
        Contract c = contractRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        ContractDetailResponse r = new ContractDetailResponse();
        r.id = c.getId();

        // dùng đúng field có thật
        r.contractCode = c.getContractCode();
        r.title = c.getTitle();
        r.contractType = (c.getContractType() != null) ? c.getContractType().name() : null;

        if (c.getCustomer() != null) {
            r.customerId = c.getCustomer().getId();
            r.customerName = c.getCustomer().getName(); // Customer không có fullName
        }

        // Contract có field 'sales' (User)
        if (c.getSales() != null) {
            r.salesId = c.getSales().getId();
            // User có fullName & username (không có name)
            r.salesName = (c.getSales().getFullName() != null && !c.getSales().getFullName().isBlank())
                    ? c.getSales().getFullName()
                    : c.getSales().getUsername();
        }

        if (c.getSignedDate() != null) r.signedDate = ISO.format(c.getSignedDate());
        if (c.getDueDate()    != null) r.dueDate    = ISO.format(c.getDueDate());

        r.totalAmount = c.getTotalAmount();

        // paid: dùng sumPaidActual(contractId) (đã có trong PaymentRepository)
        BigDecimal paid = BigDecimal.ZERO;
        try {
            paid = paymentRepo.sumPaidActual(c.getId());
        } catch (Exception ignored) {}
        r.paidAmount = (paid != null) ? paid : BigDecimal.ZERO;

        BigDecimal total = (c.getTotalAmount() != null) ? c.getTotalAmount() : BigDecimal.ZERO;
        r.remainingAmount = total.subtract(r.paidAmount);
        if (r.remainingAmount.signum() < 0) r.remainingAmount = BigDecimal.ZERO;

        r.status = (c.getStatus() != null) ? c.getStatus().name() : null;

        // entity không có note -> để null
        r.note = null;

        return r;
    }

    public PaymentSummaryResponse getPaymentSummary(Long id) {
        Contract c = contractRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));

        BigDecimal total = (c.getTotalAmount() != null) ? c.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paid = BigDecimal.ZERO;
        try {
            paid = paymentRepo.sumPaidActual(c.getId());
        } catch (Exception ignored) {}

        return new PaymentSummaryResponse(total, (paid != null) ? paid : BigDecimal.ZERO);
    }

    @Transactional
    public AppendixResponse createAppendix(Long contractId, String title, String note) {
        Contract c = contractRepo.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found"));
        ContractAppendix a = new ContractAppendix(c, title, note);
        a = appendixRepo.save(a);
        return new AppendixResponse(a.getId(), a.getTitle(), a.getNote(), a.getCreatedAt());
    }

    public List<AppendixResponse> listAppendices(Long contractId) {
        return appendixRepo.findByContractIdOrderByIdDesc(contractId).stream()
                .map(a -> new AppendixResponse(a.getId(), a.getTitle(), a.getNote(), a.getCreatedAt()))
                .toList();
    }
}
