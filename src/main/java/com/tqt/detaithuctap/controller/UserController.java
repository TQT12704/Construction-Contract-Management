package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.user.UserCreateRequest;
import com.tqt.detaithuctap.dto.user.UserResponse;
import com.tqt.detaithuctap.dto.user.UserUpdateRequest;
import com.tqt.detaithuctap.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // LIST + SEARCH (q, role, status, page, size)
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')") // mở rộng nếu cần
    public Page<UserResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false, name = "status") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        if (page < 0) page = 0;
        if (size <= 0) size = 10;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return userService.search(q, role, status, pageable);
    }

    // DETAIL
    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return userService.findOne(id);
    }

    // CREATE (Admin)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest req) {
        return ResponseEntity.ok(userService.create(req));
    }

    // UPDATE (service tự kiểm tra quyền: ADMIN hoặc self)
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody UserUpdateRequest req) {
        return ResponseEntity.ok(userService.update(id, req));
    }

    // DELETE (Admin)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
