// ===== File: EventController.java =====
package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.event.EventCreateRequest;
import com.tqt.detaithuctap.dto.event.EventResponse;
import com.tqt.detaithuctap.dto.event.EventUpdateRequest;
import com.tqt.detaithuctap.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService service;

    /**
     * 🔹 Endpoint CHUNG cho FE:
     * ADMIN & SALES xem TẤT CẢ sự kiện trong khoảng ngày (không ràng buộc owner).
     * FE nên luôn gọi endpoint này.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<Page<EventResponse>> listAllForFe(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Pageable pageable
    ) {
        // Dùng service.listAll(...) để trả toàn bộ theo filter
        return ResponseEntity.ok(service.listAll(status, type, from, to, pageable));
    }

    /** SALES xem sự kiện của chính mình (để tương thích nếu nơi khác còn gọi) */
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<Page<EventResponse>> myEvents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Pageable pageable
    ) {
        return ResponseEntity.ok(service.myEvents(status, type, from, to, pageable));
    }

    /** ADMIN/ACCOUNTANT xem toàn bộ (legacy). FE KHÔNG CẦN gọi endpoint này nữa */
    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<Page<EventResponse>> listAllAdmin(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Pageable pageable
    ) {
        return ResponseEntity.ok(service.listAll(status, type, from, to, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<EventResponse> create(@RequestBody EventCreateRequest req) {
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<EventResponse> update(@PathVariable Long id, @RequestBody EventUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
