package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.PaymentHistory;
import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.PaymentMethod;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.repository.ContractRepository;
import com.tqt.detaithuctap.repository.PaymentHistoryRepository;
import com.tqt.detaithuctap.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final ContractRepository contractRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;

    /* ===================== Queries ===================== */

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsByContract(Long contractId) {
        // Ưu tiên sort tăng dần theo id nếu method có sẵn
        try {
            PaymentRepository.class.getMethod("findByContract_IdOrderByIdAsc", Long.class);
            return paymentRepository.findByContract_IdOrderByIdAsc(contractId);
        } catch (NoSuchMethodException ignored) {}
        try {
            PaymentRepository.class.getMethod("findByContractId", Long.class);
            return paymentRepository.findByContractId(contractId);
        } catch (NoSuchMethodException ignored) {}
        return paymentRepository.findByContract_Id(contractId);
    }

    @Transactional(readOnly = true)
    public List<PaymentHistory> getHistoryByContract(Long contractId) {
        return paymentHistoryRepository.findByContractIdOrderByCreatedAtDesc(contractId);
    }

    @Transactional(readOnly = true)
    public Payment getById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + id));
    }

    /* ===================== Commands ===================== */

    @Transactional
    public Payment createForContract(Long contractId,
                                     BigDecimal amount,
                                     LocalDate planDate,
                                     PaymentMethod method,
                                     String note) {
        Contract c = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found: " + contractId));

        Payment p = Payment.builder()
                .contract(c)
                .amount(nvl(amount))
                .planDate(planDate)
                .method(method)
                .status(PaymentStatus.UNPAID)
                .note(note)
                .build();

        Payment saved = paymentRepository.save(p);

        // log CREATED
        logHistory(saved, "CREATED", null, saved.getAmount(), null,
                null, saved.getStatus().name(),
                saved.getMethod() == null ? null : saved.getMethod().name(),
                saved.getNote());

        recomputeContractStatusOnly(c.getId());
        return saved;
    }

    @Transactional
    public void deleteIfUnpaid(Long paymentId) {
        Payment p = getById(paymentId);
        if (p.getStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Cannot delete PAID payment");
        }
        Long cid = p.getContract().getId();

        // log DELETED
        logHistory(p, "DELETED", p.getAmount(), null, p.getActualAmount(),
                p.getStatus().name(), null,
                p.getMethod() == null ? null : p.getMethod().name(),
                null);

        paymentRepository.delete(p);
        recomputeContractStatusOnly(cid);
    }

    @Transactional
    public Payment markPaid(Long paymentId,
                            LocalDate paidDate,
                            PaymentMethod method,
                            String note,
                            BigDecimal actualAmount) {
        Payment p = getById(paymentId);
        Contract c = p.getContract();
        Long cid = c.getId();

        BigDecimal oldAmount = nvl(p.getAmount());
        String oldStatus = p.getStatus().name();

        BigDecimal actual = nvl(actualAmount);
        if (actual.signum() <= 0) {
            throw new IllegalArgumentException("actualAmount must be > 0");
        }

        p.setPaymentDate(paidDate);
        if (method != null) p.setMethod(method);
        if (note != null && !note.isBlank()) p.setNote(note);
        p.setActualAmount(actual);
        p.setStatus(PaymentStatus.PAID);

        if (actual.compareTo(oldAmount) < 0) {
            BigDecimal missing = oldAmount.subtract(actual);

            // giảm về actual
            p.setAmount(actual);
            Payment savedPaid = paymentRepository.save(p);

            // log MARK_PAID
            logHistory(savedPaid, "MARK_PAID", oldAmount, savedPaid.getAmount(), savedPaid.getActualAmount(),
                    oldStatus, savedPaid.getStatus().name(),
                    savedPaid.getMethod() == null ? null : savedPaid.getMethod().name(),
                    note);

            // tạo đợt bổ sung
            Payment tail = Payment.builder()
                    .contract(c)
                    .amount(missing)
                    .status(PaymentStatus.UNPAID)
                    .method(savedPaid.getMethod())
                    .planDate(null)
                    .note("Auto-split from payment #" + savedPaid.getId())
                    .build();
            Payment savedTail = paymentRepository.save(tail);

            // log CREATED cho đợt bổ sung
            logHistory(savedTail, "CREATED", null, savedTail.getAmount(), null,
                    null, savedTail.getStatus().name(),
                    savedTail.getMethod() == null ? null : savedTail.getMethod().name(),
                    savedTail.getNote());

            recomputeContractStatusOnly(cid);
            return savedPaid;
        } else {
            Payment saved = paymentRepository.save(p);

            // log MARK_PAID
            logHistory(saved, "MARK_PAID", oldAmount, saved.getAmount(), saved.getActualAmount(),
                    oldStatus, saved.getStatus().name(),
                    saved.getMethod() == null ? null : saved.getMethod().name(),
                    note);

            recomputeContractStatusOnly(cid);
            return saved;
        }
    }

    @Transactional
    public void recomputeContractStatusOnly(Long contractId) {
        Contract c = contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Contract not found: " + contractId));

        if (c.getStatus() != ContractStatus.CANCELLED) {
            BigDecimal total = nvl(c.getTotalAmount());
            BigDecimal paid = nvl(paymentRepository.sumByContractAndStatus(c.getId(), PaymentStatus.PAID));

            if (paid.signum() == 0) {
                c.setStatus(ContractStatus.PENDING);
            } else if (paid.compareTo(total) >= 0) {
                c.setStatus(ContractStatus.COMPLETED);
            } else {
                c.setStatus(ContractStatus.ACTIVE);
            }
        }

        contractRepository.save(c);
    }

    /* ===================== Helpers ===================== */

    private static BigDecimal nvl(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private String currentActor() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return (a != null) ? a.getName() : "system";
    }

    private void logHistory(Payment payment, String action,
                            BigDecimal amountBefore, BigDecimal amountAfter,
                            BigDecimal actualAmount, String statusBefore, String statusAfter,
                            String method, String note) {
        PaymentHistory h = PaymentHistory.builder()
                .contract(payment.getContract())
                .payment(payment)
                .action(action)
                .amountBefore(amountBefore)
                .amountAfter(amountAfter)
                .actualAmount(actualAmount)
                .statusBefore(statusBefore)
                .statusAfter(statusAfter)
                .method(method)
                .note(note)
                .createdAt(Instant.now())
                .actor(currentActor())
                .build();
        paymentHistoryRepository.save(h);
    }
}
