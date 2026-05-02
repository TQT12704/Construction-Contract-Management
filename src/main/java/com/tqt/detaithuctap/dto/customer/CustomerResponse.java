package com.tqt.detaithuctap.dto.customer;

import java.time.LocalDateTime;

public record CustomerResponse(
        Long id,
        String name,
        String customerGroup, // enum name
        String region,        // enum name
        String phone,
        String email,
        String address,
        String industry,      // NEW
        Long ownerId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) { }
