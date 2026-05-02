package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    Set<Permission> findByCodeIn(Collection<String> codes);

    @Query("select p.code from Permission p")
    List<String> findAllCodes();
}
