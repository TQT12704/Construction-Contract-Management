package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.PaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Long> {
    List<PaymentHistory> findByContractIdOrderByCreatedAtDesc(Long contractId);
    List<PaymentHistory> findByPaymentIdOrderByCreatedAtDesc(Long paymentId);
}
