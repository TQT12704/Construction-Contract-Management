package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.enums.PaymentMethod;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.repository.ContractRepository;
import com.tqt.detaithuctap.repository.PaymentRepository;
import com.tqt.detaithuctap.security.AppUserDetails;
import com.tqt.detaithuctap.service.PaymentService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final ContractRepository contractRepository;

    /* ====== Query ====== */

    // Danh sách đợt theo hợp đồng
    @GetMapping("/by-contract/{contractId}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public List<PaymentResponse> listByContract(@PathVariable Long contractId) {
        return paymentService.getPaymentsByContract(contractId).stream()
                .map(PaymentController::toResponse)
                .collect(Collectors.toList());
    }

    // Tổng hợp toàn bộ (ALL) để hiển thị trong trang Thanh toán khi chọn "Tất cả hợp đồng"
    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public ResponseEntity<OverviewVM> overview() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = hasRole(auth, "ADMIN");
        boolean isAccountant = hasRole(auth, "ACCOUNTANT");
        boolean isSalesOnly = hasRole(auth, "SALES") && !isAdmin && !isAccountant;

        // Lấy danh sách hợp đồng theo quyền
        List<Contract> contracts;
        if (isSalesOnly) {
            Long salesId = currentUserId(auth);
            contracts = (salesId == null) ? List.of() : contractRepository.findBySales_Id(salesId);
        } else {
            contracts = contractRepository.findAll();
        }
        List<Long> contractIds = contracts.stream().map(Contract::getId).toList();

        // Tổng giá trị HĐ
        BigDecimal totalAmount = contracts.stream()
                .map(c -> nz(c.getTotalAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tất cả các đợt thanh toán có thể nhìn thấy
        List<Payment> payments;
        if (contractIds.isEmpty()) {
            payments = List.of();
        } else if (isSalesOnly) {
            // Lọc theo danh sách HĐ của sales hiện tại (lọc trong bộ nhớ)
            payments = paymentRepository.findAll().stream()
                    .filter(p -> p.getContract() != null && contractIds.contains(p.getContract().getId()))
                    .collect(Collectors.toList());
        } else {
            payments = paymentRepository.findAll();
        }

        // Tổng thực thu (PAID) – ưu tiên actualAmount nếu có
        BigDecimal totalPaid = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .map(p -> p.getActualAmount() != null ? p.getActualAmount() : nz(p.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Đếm trạng thái (PaymentStatus chỉ có UNPAID/PAID)
        int paidCount = (int) payments.stream().filter(p -> p.getStatus() == PaymentStatus.PAID).count();
        int pendingCount = (int) payments.stream().filter(p -> p.getStatus() == PaymentStatus.UNPAID).count();
        int cancelledCount = 0; // không có trạng thái CANCELLED cho Payment trong codebase hiện tại

        // Khoảng thời gian thu
        LocalDate firstPaymentDate = payments.stream().map(Payment::getPaymentDate).filter(Objects::nonNull)
                .min(LocalDate::compareTo).orElse(null);
        LocalDate lastPaymentDate = payments.stream().map(Payment::getPaymentDate).filter(Objects::nonNull)
                .max(LocalDate::compareTo).orElse(null);

        // Sắp xếp mới nhất trước
        payments.sort(
                Comparator.comparing(Payment::getPaymentDate, Comparator.nullsLast(LocalDate::compareTo)).reversed()
                        .thenComparing(Payment::getId, Comparator.nullsLast(Long::compareTo)).reversed()
        );

        // Giới hạn số dòng để hiển thị (tránh quá nhiều)
        List<PaymentResponse> items = payments.stream()
                .limit(200)
                .map(PaymentController::toResponse)
                .toList();

        OverviewVM vm = OverviewVM.builder()
                .totalAmount(totalAmount)
                .totalPaid(totalPaid)
                .remaining(maxZero(totalAmount.subtract(totalPaid)))
                .paidCount(paidCount)
                .pendingCount(pendingCount)
                .cancelledCount(cancelledCount)
                .firstPaymentDate(firstPaymentDate)
                .lastPaymentDate(lastPaymentDate)
                .payments(items)
                .build();

        return ResponseEntity.ok(vm);
    }

    /* ====== Commands ===== */

    // Tạo đợt thanh toán cho hợp đồng
    @PostMapping("/by-contract/{contractId}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<PaymentResponse> create(@PathVariable Long contractId,
                                                  @RequestBody CreatePaymentReq body) {
        Payment p = paymentService.createForContract(
                contractId,
                body.amount,
                body.planDate,
                body.method,
                body.note
        );
        return ResponseEntity.ok(toResponse(p));
    }

    // Xác nhận đã thanh toán
    @PatchMapping("/{paymentId}/mark-paid")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<PaymentResponse> markPaid(@PathVariable Long paymentId,
                                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paidDate,
                                                    @RequestParam(required = false) PaymentMethod method,
                                                    @RequestParam(required = false) String note,
                                                    @RequestParam(required = false) BigDecimal actualAmount) {
        Payment p = paymentService.markPaid(paymentId, paidDate, method, note, actualAmount);
        return ResponseEntity.ok(toResponse(p));
    }

    // Xoá đợt (chỉ khi chưa thu)
    @DeleteMapping("/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<Void> deleteIfUnpaid(@PathVariable Long paymentId) {
        paymentService.deleteIfUnpaid(paymentId);
        return ResponseEntity.noContent().build();
    }

    /* ====== DTOs & helpers ====== */

    public static record CreatePaymentReq(
            BigDecimal amount,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate planDate,
            PaymentMethod method,
            String note
    ) {}

    public static record PaymentResponse(
            Long id,
            Long contractId,
            String contractCode,
            LocalDate planDate,
            LocalDate paymentDate,
            BigDecimal amount,
            BigDecimal actualAmount,
            PaymentMethod method,
            PaymentStatus status,
            String note,
            String confirmedByName
    ) {}

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    private static class OverviewVM {
        private BigDecimal totalAmount;
        private BigDecimal totalPaid;
        private BigDecimal remaining;
        private Integer paidCount;
        private Integer pendingCount;
        private Integer cancelledCount;
        private LocalDate firstPaymentDate;
        private LocalDate lastPaymentDate;
        private List<PaymentResponse> payments;
    }

    private static PaymentResponse toResponse(Payment p) {
        Long cid = p.getContract() != null ? p.getContract().getId() : null;
        return new PaymentResponse(
                p.getId(),
                cid,
                null, // contractCode (FE đã có fallback)
                p.getPlanDate(),
                p.getPaymentDate(),
                p.getAmount(),
                p.getActualAmount(),
                p.getMethod(),
                p.getStatus(),
                p.getNote(),
                null  // confirmedByName (chưa có)
        );
    }

    private static BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
    private static BigDecimal maxZero(BigDecimal v) { return v.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : v; }

    private static boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        String target = "ROLE_" + role.toUpperCase();
        for (GrantedAuthority ga : auth.getAuthorities()) {
            if (target.equalsIgnoreCase(ga.getAuthority())) return true;
        }
        return false;
    }

    private static Long currentUserId(Authentication auth) {
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        if (p instanceof AppUserDetails aud && aud.getUser() != null) {
            return aud.getUser().getId();
        }
        return null;
    }
}
