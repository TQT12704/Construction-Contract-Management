package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.contract.ContractCreateRequest;
import com.tqt.detaithuctap.dto.contract.ContractResponse;
import com.tqt.detaithuctap.dto.contract.ContractUpdateRequest;
import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.PaymentHistory;
import com.tqt.detaithuctap.entity.User;
import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.ContractType;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.service.ContractService;
import com.tqt.detaithuctap.service.PaymentService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceContext;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService service;
    private final PaymentService paymentService;

    @PersistenceContext
    private EntityManager em;

    /* ---------------- Contracts CRUD (giữ nguyên) ---------------- */

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES','ACCOUNTANT')")
    public ResponseEntity<Page<ContractResponse>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ContractStatus status,
            @RequestParam(required = false) ContractType type,
            Pageable pageable
    ) {
        return ResponseEntity.ok(service.list(q, status, type, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES','ACCOUNTANT')")
    public ResponseEntity<ContractResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<ContractResponse> create(@RequestBody ContractCreateRequest req) {
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public ResponseEntity<ContractResponse> update(@PathVariable Long id, @RequestBody ContractUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /* ---------------- Payments & History (giữ nguyên) ---------------- */

    @GetMapping("/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public ResponseEntity<List<PaymentItemVM>> getPaymentsByContract(@PathVariable Long id) {
        List<Payment> list = paymentService.getPaymentsByContract(id);
        var dto = list.stream().map(p -> PaymentItemVM.builder()
                .id(p.getId())
                .contractId(p.getContract() != null ? p.getContract().getId() : null)
                // FE đã có fallback "HD-{contractId}" nếu null, nên không cần ép lấy code từ Contract để tránh lazy
                .contractCode(null)
                .planDate(p.getPlanDate())
                .paymentDate(p.getPaymentDate())
                .amount(nullSafe(p.getAmount()))
                .actualAmount(p.getActualAmount())
                .method(p.getMethod())
                .status(p.getStatus())
                .note(p.getNote())
                .build()
        ).toList();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{id}/payments/history")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public ResponseEntity<List<PaymentHistoryVM>> getPaymentHistoryByContract(@PathVariable Long id) {
        List<PaymentHistory> list = paymentService.getHistoryByContract(id);
        var dto = list.stream().map(h -> PaymentHistoryVM.builder()
                .id(h.getId())
                .contractId(h.getContract() != null ? h.getContract().getId() : null)
                .paymentId(h.getPayment() != null ? h.getPayment().getId() : null)
                .action(h.getAction())
                .amountBefore(h.getAmountBefore())
                .amountAfter(h.getAmountAfter())
                .actualAmount(h.getActualAmount())
                .statusBefore(h.getStatusBefore())
                .statusAfter(h.getStatusAfter())
                .method(h.getMethod())
                .note(h.getNote())
                .createdAt(h.getCreatedAt())
                .actor(h.getActor())
                .build()
        ).toList();
        return ResponseEntity.ok(dto);
    }

    /* ---------------- NEW: Tổng hợp thanh toán của 1 hợp đồng ---------------- */

    /**
     * Tổng hợp + full info hợp đồng/khách hàng/người phụ trách + danh sách các đợt thanh toán.
     * Không dựa vào ContractResponse (tránh lỗi getter khác tên) – truy vấn trực tiếp Entity để tương thích.
     */
    @GetMapping("/{id}/payments/summary")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public ResponseEntity<PaymentSummaryVM> getPaymentSummaryByContract(@PathVariable Long id) {
        // Lấy entity HĐ trực tiếp để không phụ thuộc các getter của ContractResponse
        Contract c = em.find(Contract.class, id);
        if (c == null) throw new EntityNotFoundException("Contract not found: " + id);

        // Các đợt thanh toán của HĐ
        List<Payment> payments = paymentService.getPaymentsByContract(id);

        // Tổng đã thu: chỉ PAID; ưu tiên actualAmount nếu có; nếu null thì lấy amount
        BigDecimal totalPaid = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .map(p -> p.getActualAmount() != null ? p.getActualAmount() : nullSafe(p.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAmount = nullSafe(c.getTotalAmount());
        BigDecimal remaining = totalAmount.subtract(totalPaid);
        if (remaining.signum() < 0) remaining = BigDecimal.ZERO;

        // Đếm theo trạng thái (không tham chiếu trực tiếp CANCELLED/PENDING để tránh khác tên enum)
        Map<PaymentStatus, Long> byStatus = payments.stream()
                .collect(Collectors.groupingBy(Payment::getStatus, Collectors.counting()));

        int paidCount = byStatus.getOrDefault(PaymentStatus.PAID, 0L).intValue();
        // cancelled: tìm theo tên "CANCELLED" nếu có; nếu enum dự án bạn dùng tên khác, vẫn không lỗi – trả 0
        int cancelledCount = byStatus.entrySet().stream()
                .filter(e -> e.getKey() != null && "CANCELLED".equalsIgnoreCase(e.getKey().name()))
                .mapToInt(e -> e.getValue().intValue())
                .sum();
        int pendingCount = payments.size() - paidCount - cancelledCount;

        LocalDate firstPaymentDate = payments.stream().map(Payment::getPaymentDate).filter(Objects::nonNull)
                .min(LocalDate::compareTo).orElse(null);
        LocalDate lastPaymentDate = payments.stream().map(Payment::getPaymentDate).filter(Objects::nonNull)
                .max(LocalDate::compareTo).orElse(null);

        // Sắp xếp theo ngày giảm dần, sau đó id giảm dần
        payments.sort(
                Comparator.comparing(Payment::getPaymentDate, Comparator.nullsLast(LocalDate::compareTo)).reversed()
                        .thenComparing(Payment::getId, Comparator.nullsLast(Long::compareTo)).reversed()
        );

        // Map ra danh sách đợt thanh toán
        List<PaymentItemVM> items = payments.stream().map(p -> PaymentItemVM.builder()
                .id(p.getId())
                .contractId(c.getId())
                .contractCode(c.getContractCode())
                .planDate(p.getPlanDate())
                .paymentDate(p.getPaymentDate())
                .amount(nullSafe(p.getAmount()))
                .actualAmount(p.getActualAmount())
                .method(p.getMethod())
                .status(p.getStatus())
                .note(p.getNote())
                .build()
        ).toList();

        // Thông tin khách hàng & người phụ trách (sales) từ entity
        var customer = c.getCustomer();
        User sales = c.getSales(); // nếu không có field sales trên Contract, bạn có thể dùng customer.getOwner()

        PaymentSummaryVM summary = PaymentSummaryVM.builder()
                // Contract info
                .contractId(c.getId())
                .contractCode(c.getContractCode())
                .title(c.getTitle())
                .status(c.getStatus())
                .signedDate(c.getSignedDate())
                .totalAmount(totalAmount)
                // Customer & Sales
                .customerId(customer != null ? customer.getId() : null)
                .customerName(customer != null ? customer.getName() : null)
                .salesId(sales != null ? sales.getId() : null)
                .salesName(sales != null ? sales.getFullName() : null) // nếu User dùng "name", đổi getFullName() -> getName()
                // Aggregates
                .totalPaid(totalPaid)
                .remaining(remaining)
                .paymentCount(items.size())
                .paidCount(paidCount)
                .pendingCount(pendingCount)
                .cancelledCount(cancelledCount)
                .firstPaymentDate(firstPaymentDate)
                .lastPaymentDate(lastPaymentDate)
                // Items
                .payments(items)
                .build();

        return ResponseEntity.ok(summary);
    }

    /* --------------------- DTO nội bộ --------------------- */

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    private static class PaymentItemVM {
        private Long id;
        private Long contractId;
        private String contractCode; // optional
        private LocalDate planDate;
        private LocalDate paymentDate;
        private BigDecimal amount;
        private BigDecimal actualAmount;
        private com.tqt.detaithuctap.entity.enums.PaymentMethod method;
        private com.tqt.detaithuctap.entity.enums.PaymentStatus status;
        private String note;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    private static class PaymentHistoryVM {
        private Long id;
        private Long contractId;
        private Long paymentId;
        private String action;
        private BigDecimal amountBefore;
        private BigDecimal amountAfter;
        private BigDecimal actualAmount;
        private String statusBefore;
        private String statusAfter;
        private String method;
        private String note;
        private Instant createdAt;
        private String actor;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    private static class PaymentSummaryVM {
        // Contract
        private Long contractId;
        private String contractCode;
        private String title;
        private ContractStatus status;
        private LocalDate signedDate;
        private BigDecimal totalAmount;

        // Customer & Sales
        private Long customerId;
        private String customerName;
        private Long salesId;
        private String salesName;

        // Aggregates
        private BigDecimal totalPaid;
        private BigDecimal remaining;
        private Integer paymentCount;
        private Integer paidCount;
        private Integer pendingCount;
        private Integer cancelledCount;
        private LocalDate firstPaymentDate;
        private LocalDate lastPaymentDate;

        // Items
        private List<PaymentItemVM> payments;
    }

    private static BigDecimal nullSafe(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
