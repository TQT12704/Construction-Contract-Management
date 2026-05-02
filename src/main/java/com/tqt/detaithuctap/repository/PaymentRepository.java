package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Danh sách payment theo hợp đồng, sắp xếp id tăng dần
    List<Payment> findByContract_IdOrderByIdAsc(Long contractId);
    List<Payment> findByContract_Id(Long contractId);
    List<Payment> findByContractId(Long contractId);

    // Tổng tiền theo contract + status (đã dùng ở ContractService)
    @Query("""
           select coalesce(sum(p.amount),0)
           from Payment p
           where p.contract.id = :contractId
             and p.status = :status
           """)
    BigDecimal sumByContractAndStatus(Long contractId, PaymentStatus status);

    // Tổng theo nhiều contract ids + status (group by từng contract)
    @Query("""
           select p.contract.id as cid, coalesce(sum(p.amount),0) as paid
           from Payment p
           where p.status = :status
             and p.contract.id in :contractIds
           group by p.contract.id
           """)
    List<Object[]> sumByContractIdsAndStatus(Collection<Long> contractIds, PaymentStatus status);

    // Đếm số đợt + tổng DỰ KIẾN theo nhiều contract ids
    @Query("""
           select p.contract.id as cid, count(p) as installments, coalesce(sum(p.amount),0) as planned
           from Payment p
           where p.contract.id in :contractIds
           group by p.contract.id
           """)
    List<Object[]> countAndSumByContractIds(Collection<Long> contractIds);

    // Đếm số đợt + tổng DỰ KIẾN cho 1 contract
    @Query("""
           select count(p), coalesce(sum(p.amount),0)
           from Payment p
           where p.contract.id = :contractId
           """)
    Object[] countAndSumByContract(Long contractId);

    // Tổng THỰC THU (nếu actualAmount null thì dùng amount) cho các đợt đã PAID của 1 contract
    @Query("""
           select coalesce(sum(coalesce(p.actualAmount, p.amount)),0)
           from Payment p
           where p.contract.id = :contractId
             and p.status = com.tqt.detaithuctap.entity.enums.PaymentStatus.PAID
           """)
    BigDecimal sumPaidActual(Long contractId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.contract.id = :contractId")
    BigDecimal sumByContractId(@Param("contractId") Long contractId);

    // **BỔ SUNG**: Tổng THỰC THU toàn hệ thống (chỉ tính các đợt đã PAID)
    @Query("""
           select coalesce(sum(coalesce(p.actualAmount, p.amount)),0)
           from Payment p
           where p.status = com.tqt.detaithuctap.entity.enums.PaymentStatus.PAID
           """)
    BigDecimal sumPaidActualAll();
}
