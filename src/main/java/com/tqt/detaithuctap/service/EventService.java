package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.dto.event.EventCreateRequest;
import com.tqt.detaithuctap.dto.event.EventResponse;
import com.tqt.detaithuctap.dto.event.EventUpdateRequest;
import com.tqt.detaithuctap.entity.*;
import com.tqt.detaithuctap.entity.enums.EventStatus;
import com.tqt.detaithuctap.entity.enums.EventType;
import com.tqt.detaithuctap.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ContractRepository contractRepository;
    private final AuthService authService;

    /* ================= Query ================= */

    @Transactional(readOnly = true)
    public Page<EventResponse> myEvents(String status, String type, LocalDate from, LocalDate to, Pageable pageable) {
        User me = authService.currentUserOrThrow();

        List<Event> base;
        if (from != null || to != null) {
            LocalDateTime start = from != null ? from.atStartOfDay() : LocalDate.now().minusYears(10).atStartOfDay();
            LocalDateTime end   = to   != null ? to.plusDays(1).atStartOfDay() : LocalDate.now().plusYears(10).atStartOfDay();
            base = eventRepository.findByAssigneeAndStartAtBetween(me, start, end, Pageable.unpaged()).getContent();
        } else {
            base = eventRepository.findByAssignee(me, Pageable.unpaged()).getContent();
        }

        EventStatus st = safeParseStatus(status);
        EventType   tp = safeParseType(type);

        List<Event> filtered = base.stream()
                .filter(e -> st == null || e.getStatus() == st)
                .filter(e -> tp == null || e.getType() == tp)
                .sorted(Comparator.comparing(Event::getStartAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        return pageMap(filtered, pageable);
    }

    @Transactional(readOnly = true)
    public Page<EventResponse> listAll(String status, String type, LocalDate from, LocalDate to, Pageable pageable) {
        // Cho phép ADMIN & SALES xem tất cả
        authService.requireAnyRole("ADMIN", "SALES");

        List<Event> all = eventRepository.findAll(Pageable.unpaged()).getContent();

        // Lọc theo khoảng thời gian (an toàn null)
        if (from != null || to != null) {
            LocalDateTime start = from != null ? from.atStartOfDay() : LocalDate.now().minusYears(10).atStartOfDay();
            LocalDateTime end   = to   != null ? to.plusDays(1).atStartOfDay() : LocalDate.now().plusYears(10).atStartOfDay();
            all = all.stream()
                    .filter(e -> {
                        LocalDateTime s = e.getStartAt();
                        return s != null && !s.isBefore(start) && s.isBefore(end);
                    })
                    .collect(Collectors.toList());
        }

        EventStatus st = safeParseStatus(status);
        EventType   tp = safeParseType(type);

        List<Event> filtered = all.stream()
                .filter(e -> st == null || e.getStatus() == st)
                .filter(e -> tp == null || e.getType() == tp)
                .sorted(Comparator.comparing(Event::getStartAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        return pageMap(filtered, pageable);
    }

    /* ================= Mutation ================= */

    @Transactional
    public EventResponse create(EventCreateRequest req) {
        authService.requireAnyRole("ADMIN", "SALES");
        User me = authService.currentUserOrThrow();

        User     assignee = resolveAssignee(req.getAssigneeUserId(), me);
        Customer customer = resolveCustomer(req.getCustomerId());
        Contract contract = resolveContract(req.getContractId());

        Event e = Event.builder()
                .title(req.getTitle())
                .type(req.getType())
                .description(req.getDescription())
                .customer(customer)
                .contract(contract)
                .assignee(assignee)
                .startAt(req.getStartAt())
                .endAt(req.getEndAt())
                .status(Optional.ofNullable(req.getStatus()).orElse(EventStatus.SCHEDULED))
                .notifyByEmail(Boolean.TRUE.equals(req.getNotifyByEmail()))
                .notifyInApp(req.getNotifyInApp() == null ? Boolean.TRUE : req.getNotifyInApp())
                .build();

        return toRes(eventRepository.save(e));
    }

    @Transactional
    public EventResponse update(Long id, EventUpdateRequest req) {
        authService.requireAnyRole("ADMIN", "SALES");
        Event e = eventRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sự kiện"));

        // Cho phép SALES sửa bất kỳ (nếu muốn giới hạn theo assignee, khôi phục kiểm tra cũ)
        if (req.getTitle() != null) e.setTitle(req.getTitle());
        if (req.getDescription() != null) e.setDescription(req.getDescription());
        if (req.getStartAt() != null) e.setStartAt(req.getStartAt());
        if (req.getEndAt() != null) e.setEndAt(req.getEndAt());
        if (req.getStatus() != null) e.setStatus(req.getStatus());
        if (req.getNotifyByEmail() != null) e.setNotifyByEmail(req.getNotifyByEmail());
        if (req.getNotifyInApp() != null) e.setNotifyInApp(req.getNotifyInApp());

        return toRes(eventRepository.save(e));
    }

    @Transactional
    public void delete(Long id) {
        authService.requireAnyRole("ADMIN", "SALES");
        Event e = eventRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sự kiện"));
        eventRepository.delete(e);
    }

    /* ================= Helpers ================= */

    private User resolveAssignee(Long assigneeUserId, User fallback) {
        if (assigneeUserId == null) return fallback;
        return userRepository.findById(assigneeUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user phụ trách"));
    }

    private Customer resolveCustomer(Long customerId) {
        if (customerId == null) return null;
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng"));
    }

    private Contract resolveContract(Long contractId) {
        if (contractId == null) return null;
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hợp đồng"));
    }

    private EventStatus safeParseStatus(String s) {
        if (s == null || s.isBlank() || "ALL".equalsIgnoreCase(s)) return null;
        try { return EventStatus.valueOf(s.toUpperCase()); } catch (Exception ignored) { return null; }
    }

    private EventType safeParseType(String s) {
        if (s == null || s.isBlank() || "ALL".equalsIgnoreCase(s)) return null;
        try { return EventType.valueOf(s.toUpperCase()); } catch (Exception ignored) { return null; }
    }

    private Page<EventResponse> pageMap(List<Event> all, Pageable pageable) {
        int total = all.size();
        int from = (int) Math.min((long) pageable.getOffset(), total);
        int to = Math.min(from + pageable.getPageSize(), total);
        List<Event> slice = all.subList(from, to);
        List<EventResponse> mapped = slice.stream().map(this::toRes).collect(Collectors.toList());
        return new PageImpl<>(mapped, pageable, total);
    }

    private EventResponse toRes(Event e) {
        return EventResponse.builder()
                .id(e.getId())
                .title(e.getTitle())
                .type(e.getType())
                .description(e.getDescription())
                .customerId(e.getCustomer() != null ? e.getCustomer().getId() : null)
                .customerName(e.getCustomer() != null ? e.getCustomer().getName() : null)
                .contractId(e.getContract() != null ? e.getContract().getId() : null)
                .contractCode(e.getContract() != null ? e.getContract().getContractCode() : null)
                .assigneeId(e.getAssignee() != null ? e.getAssignee().getId() : null)
                .assigneeName(e.getAssignee() != null ? e.getAssignee().getFullName() : null)
                .startAt(e.getStartAt())
                .endAt(e.getEndAt())
                .status(e.getStatus())
                .notifyByEmail(Boolean.TRUE.equals(e.getNotifyByEmail()))
                .notifyInApp(Boolean.TRUE.equals(e.getNotifyInApp()))
                .build();
    }
}
