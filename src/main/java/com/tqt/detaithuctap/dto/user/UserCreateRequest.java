package com.tqt.detaithuctap.dto.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class UserCreateRequest {
    private String username;
    private String password;
    private String fullName;
    private String email;
    private String phone;
    private String roleName; // "ADMIN" | "SALES" | "ACCOUNTANT"
    private Boolean active;  // null => mặc định true
}
