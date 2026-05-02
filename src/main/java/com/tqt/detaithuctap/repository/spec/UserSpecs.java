package com.tqt.detaithuctap.repository.spec;

import com.tqt.detaithuctap.entity.User;
import org.springframework.data.jpa.domain.Specification;

public class UserSpecs {

    public static Specification<User> keyword(String q) {
        if (q == null || q.isBlank()) return null;
        String like = "%" + q.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("username")), like),
                cb.like(cb.lower(root.get("fullName")), like),
                cb.like(cb.lower(root.get("email")), like),
                cb.like(cb.lower(root.get("phone")), like)
        );
    }

    /** Vai trò: ADMIN / SALES / ACCOUNTANT */
    public static Specification<User> roleEq(String role) {
        if (role == null || role.isBlank()) return null;
        String r = role.trim().toUpperCase();

        // Bỏ qua nếu UI gửi "Tất cả"/"ALL"
        if ("ALL".equals(r) || "TATCA".equals(r) || "TẤT CẢ".equals(role)) return null;

        return (root, query, cb) -> {
            // Thử TH1: User.role là ManyToOne Role -> join("role").get("name")
            try {
                return cb.equal(
                        cb.upper(root.join("role").get("name").as(String.class)),
                        r
                );
            } catch (IllegalArgumentException ex) {
                // TH2: User.role là Enum/String trực tiếp trên User
                return cb.equal(
                        cb.upper(root.get("role").as(String.class)),
                        r
                );
            }
        };
    }

    /** Trạng thái: ACTIVE/INACTIVE hoặc true/false/1/0 (UI chọn "Tất cả" => bỏ lọc) */
    public static Specification<User> statusEq(String status) {
        if (status == null || status.isBlank()) return null;
        String s = status.trim().toUpperCase();
        if ("ALL".equals(s) || "TATCA".equals(s) || "TẤT CẢ".equals(status)) return null;

        Boolean active =
                ("ACTIVE".equals(s) || "TRUE".equals(s) || "1".equals(s)) ? Boolean.TRUE :
                        ("INACTIVE".equals(s) || "FALSE".equals(s) || "0".equals(s)) ? Boolean.FALSE : null;

        if (active == null) return null;
        return (root, query, cb) -> cb.equal(root.get("active"), active);
    }
}
