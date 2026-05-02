package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.role.RoleRequest;
import com.tqt.detaithuctap.dto.role.RoleResponse;
import com.tqt.detaithuctap.dto.role.RoleSummary;
import com.tqt.detaithuctap.dto.role.RoleUpdateRequest;
import com.tqt.detaithuctap.entity.Permission;
import com.tqt.detaithuctap.entity.Role;
import com.tqt.detaithuctap.repository.PermissionRepository;
import com.tqt.detaithuctap.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepo;
    private final PermissionRepository permRepo;

    /** không cho xoá/đổi tên các role mặc định */
    private static final Set<String> PROTECTED_ROLES = Set.of("ADMIN", "SALES", "ACCOUNTANT");

    public static String normalizeName(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.toUpperCase(Locale.ROOT).startsWith("ROLE_")) s = s.substring(5);
        return s.toUpperCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public List<RoleSummary> list() {
        return roleRepo.findAll(Sort.by("name")).stream().map(RoleSummary::of).toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse get(Long id) {
        Role r = roleRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        return RoleResponse.from(r);
    }

    @Transactional(readOnly = true)
    public RoleResponse getByName(String name) {
        String n = normalizeName(name);
        if (!StringUtils.hasText(n)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu tên vai trò");
        }
        Role r = roleRepo.findByNameIgnoreCase(n)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        return RoleResponse.from(r);
    }

    @Transactional
    public RoleResponse create(RoleRequest req) {
        String name = normalizeName(req.getName());
        if (!StringUtils.hasText(name)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên vai trò không hợp lệ");
        }
        if (roleRepo.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role đã tồn tại: " + name);
        }
        Set<Permission> perms = loadPerms(req.getPermissions());
        Role r = new Role();
        r.setName(name);
        r.setPermissions(perms);
        r = roleRepo.save(r);
        return RoleResponse.from(r);
    }

    @Transactional
    public RoleResponse update(Long id, RoleUpdateRequest req) {
        Role r = roleRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role không tồn tại"));

        String name = normalizeName(req.getName());
        if (!r.getName().equalsIgnoreCase(name) && roleRepo.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role đã tồn tại: " + name);
        }
        if (PROTECTED_ROLES.contains(r.getName().toUpperCase(Locale.ROOT)) && !r.getName().equalsIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không đổi tên vai trò mặc định");
        }

        r.setName(name);
        r.setPermissions(loadPerms(req.getPermissions()));
        r = roleRepo.save(r);
        return RoleResponse.from(r);
    }

    @Transactional
    public void delete(Long id) {
        Role r = roleRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        if (PROTECTED_ROLES.contains(r.getName().toUpperCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể xoá vai trò mặc định");
        }
        roleRepo.delete(r);
    }

    @Transactional(readOnly = true)
    public List<String> listAllPermissionCodes() {
        return permRepo.findAllCodes();
    }

    private Set<Permission> loadPerms(List<String> codes) {
        if (codes == null || codes.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách quyền trống");
        Set<Permission> perms = permRepo.findByCodeIn(codes);
        if (perms.size() != new HashSet<>(codes).size()) {
            Set<String> missing = new HashSet<>(codes);
            perms.forEach(p -> missing.remove(p.getCode()));
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Permission không tồn tại: " + missing);
        }
        return perms;
    }
}
