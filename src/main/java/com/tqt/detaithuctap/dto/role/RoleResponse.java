package com.tqt.detaithuctap.dto.role;

import com.tqt.detaithuctap.entity.Permission;
import com.tqt.detaithuctap.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter @Setter
@AllArgsConstructor @NoArgsConstructor
public class RoleResponse {
    private Long id;
    private String name;
    private List<String> permissions;

    public static RoleResponse from(Role r) {
        List<String> codes = r.getPermissions()
                .stream()
                .map(Permission::getCode)
                .sorted()
                .toList();
        return new RoleResponse(r.getId(), r.getName(), codes);
    }
}
