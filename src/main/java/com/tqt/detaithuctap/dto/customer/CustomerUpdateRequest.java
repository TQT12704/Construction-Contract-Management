package com.tqt.detaithuctap.dto.customer;

import lombok.Data;

@Data
public class CustomerUpdateRequest {
    private String name;
    private String customerGroup;
    private String region;
    private String address;
    private String contactPerson;
    private String phone;
    private String email;
    private String industry; // NEW
    private Long ownerId;
}
