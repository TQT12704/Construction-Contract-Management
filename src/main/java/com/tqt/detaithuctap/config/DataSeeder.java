package com.tqt.detaithuctap.config;

import com.tqt.detaithuctap.entity.Permission;
import com.tqt.detaithuctap.entity.Role;
import com.tqt.detaithuctap.repository.PermissionRepository;
import com.tqt.detaithuctap.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final PermissionRepository permRepo;
    private final RoleRepository roleRepo;

    @Override
    @Transactional
    public void run(String... args) {
        // 1) Toàn bộ permission codes
        List<String> allCodes = List.of(
                "CUSTOMER_READ","CUSTOMER_CREATE","CUSTOMER_UPDATE","CUSTOMER_DELETE","CUSTOMER_WRITE",
                "CONTRACT_READ","CONTRACT_CREATE","CONTRACT_UPDATE","CONTRACT_APPROVE","CONTRACT_WRITE",
                "PAYMENT_READ","PAYMENT_CREATE","PAYMENT_MARK_PAID","PAYMENT_DELETE","PAYMENT_WRITE",
                "REPORT_VIEW","REPORT_EXPORT","REPORT_FINANCE_VIEW",
                "USER_MANAGE","USER_READ","USER_WRITE",
                "ROLE_READ","ROLE_WRITE",
                "SYSTEM_CONFIG","SYSTEM_AUDIT_VIEW"
        );

        // 2) Seed permissions còn thiếu (batch)
        seedPermissionsIfMissing(allCodes);

        // 3) Quyền mặc định theo rule SecurityConfig
        List<String> salesPerms = List.of(
                "CUSTOMER_READ","CUSTOMER_CREATE","CUSTOMER_UPDATE",
                "CONTRACT_READ","CONTRACT_CREATE",
                "PAYMENT_READ","PAYMENT_CREATE",
                "REPORT_VIEW"
        );
        List<String> accountantPerms = List.of(
                "CONTRACT_READ",
                "PAYMENT_READ","PAYMENT_MARK_PAID","PAYMENT_DELETE",
                "REPORT_VIEW","REPORT_FINANCE_VIEW","SYSTEM_AUDIT_VIEW"
        );

        // 4) Upsert roles (tạo mới nếu chưa có; nếu có thì chỉ BỔ SUNG quyền còn thiếu)
        upsertRoleWithPerms("ADMIN", allCodes);          // ADMIN: mọi quyền
        upsertRoleWithPerms("SALES", salesPerms);
        upsertRoleWithPerms("ACCOUNTANT", accountantPerms);
    }

    private void seedPermissionsIfMissing(List<String> allCodes) {
        // Repo của bạn trả về Set<Permission> -> dùng Collection cho an toàn
        Collection<Permission> existing = permRepo.findByCodeIn(allCodes);
        Set<String> existingCodes = existing.stream().map(Permission::getCode).collect(Collectors.toSet());

        List<Permission> toCreate = new ArrayList<>();
        for (String code : allCodes) {
            if (!existingCodes.contains(code)) {
                Permission p = new Permission();
                p.setCode(code);
                toCreate.add(p);
            }
        }
        if (!toCreate.isEmpty()) {
            permRepo.saveAll(toCreate); // saveAll nhận Iterable -> List ok
        }
    }

    private void upsertRoleWithPerms(String roleName, List<String> permCodes) {
        // Lấy Permission theo mã → ép về Set để khớp Role.permissions (Set)
        Set<Permission> permSet = new HashSet<>(permRepo.findByCodeIn(permCodes));

        // Nếu repo của bạn KHÔNG có findByNameIgnoreCase, đổi về findByName(roleName)
        roleRepo.findByNameIgnoreCase(roleName).ifPresentOrElse(existingRole -> {
            boolean changed = false;
            Set<Permission> current = existingRole.getPermissions();
            if (current == null) {
                current = new HashSet<>();
                existingRole.setPermissions(current); // setter nhận Set<Permission>
                changed = true;
            }
            // so sánh theo code để tránh trùng instance khác nhau
            Set<String> haveCodes = current.stream().map(Permission::getCode).collect(Collectors.toSet());
            for (Permission p : permSet) {
                if (!haveCodes.contains(p.getCode())) {
                    current.add(p);
                    changed = true;
                }
            }
            if (changed) roleRepo.save(existingRole);
        }, () -> {
            Role r = new Role();
            r.setName(roleName.toUpperCase(Locale.ROOT));
            r.setPermissions(new HashSet<>(permSet)); // setter nhận Set<Permission>
            roleRepo.save(r);
        });
    }
}
