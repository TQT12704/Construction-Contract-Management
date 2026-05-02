package com.tqt.detaithuctap.repository.spec;

import com.tqt.detaithuctap.entity.Contract;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class ContractSpecs {

    public static Specification<Contract> hasKeyword(String q) {
        return (root, cq, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("contractCode")), like),
                    cb.like(cb.lower(root.get("title")), like),
                    // tên khách hàng từ quan hệ: contract.customer.name
                    cb.like(cb.lower(root.get("customer").get("name")), like),
                    // tên người phụ trách (sales): contract.sales.fullName
                    // nếu User dùng "name" thay vì "fullName", đổi ".get(\"fullName\")" -> ".get(\"name\")"
                    cb.like(cb.lower(root.get("sales").get("fullName")), like)
            );
        };
    }

    public static Specification<Contract> hasStatus(String status) {
        return (root, cq, cb) -> {
            if (status == null || status.isBlank()) return cb.conjunction();
            // giữ nguyên so sánh lowercase theo code gốc của bạn
            return cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase());
        };
    }

    public static Specification<Contract> hasType(String type) {
        return (root, cq, cb) -> {
            if (type == null || type.isBlank()) return cb.conjunction();
            // giữ nguyên so sánh lowercase theo code gốc của bạn
            return cb.equal(cb.lower(root.get("contractType")), type.trim().toLowerCase());
        };
    }

    public static Specification<Contract> signedFrom(LocalDate from) {
        return (root, cq, cb) -> {
            if (from == null) return cb.conjunction();
            return cb.greaterThanOrEqualTo(root.get("signedDate"), from);
        };
    }

    public static Specification<Contract> signedTo(LocalDate to) {
        return (root, cq, cb) -> {
            if (to == null) return cb.conjunction();
            return cb.lessThanOrEqualTo(root.get("signedDate"), to);
        };
    }

    public static Specification<Contract> salesIdEq(Long salesId) {
        return (root, cq, cb) -> {
            if (salesId == null) return cb.conjunction();
            return cb.equal(root.get("sales").get("id"), salesId);
        };
    }

    public static Specification<Contract> customerIdEq(Long customerId) {
        return (root, cq, cb) -> {
            if (customerId == null) return cb.conjunction();
            return cb.equal(root.get("customer").get("id"), customerId);
        };
    }
}
