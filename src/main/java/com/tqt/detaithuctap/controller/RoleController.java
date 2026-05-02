package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.role.RoleRequest;
import com.tqt.detaithuctap.dto.role.RoleResponse;
import com.tqt.detaithuctap.dto.role.RoleSummary;
import com.tqt.detaithuctap.dto.role.RoleUpdateRequest;
import com.tqt.detaithuctap.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RoleController {

    private final RoleService service;

    /**
     * - GET /api/roles                -> danh sách [{id,name,permissionCount}]
     * - GET /api/roles?name=SALES     -> chi tiết {id,name,permissions[]}
     */
    @GetMapping
    public Object listOrGetByName(@RequestParam(value = "name", required = false) String name) {
        if (StringUtils.hasText(name)) return service.getByName(name);
        return service.list();
    }

    @GetMapping("/{id}")
    public RoleResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @GetMapping("/permissions")
    public List<String> permissions() {
        return service.listAllPermissionCodes();
    }

    @PostMapping
    public RoleResponse create(@Valid @RequestBody RoleRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public RoleResponse update(@PathVariable Long id, @Valid @RequestBody RoleUpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
