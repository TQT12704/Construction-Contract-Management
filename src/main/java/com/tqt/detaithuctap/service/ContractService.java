package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.contract.ContractCreateRequest;
import com.tqt.detaithuctap.dto.contract.ContractResponse;
import com.tqt.detaithuctap.dto.contract.ContractUpdateRequest;
import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Customer;
import com.tqt.detaithuctap.entity.User;
import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.ContractType;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.repository.ContractRepository;
import com.tqt.detaithuctap.repository.CustomerRepository;
import com.tqt.detaithuctap.repository.PaymentRepository;
import com.tqt.detaithuctap.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ContractService {

    private final ContractRepository contractRepo;
    private final CustomerRepository customerRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;

    /* =================== Helpers =================== */

    // Lấy user hiện tại theo Authentication#getName() -> UserRepository.findByUsername(...)
    private User currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new AccessDeniedException("Unauthenticated");
        String username = auth.getName();
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("User not found: " + username));
    }

    private boolean hasRole(String role) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> ("ROLE_" + role).equalsIgnoreCase(a.getAuthority()));
    }

    private String genAutoCode() {
        LocalDate now = LocalDate.now();
        String y = String.valueOf(now.getYear());
        String m = String.format("%02d", now.getMonthValue());
        String d = String.format("%02d", now.getDayOfMonth());
        int rand = (int) (Math.random() * 9000) + 1000;
        return "HD-" + y + m + d + "-" + rand;
    }

    private Specification<Contract> spec(String q, ContractStatus status, ContractType type) {
        return (root, cq, cb) -> {
            var ps = new ArrayList<jakarta.persistence.criteria.Predicate>();
            if (q != null && !q.isBlank()) {
                var like = "%" + q.trim().toLowerCase() + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.get("contractCode")), like),
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("customer").get("name")), like),
                        cb.like(cb.lower(root.get("sales").get("fullName")), like)
                ));
            }
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            if (type != null) {
                ps.add(cb.equal(root.get("contractType"), type));
            }

            if (hasRole("ADMIN")) {
                // full access
            } else if (hasRole("SALES")) {
                ps.add(cb.equal(root.get("sales").get("id"), currentUser().getId()));
            } else if (hasRole("ACCOUNTANT")) {
                // read-all
            } else {
                ps.add(cb.equal(root.get("id"), -1)); // no-access
            }
            return cb.and(ps.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private ContractResponse toResp(Contract c) {
        BigDecimal total = Optional.ofNullable(c.getTotalAmount()).orElse(BigDecimal.ZERO);
        BigDecimal paid = Optional.ofNullable(
                paymentRepo.sumByContractAndStatus(c.getId(), PaymentStatus.PAID)
        ).orElse(BigDecimal.ZERO);
        BigDecimal remaining = total.subtract(paid);

        return new ContractResponse(
                c.getId(),
                c.getContractCode(),
                c.getTitle(),
                c.getContractType(),
                c.getCustomer() == null ? null : c.getCustomer().getId(),
                c.getCustomer() == null ? null : c.getCustomer().getName(),
                c.getSales() == null ? null : c.getSales().getId(),
                c.getSales() == null ? null :
                        (c.getSales().getFullName() != null ? c.getSales().getFullName() : c.getSales().getUsername()),
                null,
                null,
                c.getSignedDate(),
                c.getDueDate(),
                total,
                paid,
                remaining,
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }

    /* =================== LIST =================== */
    @Transactional(readOnly = true)
    public Page<ContractResponse> list(String q, ContractStatus status, ContractType type, Pageable pageable) {
        var page = contractRepo.findAll(spec(q, status, type), pageable);
        return page.map(this::toResp);
    }

    /* =================== GET =================== */
    @Transactional(readOnly = true)
    public ContractResponse get(Long id) {
        Contract c = contractRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Contract not found"));
        if (hasRole("SALES")) {
            var u = currentUser();
            if (c.getSales() == null || !Objects.equals(c.getSales().getId(), u.getId()))
                throw new AccessDeniedException("Forbidden: not your contract");
        } else if (!(hasRole("ADMIN") || hasRole("ACCOUNTANT"))) {
            throw new AccessDeniedException("Forbidden");
        }
        return toResp(c);
    }

    /* =================== CREATE =================== */
    @Transactional
    public ContractResponse create(ContractCreateRequest req) {
        if (!(hasRole("ADMIN") || hasRole("SALES")))
            throw new AccessDeniedException("Only ADMIN/SALES can create");

        // Customer
        Customer customer = customerRepo.findById(req.customerId())
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));

        // Sales: nếu không gửi -> gán người đang đăng nhập
        User sales = null;
        if (req.salesId() != null) {
            sales = userRepo.findById(req.salesId())
                    .orElseThrow(() -> new EntityNotFoundException("Sales not found"));
        }
        if (sales == null) {
            sales = currentUser();
        }

        // Entity
        Contract c = new Contract();

        // Mã HĐ: tự sinh nếu trống
        String code = (req.contractCode() == null || req.contractCode().isBlank())
                ? genAutoCode()
                : req.contractCode().trim();
        c.setContractCode(code);

        c.setTitle(req.title());
        c.setContractType(req.contractType());
        c.setCustomer(customer);
        c.setSales(sales);
        c.setSignedDate(req.signedDate());
        c.setDueDate(req.dueDate());
        c.setTotalAmount(req.totalAmount() == null ? BigDecimal.ZERO : req.totalAmount());
        c.setStatus(ContractStatus.PENDING);
        // **Không set note** vì entity/DTO của bạn không có

        try {
            contractRepo.save(c);
        } catch (DataIntegrityViolationException ex) {
            String root = String.valueOf(ex.getMostSpecificCause()).toLowerCase();
            if (root.contains("contract_code") && root.contains("unique")) {
                throw new IllegalArgumentException("Mã hợp đồng đã tồn tại, vui lòng chọn mã khác.");
            }
            throw ex;
        }
        return toResp(c);
    }

    /* =================== UPDATE =================== */
    @Transactional
    public ContractResponse update(Long id, ContractUpdateRequest req) {
        Contract c = contractRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Contract not found"));

        if (hasRole("SALES")) {
            var u = currentUser();
            if (c.getSales() == null || !Objects.equals(c.getSales().getId(), u.getId()))
                throw new AccessDeniedException("Forbidden: not your contract");
        } else if (!(hasRole("ADMIN") || hasRole("ACCOUNTANT"))) {
            throw new AccessDeniedException("Forbidden");
        }

        // Một số field không tồn tại trong ContractUpdateRequest của bạn (theo ảnh IDE),
        // nên chỉ cập nhật các field có chắc chắn tồn tại.
        if (req.title() != null) c.setTitle(req.title());
        if (req.contractType() != null) c.setContractType(req.contractType());
        if (req.signedDate() != null) c.setSignedDate(req.signedDate());
        if (req.dueDate() != null) c.setDueDate(req.dueDate());
        if (req.totalAmount() != null) c.setTotalAmount(req.totalAmount());
        if (req.status() != null) c.setStatus(req.status());
        // **Không update contractCode/salesId/note** vì DTO/Entity của bạn không có các method đó

        try {
            contractRepo.save(c);
        } catch (DataIntegrityViolationException ex) {
            String root = String.valueOf(ex.getMostSpecificCause()).toLowerCase();
            if (root.contains("contract_code") && root.contains("unique")) {
                throw new IllegalArgumentException("Mã hợp đồng đã tồn tại, vui lòng chọn mã khác.");
            }
            throw ex;
        }
        return toResp(c);
    }

    /* =================== DELETE =================== */
    @Transactional
    public void delete(Long id) {
        if (!hasRole("ADMIN")) throw new AccessDeniedException("Only ADMIN can delete");

        Contract c = contractRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Contract not found"));

        BigDecimal paid = Optional.ofNullable(
                paymentRepo.sumByContractAndStatus(c.getId(), PaymentStatus.PAID)
        ).orElse(BigDecimal.ZERO);
        if (paid.signum() > 0)
            throw new IllegalStateException("Không thể xoá hợp đồng đã có khoản thu (PAID)");

        contractRepo.delete(c);
    }
}
