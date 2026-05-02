package com.tqt.detaithuctap.dto.customer;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerCreateRequest {
    @NotBlank
    private String name;
    private String customerGroup; // NORMAL | VIP | POTENTIAL ...
    private String region;        // NORTH | CENTRAL | SOUTH | OTHER
    private String address;
    private String contactPerson;
    private String phone;
    private String email;
    private String industry;      // NEW
    private Long ownerId;         // optional
}
