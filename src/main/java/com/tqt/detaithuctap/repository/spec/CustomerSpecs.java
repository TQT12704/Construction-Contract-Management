package com.tqt.detaithuctap.repository.spec;

import com.tqt.detaithuctap.entity.Customer;
import com.tqt.detaithuctap.entity.enums.Region;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public final class CustomerSpecs {

    private CustomerSpecs() {}

    /** Ghép tất cả filter: q (từ khóa), group, region, ownerId (nếu truyền) */
    public static Specification<Customer> filter(String q, String group, String region, Long ownerId) {
        return Specification.allOf(
                keyword(q),
                byGroup(group),
                byRegion(region),
                byOwnerId(ownerId)
        );
    }

    /** Tìm tự do trên: name, phone, email, address, industry, (tùy chọn) taxCode, contactPerson */
    public static Specification<Customer> keyword(String q) {
        if (q == null || q.trim().isEmpty()) return null;
        final String kw = q.trim().toLowerCase();

        return (root, /*query*/_, cb) -> {
            List<Predicate> ors = new ArrayList<>();

            ors.add(cb.like(cb.lower(root.get("name")), "%" + kw + "%"));

            if (hasAttr(root, "phone")) {
                ors.add(cb.like(cb.lower(root.get("phone")), "%" + kw + "%"));
            }
            if (hasAttr(root, "email")) {
                ors.add(cb.like(cb.lower(root.get("email")), "%" + kw + "%"));
            }
            if (hasAttr(root, "address")) {
                ors.add(cb.like(cb.lower(root.get("address")), "%" + kw + "%"));
            }
            // ✅ industry (ngành nghề) – để thanh tìm kiếm chung bắt được
            if (hasAttr(root, "industry")) {
                ors.add(cb.like(cb.lower(root.get("industry")), "%" + kw + "%"));
            }
            if (hasAttr(root, "taxCode")) {
                ors.add(cb.like(cb.lower(root.get("taxCode")), "%" + kw + "%"));
            }
            if (hasAttr(root, "contactPerson")) {
                ors.add(cb.like(cb.lower(root.get("contactPerson")), "%" + kw + "%"));
            }

            return cb.or(ors.toArray(new Predicate[0]));
        };
    }

    /** Lọc theo customerGroup (VIP/POTENTIAL/NORMAL/...) */
    public static Specification<Customer> byGroup(String group) {
        if (group == null || group.isEmpty()) return null;
        return (root, _ , cb) -> cb.equal(root.get("customerGroup"), group);
    }

    /** Lọc theo Region (enum). Nếu region không hợp lệ → predicate FALSE (disjunction). */
    public static Specification<Customer> byRegion(String region) {
        if (region == null || region.isEmpty()) return null;
        return (root, _ , cb) -> {
            try {
                Region reg = Region.valueOf(region);
                return cb.equal(root.get("region"), reg);
            } catch (Exception ex) {
                return cb.disjunction();
            }
        };
    }

    /** Lọc theo chủ sở hữu (sales) nếu có */
    public static Specification<Customer> byOwnerId(Long ownerId) {
        if (ownerId == null) return null;
        return (root, _ , cb) -> cb.equal(root.get("owner").get("id"), ownerId);
    }

    /** Tiện ích: kiểm tra thuộc tính tồn tại để tránh lỗi khi schema đang thay đổi */
    private static boolean hasAttr(jakarta.persistence.criteria.Root<Customer> root, String name) {
        try {
            root.get(name);
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
