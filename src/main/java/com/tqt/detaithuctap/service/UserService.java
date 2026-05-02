package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.user.UserCreateRequest;
import com.tqt.detaithuctap.dto.user.UserResponse;
import com.tqt.detaithuctap.dto.user.UserUpdateRequest;
import com.tqt.detaithuctap.entity.User;
import com.tqt.detaithuctap.repository.UserRepository;
import com.tqt.detaithuctap.security.AppUserDetails;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.tqt.detaithuctap.repository.spec.UserSpecs.*;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repo;
    private final PasswordEncoder passwordEncoder;

    /* =================== SEARCH =================== */

    public Page<UserResponse> search(String q, String role, String status, Pageable pageable) {
        Specification<User> spec = Specification.allOf(
                keyword(q),
                roleEq(role),
                statusEq(status)
        );
        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    /** Overload nếu bạn muốn gọi theo page/size thay vì Pageable */
    public Page<UserResponse> search(String q, String role, String status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "id"));
        return search(q, role, status, pageable);
    }

    /* ======================== CRUD ======================= */

    @Transactional
    public UserResponse create(UserCreateRequest req) {
        String username = req.getUsername() == null ? null : req.getUsername().trim();
        if (username == null || username.isEmpty()) throw new IllegalArgumentException("Username is required");
        if (req.getPassword() == null || req.getPassword().isBlank()) throw new IllegalArgumentException("Password is required");
        if (repo.existsByUsernameIgnoreCase(username)) throw new IllegalArgumentException("Username already exists");

        User u = new User();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode(req.getPassword()));
        u.setFullName(trimToNull(req.getFullName()));
        u.setEmail(trimToNull(req.getEmail()));
        u.setPhone(trimToNull(req.getPhone()));

        // role
        String rn = (req.getRoleName() == null ? "SALES" : req.getRoleName().trim().toUpperCase());
        setRoleAsStringOrEnum(u, rn);

        // active
        u.setActive(req.getActive() == null ? true : req.getActive());

        try {
            return toResponse(repo.save(u));
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalArgumentException("Username/email already exists");
        }
    }

    public UserResponse findOne(Long id) {
        User u = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found"));
        return toResponse(u);
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest req) {
        User u = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found"));

        boolean isAdmin = hasRole("ADMIN");
        boolean isSelf = currentUserId().equals(u.getId());

        // Ai cũng được đổi profile của chính mình
        if (req.getFullName() != null) u.setFullName(trimToNull(req.getFullName()));
        if (req.getEmail() != null)    u.setEmail(trimToNull(req.getEmail()));
        if (req.getPhone() != null)    u.setPhone(trimToNull(req.getPhone()));

        // Đổi password: ADMIN có thể reset; user chỉ đổi của chính mình
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            if (isAdmin || isSelf) {
                u.setPassword(passwordEncoder.encode(req.getPassword()));
            } else {
                throw new IllegalArgumentException("Forbidden: cannot change other's password");
            }
        }

        // Đổi role/active: chỉ ADMIN
        if (req.getRoleName() != null) {
            if (!isAdmin) throw new IllegalArgumentException("Only ADMIN can change role");
            setRoleAsStringOrEnum(u, req.getRoleName().trim().toUpperCase());
        }
        if (req.getActive() != null) {
            if (!isAdmin) throw new IllegalArgumentException("Only ADMIN can change status");
            u.setActive(req.getActive());
        }

        return toResponse(repo.save(u));
    }

    @Transactional
    public void delete(Long id) {
        User u = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("User not found"));
        if (!hasRole("ADMIN")) throw new IllegalArgumentException("Only ADMIN can delete users");
        if (currentUserId().equals(u.getId())) throw new IllegalArgumentException("You cannot delete yourself");
        repo.delete(u);
    }

    /* ==================== Helpers ==================== */

    private String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities() != null
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) throw new AccessDeniedException("Unauthenticated");
        Object p = auth.getPrincipal();
        if (p instanceof AppUserDetails aud) return aud.getUser().getId();
        if (p instanceof String s) throw new AccessDeniedException("Unauthenticated: " + s);
        throw new AccessDeniedException("Unsupported principal type: " + p.getClass());
    }

    private UserResponse toResponse(User u) {
        String roleStr = extractRoleAsString(u); // ADMIN/SALES/ACCOUNTANT
        return new UserResponse(
                u.getId(),
                u.getUsername(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                roleStr,
                u.getActive(),
                u.getCreatedAt(),
                u.getUpdatedAt()
        );
    }

    /* ====== Role adapters: tương thích entity role dạng Enum hoặc Role entity ====== */
    @SuppressWarnings("unchecked")
    private void setRoleAsStringOrEnum(User u, String roleUpper) {
        try {
            // Enum: com.tqt.detaithuctap.entity.enums.Role
            Class<?> enumClz = Class.forName("com.tqt.detaithuctap.entity.enums.Role");
            Object enumVal = Enum.valueOf((Class<Enum>) enumClz, roleUpper);
            u.getClass().getMethod("setRole", enumClz).invoke(u, enumVal);
            return;
        } catch (Throwable ignored) {}
        try {
            // Enum: com.tqt.detaithuctap.entity.enums.RoleName
            Class<?> enumClz = Class.forName("com.tqt.detaithuctap.entity.enums.RoleName");
            Object enumVal = Enum.valueOf((Class<Enum>) enumClz, roleUpper);
            u.getClass().getMethod("setRole", enumClz).invoke(u, enumVal);
            return;
        } catch (Throwable ignored) {}
        try {
            // Role entity có setRoleName(String)
            u.getClass().getMethod("setRoleName", String.class).invoke(u, roleUpper);
            return;
        } catch (Throwable ignored) {}
        try {
            // Role entity có setRole(String)
            u.getClass().getMethod("setRole", String.class).invoke(u, roleUpper);
        } catch (Throwable e) {
            throw new IllegalArgumentException("Cannot set role on User entity: missing setter");
        }
    }

    private String extractRoleAsString(User u) {
        try {
            Object r = u.getClass().getMethod("getRole").invoke(u);
            if (r == null) return null;

            // Nếu Role entity: có getName()
            try {
                Object name = r.getClass().getMethod("getName").invoke(r);
                if (name != null) return name.toString();
            } catch (NoSuchMethodException ignore) {}

            // Nếu Enum
            if (r instanceof Enum<?> e) return e.name();

            // Fallback: toString() kiểu Role(id=1, name=ADMIN)
            String s = r.toString();
            int i = s.indexOf("name=");
            if (i >= 0) {
                int j = s.indexOf(')', i);
                String val = (j > i) ? s.substring(i + 5, j) : s.substring(i + 5);
                return val.trim();
            }
            return s;
        } catch (Throwable ignored) {}

        try {
            Object s = u.getClass().getMethod("getRoleName").invoke(u);
            if (s != null) return s.toString();
        } catch (Throwable ignored) {}

        return null;
    }
}
