package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Customer;
import com.tqt.detaithuctap.entity.User;
import com.tqt.detaithuctap.repository.UserRepository;
import com.tqt.detaithuctap.security.AppUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    /** Lấy user hiện tại từ SecurityContext; ném lỗi nếu chưa đăng nhập */
    @Transactional(readOnly = true)
    public User currentUserOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Bạn chưa đăng nhập");
        }
        Object principal = auth.getPrincipal();

        if (principal instanceof AppUserDetails aud) {
            return userRepository.findByUsername(aud.getUsername())
                    .orElseThrow(() -> new AccessDeniedException("Không tìm thấy người dùng"));
        }
        if (principal instanceof UserDetails ud) {
            return userRepository.findByUsername(ud.getUsername())
                    .orElseThrow(() -> new AccessDeniedException("Không tìm thấy người dùng"));
        }
        if (principal instanceof String s) {
            if ("anonymousUser".equalsIgnoreCase(s)) {
                throw new AccessDeniedException("Bạn chưa đăng nhập");
            }
            return userRepository.findByUsername(s)
                    .orElseThrow(() -> new AccessDeniedException("Không tìm thấy người dùng"));
        }
        throw new AccessDeniedException("Không xác định được người dùng hiện tại");
    }

    /* ===================== Helpers về role ===================== */

    public boolean hasRole(User u, String roleName) {
        if (u == null || u.getRole() == null || u.getRole().getName() == null) return false;
        String r = u.getRole().getName().toUpperCase(Locale.ROOT);
        return r.equals(roleName.toUpperCase(Locale.ROOT));
    }

    public boolean isAdmin(User u) { return hasRole(u, "ADMIN"); }
    public boolean isSales(User u) { return hasRole(u, "SALES"); }
    public boolean isAccountant(User u) { return hasRole(u, "ACCOUNTANT"); }

    /** Yêu cầu user hiện tại phải thuộc 1 trong các role truyền vào */
    public void requireAnyRole(String... roles) {
        User me = currentUserOrThrow();
        for (String r : roles) {
            if (hasRole(me, r)) return;
        }
        throw new AccessDeniedException("Bạn không có quyền thực hiện thao tác này");
    }

    /* ===================== Quyền truy cập theo nghiệp vụ ===================== */

    /** ADMIN full; SALES chỉ truy cập customer do mình phụ trách (field: owner); ACCOUNTANT: chỉ xem (tùy nơi gọi) */
    public boolean canAccessCustomer(User current, Customer c) {
        if (current == null || c == null) return false;
        if (isAdmin(current)) return true;

        if (isSales(current)) {
            // Customer có field 'owner' (User)
            User owner = c.getOwner();          // ✅ đúng với entity hiện tại
            return owner != null && Objects.equals(owner.getId(), current.getId());
        }
        // ACCOUNTANT mặc định không sở hữu customer
        return false;
    }

    /** ADMIN full; SALES chỉ truy cập contract do mình phụ trách (field: sales); ACCOUNTANT thường được xem (read-only) */
    public boolean canAccessContract(User current, Contract ct) {
        if (current == null || ct == null) return false;
        if (isAdmin(current)) return true;

        if (isSales(current)) {
            // Contract có field 'sales' (User)
            User owner = ct.getSales();         // ✅ đúng với entity hiện tại
            return owner != null && Objects.equals(owner.getId(), current.getId());
        }

        // Cho phép ACCOUNTANT "xem" tuỳ theo ngữ cảnh sử dụng:
        return isAccountant(current);
    }
}
