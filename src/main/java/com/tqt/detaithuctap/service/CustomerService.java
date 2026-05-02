package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.customer.CustomerCreateRequest;
import com.tqt.detaithuctap.dto.customer.CustomerResponse;
import com.tqt.detaithuctap.dto.customer.CustomerUpdateRequest;
import com.tqt.detaithuctap.entity.Customer;
import com.tqt.detaithuctap.entity.User;
import com.tqt.detaithuctap.entity.enums.CustomerGroup;
import com.tqt.detaithuctap.entity.enums.Region;
import com.tqt.detaithuctap.repository.CustomerRepository;
import com.tqt.detaithuctap.repository.UserRepository;
import com.tqt.detaithuctap.security.AppUserDetails;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.regex.Pattern;

import static com.tqt.detaithuctap.repository.spec.CustomerSpecs.*;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository repo;
    private final UserRepository userRepo;

    /* ============== SEARCH + PHÂN TRANG ============== */
    public Page<CustomerResponse> search(String q, String group, String region, String industry, Long ownerId, Pageable pageable) {
        // ✅ Cho phép SALES xem tất cả KH (không ép ownerId = currentUser nữa).
        //    ownerId chỉ là bộ lọc TUỲ CHỌN; nếu null → trả tất cả.
        Specification<Customer> spec = com.tqt.detaithuctap.repository.spec.CustomerSpecs.filter(
                q,
                group,
                region,
                ownerId   // giữ nguyên tham số request
        );
        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    /* ============================ CRUD ============================ */

    @Transactional
    public CustomerResponse create(CustomerCreateRequest req) {
        String name = trimOrNull(req.getName());
        if (name == null) throw new IllegalArgumentException("Customer name is required");

        // Vẫn gán owner = user hiện tại (hữu ích cho truy vết), nhưng KHÔNG dùng để chặn quyền nữa.
        User owner = currentUser();

        Customer c = new Customer();
        c.setName(name);

        String groupStr = trimOrNull(req.getCustomerGroup());
        if (groupStr != null) c.setCustomerGroup(Enum.valueOf(CustomerGroup.class, groupStr.toUpperCase()));

        String regionStr = trimOrNull(req.getRegion());
        if (regionStr != null) c.setRegion(Enum.valueOf(Region.class, regionStr.toUpperCase()));

        c.setPhone(trimOrNull(req.getPhone()));
        c.setEmail(trimOrNull(req.getEmail()));
        c.setAddress(trimOrNull(req.getAddress()));

        String industry = trimOrNull(req.getIndustry());
        c.setIndustry(industry);

        c.setOwner(owner);

        return toResponse(repo.save(c));
    }

    public CustomerResponse findOne(Long id) {
        Customer c = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        checkViewPermission(c);
        return toResponse(c);
    }

    @Transactional
    public CustomerResponse update(Long id, CustomerUpdateRequest req) {
        Customer c = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        checkEditPermission(c);

        String name = trimOrNull(req.getName());
        if (name != null) c.setName(name);

        String groupStr = trimOrNull(req.getCustomerGroup());
        if (groupStr != null) c.setCustomerGroup(Enum.valueOf(CustomerGroup.class, groupStr.toUpperCase()));

        String regionStr = trimOrNull(req.getRegion());
        if (regionStr != null) c.setRegion(Enum.valueOf(Region.class, regionStr.toUpperCase()));

        String phone = trimOrNull(req.getPhone());
        if (phone != null) c.setPhone(phone);

        String email = trimOrNull(req.getEmail());
        if (email != null) c.setEmail(email);

        String address = trimOrNull(req.getAddress());
        if (address != null) c.setAddress(address);

        String industry = trimOrNull(req.getIndustry());
        if (industry != null) c.setIndustry(industry);

        return toResponse(repo.save(c));
    }

    @Transactional
    public void delete(Long id) {
        Customer c = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        checkDeletePermission(c);
        repo.delete(c);
    }

    /* ========================== Helpers =========================== */

    private CustomerResponse toResponse(Customer c) {
        return new CustomerResponse(
                c.getId(),
                c.getName(),
                c.getCustomerGroup() != null ? c.getCustomerGroup().name() : null,
                c.getRegion() != null ? c.getRegion().name() : null,
                c.getPhone(),
                c.getEmail(),
                c.getAddress(),
                c.getIndustry(),
                c.getOwner() != null ? c.getOwner().getId() : null,
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }

    private static String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    // --- (giữ nguyên các hàm removeAccents/normalize/industryLikePortable nếu bạn đang dùng ở nơi khác) ---
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static String removeAccents(String input) {
        if (input == null) return null;
        String norm = Normalizer.normalize(input, Normalizer.Form.NFD);
        norm = DIACRITICS.matcher(norm).replaceAll("");
        norm = norm.replace('đ', 'd').replace('Đ', 'D');
        return norm;
    }
    private static String normalize(String s) {
        String t = trimOrNull(s);
        return t == null ? null : removeAccents(t).toLowerCase();
    }

    // (Không sử dụng ở filter hiện tại, nhưng để sẵn nếu bạn muốn LIKE không dấu theo industry)
    private Specification<Customer> industryLikePortable(String industry) {
        String norm = normalize(industry);
        if (norm == null) return null;

        return (root, cq, cb) -> {
            var expr = cb.lower(root.get("industry"));
            expr = cb.function("replace", String.class, expr, cb.literal("á"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("à"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ả"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ã"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ạ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ă"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ắ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ằ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ẳ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ẵ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ặ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("â"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ấ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ầ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ẩ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ẫ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("ậ"), cb.literal("a"));
            expr = cb.function("replace", String.class, expr, cb.literal("é"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("è"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ẻ"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ẽ"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ẹ"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ê"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ế"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ề"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ể"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ễ"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("ệ"), cb.literal("e"));
            expr = cb.function("replace", String.class, expr, cb.literal("í"), cb.literal("i"));
            expr = cb.function("replace", String.class, expr, cb.literal("ì"), cb.literal("i"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỉ"), cb.literal("i"));
            expr = cb.function("replace", String.class, expr, cb.literal("ĩ"), cb.literal("i"));
            expr = cb.function("replace", String.class, expr, cb.literal("ị"), cb.literal("i"));
            expr = cb.function("replace", String.class, expr, cb.literal("ó"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ò"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỏ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("õ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ọ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ô"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ố"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ồ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ổ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỗ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ộ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ơ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ớ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ờ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ở"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỡ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ợ"), cb.literal("o"));
            expr = cb.function("replace", String.class, expr, cb.literal("ú"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ù"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ủ"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ũ"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ụ"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ư"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ứ"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ừ"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ử"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ữ"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ự"), cb.literal("u"));
            expr = cb.function("replace", String.class, expr, cb.literal("ý"), cb.literal("y"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỳ"), cb.literal("y"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỷ"), cb.literal("y"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỹ"), cb.literal("y"));
            expr = cb.function("replace", String.class, expr, cb.literal("ỵ"), cb.literal("y"));
            expr = cb.function("replace", String.class, expr, cb.literal("đ"), cb.literal("d"));
            return cb.like(expr, "%" + norm + "%");
        };
    }

    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities() != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    private User currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) throw new AccessDeniedException("Unauthenticated");
        Object principal = auth.getPrincipal();
        if (principal instanceof AppUserDetails aud) return aud.getUser();
        if (principal instanceof org.springframework.security.core.userdetails.User su) {
            return userRepo.findByUsername(su.getUsername())
                    .orElseThrow(() -> new AccessDeniedException("User not found: " + su.getUsername()));
        }
        if (principal instanceof String s) throw new AccessDeniedException("Unauthenticated: " + s);
        throw new AccessDeniedException("Unsupported principal type: " + principal.getClass());
    }

    /* ====== Quyền: mở rộng cho SALES ====== */
    private void checkViewPermission(Customer c) {
        // ADMIN hoặc SALES đều được xem mọi khách hàng
        if (hasRole("ADMIN") || hasRole("SALES")) return;
        throw new IllegalArgumentException("Forbidden");
    }

    private void checkEditPermission(Customer c) {
        // ADMIN hoặc SALES đều được cập nhật mọi khách hàng
        if (hasRole("ADMIN") || hasRole("SALES")) return;
        throw new IllegalArgumentException("Forbidden");
    }

    private void checkDeletePermission(Customer c) {
        // ADMIN hoặc SALES đều được xoá
        if (hasRole("ADMIN") || hasRole("SALES")) return;
        throw new IllegalArgumentException("Forbidden");
    }
}
