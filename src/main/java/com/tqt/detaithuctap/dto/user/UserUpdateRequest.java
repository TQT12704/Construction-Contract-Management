package com.tqt.detaithuctap.dto.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class UserUpdateRequest {
    private String fullName;
    private String email;
    private String phone;
    private String roleName;    // ADMIN-only được đổi
    private Boolean active;     // ADMIN-only được đổi
    private String password;    // optional: ADMIN reset hoặc self-change
}
