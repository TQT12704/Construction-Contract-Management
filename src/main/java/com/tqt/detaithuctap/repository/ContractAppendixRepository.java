package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.ContractAppendix;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractAppendixRepository extends JpaRepository<ContractAppendix, Long> {
    List<ContractAppendix> findByContractIdOrderByIdDesc(Long contractId);
}
