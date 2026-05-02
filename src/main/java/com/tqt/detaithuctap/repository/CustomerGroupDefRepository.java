package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.CustomerGroupDef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerGroupDefRepository extends JpaRepository<CustomerGroupDef, Long> {
    Optional<CustomerGroupDef> findByCodeIgnoreCase(String code);
}
