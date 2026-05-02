package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.entity.Notification;
import com.tqt.detaithuctap.entity.enums.NotificationType;
import com.tqt.detaithuctap.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Danh sách thông báo (tuỳ chọn lọc)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public Page<Notification> list(
            @RequestParam(required = false) Boolean isRead,
            @RequestParam(required = false) NotificationType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return notificationService.search(isRead, type, PageRequest.of(page, size));
    }

    // Đếm số chưa đọc (để hiển thị badge)
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public ResponseEntity<Long> unreadCount() {
        long total = notificationService
                .search(false, null, PageRequest.of(0, 1))
                .getTotalElements();
        return ResponseEntity.ok(total);
    }

    // Đánh dấu đã đọc
    @PostMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','SALES')")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(id);
        return ResponseEntity.noContent().build();
    }

    // Quét thủ công để tạo nhắc nhở (nút 🔔 gọi vào)
    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<String> scanNow(@RequestParam(defaultValue = "7") int daysAhead) {
        int created = notificationService.scanAndCreateDueNotifications(daysAhead);
        return ResponseEntity.ok("Created " + created + " notifications.");
    }
}
