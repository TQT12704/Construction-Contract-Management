package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    boolean existsByUsernameIgnoreCase(String username);
    Optional<User> findByUsername(String username);
}
