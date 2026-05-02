package com.tqt.detaithuctap.dto.role;

import com.tqt.detaithuctap.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@AllArgsConstructor @NoArgsConstructor
public class RoleSummary {
    private Long id;
    private String name;
    private Integer permissionCount;

    public static RoleSummary of(Role r) {
        return new RoleSummary(r.getId(), r.getName(), r.getPermissions().size());
    }
}
