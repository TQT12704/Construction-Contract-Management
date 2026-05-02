package com.tqt.detaithuctap.dto.customer;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerDto {
    private Long id;
    private String name;
    private String customerGroup; // VIP/POTENTIAL/NORMAL
    private String region;        // NORTH/CENTRAL/SOUTH/OTHER
    private String address;
    private String contactPerson;
    private String phone;
    private String email;
    private Long ownerId;
    private String ownerName;
}
