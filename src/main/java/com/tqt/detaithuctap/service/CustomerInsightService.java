package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.customer.CustomerDetailResponse;
import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Customer;
import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class CustomerInsightService {

    @PersistenceContext
    private final EntityManager em;

    private Customer findCustomer(Long id) {
        Customer c = em.find(Customer.class, id);
        if (c == null) throw new EntityNotFoundException("Customer not found");
        return c;
    }

    public CustomerDetailResponse getDetail(Long customerId) {
        Customer c = findCustomer(customerId);

        // Tổng số HĐ và tổng giá trị
        long totalContracts = count(
                "select count(c) from Contract c where c.customer.id = :cid", customerId
        ).longValue();
        BigDecimal totalAmount = sum(
                "select coalesce(sum(c.totalAmount),0) from Contract c where c.customer.id = :cid", customerId
        );

        // Đếm theo trạng thái ổn định
        long completed = countByStatus(customerId, ContractStatus.COMPLETED);
        long cancelled = countByStatus(customerId, ContractStatus.CANCELLED);
        long doing = Math.max(0, totalContracts - completed - cancelled);

        // Tổng đã thu
        BigDecimal totalPaid = sum("""
            select coalesce(sum(p.amount),0)
            from Payment p
            where p.status = :paid and p.contract.customer.id = :cid
        """, customerId, PaymentStatus.PAID);

        // Còn lại = tổng HĐ - đã thu (không âm)
        BigDecimal remaining = nz(totalAmount).subtract(nz(totalPaid));
        if (remaining.signum() < 0) remaining = BigDecimal.ZERO;

        // HĐ gần đây
        List<Contract> recentContracts = em.createQuery("""
            select c from Contract c
            where c.customer.id = :cid
            order by c.signedDate desc nulls last, c.id desc
        """, Contract.class)
                .setParameter("cid", customerId)
                .setMaxResults(5)
                .getResultList();

        // Thanh toán gần đây
        List<Payment> recentPayments = em.createQuery("""
            select p from Payment p
            where p.contract.customer.id = :cid
            order by p.paymentDate desc nulls last, p.id desc
        """, Payment.class)
                .setParameter("cid", customerId)
                .setMaxResults(10)
                .getResultList();

        return CustomerDetailResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .email(c.getEmail())
                .phone(c.getPhone())
                .address(c.getAddress())
                .industry(c.getIndustry()) // NEW
                .groupName(c.getCustomerGroup() == null ? null : String.valueOf(c.getCustomerGroup()))
                .region(c.getRegion() == null ? null : String.valueOf(c.getRegion()))
                .totalContracts(totalContracts)
                .totalContractAmount(nz(totalAmount))
                .activeContracts(doing)
                .completedContracts(completed)
                .cancelledContracts(cancelled)
                .totalPaidAmount(nz(totalPaid))
                .remainingAmount(remaining)
                .recentContracts(recentContracts.stream().map(rc ->
                        CustomerDetailResponse.RecentContract.builder()
                                .id(rc.getId())
                                .contractCode(rc.getContractCode())
                                .title(rc.getTitle())
                                .totalAmount(rc.getTotalAmount())
                                .status(rc.getStatus())
                                .signedDate(rc.getSignedDate())
                                .build()
                ).toList())
                .recentPayments(recentPayments.stream().map(p ->
                        CustomerDetailResponse.RecentPayment.builder()
                                .id(p.getId())
                                .contractId(p.getContract() == null ? null : p.getContract().getId())
                                .contractCode(p.getContract() == null ? null : p.getContract().getContractCode())
                                .amount(p.getAmount())
                                .status(p.getStatus())
                                .paymentDate(p.getPaymentDate())
                                .confirmedByName(p.getConfirmedBy() == null ? null : p.getConfirmedBy().getFullName())
                                .build()
                ).toList())
                .build();
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private BigDecimal sum(String jpql, Long customerId) {
        var q = em.createQuery(jpql, BigDecimal.class).setParameter("cid", customerId);
        return q.getSingleResult();
    }

    private BigDecimal sum(String jpql, Long customerId, PaymentStatus status) {
        var q = em.createQuery(jpql, BigDecimal.class)
                .setParameter("cid", customerId)
                .setParameter("paid", status);
        return q.getSingleResult();
    }

    private Number count(String jpql, Long customerId) {
        var q = em.createQuery(jpql, Number.class).setParameter("cid", customerId);
        return q.getSingleResult();
    }

    private long countByStatus(Long customerId, ContractStatus st) {
        var q = em.createQuery("""
            select count(c) from Contract c
            where c.customer.id = :cid and c.status = :st
        """, Number.class)
                .setParameter("cid", customerId)
                .setParameter("st", st);
        return q.getSingleResult().longValue();
    }
}
