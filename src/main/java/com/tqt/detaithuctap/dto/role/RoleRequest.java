package com.tqt.detaithuctap.dto.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter
public class RoleRequest {
    @NotBlank
    private String name;

    @NotNull
    private List<String> permissions;
}
