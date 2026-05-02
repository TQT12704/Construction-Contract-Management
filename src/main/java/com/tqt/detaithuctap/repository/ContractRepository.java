package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {
    Optional<Contract> findByContractCode(String code);
    List<Contract> findBySales_Id(Long salesId);
    List<Contract> findByStatus(ContractStatus status);
    List<Contract> findByCustomer_NameContainingIgnoreCase(String q);
    List<Contract> findBySales_IdAndStatus(Long salesId, ContractStatus status);

    // NEW #1: Đếm số hợp đồng theo trạng thái
    long countByStatus(ContractStatus status);

    // NEW #2: Tổng giá trị tất cả hợp đồng
    @Query("select coalesce(sum(c.totalAmount), 0) from Contract c")
    BigDecimal sumTotalValue();
}
