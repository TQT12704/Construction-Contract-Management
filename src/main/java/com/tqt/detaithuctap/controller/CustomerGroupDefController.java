package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.entity.CustomerGroupDef;
import com.tqt.detaithuctap.repository.CustomerGroupDefRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/customer-groups")
@RequiredArgsConstructor
public class CustomerGroupDefController {

    private final CustomerGroupDefRepository repo;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES','ACCOUNTANT')")
    public ResponseEntity<List<CustomerGroupDef>> list() {
        List<CustomerGroupDef> all = repo.findAll();
        all.sort(Comparator.comparing(CustomerGroupDef::getName, String.CASE_INSENSITIVE_ORDER));
        return ResponseEntity.ok(all);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CustomerGroupDef> create(@RequestBody CustomerGroupDef body) {
        body.setId(null);
        return ResponseEntity.ok(repo.save(body));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CustomerGroupDef> update(@PathVariable Long id, @RequestBody CustomerGroupDef body) {
        CustomerGroupDef g = repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Group not found"));
        if (body.getCode() != null) g.setCode(body.getCode());
        if (body.getName() != null) g.setName(body.getName());
        g.setNote(body.getNote());
        return ResponseEntity.ok(repo.save(g));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
