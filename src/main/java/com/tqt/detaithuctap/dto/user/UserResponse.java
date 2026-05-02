package com.tqt.detaithuctap.dto.user;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String phone,
        String role,     // "ADMIN" | "SALES" | "ACCOUNTANT"
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
