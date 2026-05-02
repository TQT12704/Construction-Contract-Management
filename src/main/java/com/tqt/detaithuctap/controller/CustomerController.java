package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.customer.CustomerCreateRequest;
import com.tqt.detaithuctap.dto.customer.CustomerResponse;
import com.tqt.detaithuctap.dto.customer.CustomerUpdateRequest;
import com.tqt.detaithuctap.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000","http://localhost:3003","http://localhost:3005"})
public class CustomerController {

    private final CustomerService service;

    /** SALE + ADMIN: xem tất cả khách hàng (ownerId chỉ là filter tùy chọn) */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<Page<CustomerResponse>> findAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String group,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) Long ownerId,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(service.search(q, group, region, industry, ownerId, pageable));
    }

    /** SALE + ADMIN: xem chi tiết bất kỳ khách hàng nào */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<CustomerResponse> findOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findOne(id));
    }

    /** SALE + ADMIN: tạo khách hàng (không ràng buộc owner) */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<CustomerResponse> create(@RequestBody CustomerCreateRequest req) {
        return ResponseEntity.ok(service.create(req));
    }

    /** SALE + ADMIN: cập nhật khách hàng bất kỳ */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<CustomerResponse> update(@PathVariable Long id, @RequestBody CustomerUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    /** SALE + ADMIN: xoá khách hàng (đổi từ chỉ-ADMIN thành cả SALES) */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
