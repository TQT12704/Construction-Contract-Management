package com.tqt.detaithuctap.service;

import com.tqt.detaithuctap.entity.Contract;
import com.tqt.detaithuctap.entity.Notification;
import com.tqt.detaithuctap.entity.Payment;
import com.tqt.detaithuctap.entity.enums.NotificationType;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import com.tqt.detaithuctap.repository.NotificationRepository;
import com.tqt.detaithuctap.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final PaymentRepository paymentRepository;

    /** Quét các đợt UNPAID để tạo notification quá hạn / sắp đến hạn */
    public int scanAndCreateDueNotifications(int daysAhead) {
        LocalDate today = LocalDate.now();
        LocalDate upcoming = today.plusDays(daysAhead);
        int created = 0;

        for (Payment p : paymentRepository.findAll()) {
            if (p.getStatus() != PaymentStatus.UNPAID) continue;
            LocalDate due = p.getPlanDate();
            if (due == null) continue;

            Contract c = p.getContract();
            // KHÔNG gọi getCode() vì entity không có -> dùng id cho chắc chắn
            String contractCode = "HĐ#" + (c != null ? c.getId() : "?");

            if (due.isBefore(today)) {
                if (!notificationRepository.existsByPayment_IdAndType(p.getId(), NotificationType.PAYMENT_OVERDUE)) {
                    Notification n = Notification.builder()
                            .type(NotificationType.PAYMENT_OVERDUE)
                            .payment(p)
                            .contract(c)
                            .title("Đợt thanh toán quá hạn")
                            .message("Đợt thanh toán của " + contractCode + " đã quá hạn từ " + due + ".")
                            .dueDate(due)
                            .daysOverdue((int) (today.toEpochDay() - due.toEpochDay()))
                            .isRead(false)
                            .createdAt(OffsetDateTime.now())
                            .build();
                    notificationRepository.save(n);
                    created++;
                }
            } else if (!due.isAfter(upcoming)) {
                if (!notificationRepository.existsByPayment_IdAndType(p.getId(), NotificationType.PAYMENT_DUE_SOON)) {
                    Notification n = Notification.builder()
                            .type(NotificationType.PAYMENT_DUE_SOON)
                            .payment(p)
                            .contract(c)
                            .title("Đợt thanh toán sắp đến hạn")
                            .message("Đợt thanh toán của " + contractCode + " đến hạn vào " + due + ".")
                            .dueDate(due)
                            .daysOverdue(0)
                            .isRead(false)
                            .createdAt(OffsetDateTime.now())
                            .build();
                    notificationRepository.save(n);
                    created++;
                }
            }
        }
        return created;
    }

    public Page<Notification> search(Boolean isRead, NotificationType type, Pageable pageable) {
        if (type != null && isRead != null) {
            return notificationRepository.findByTypeAndIsRead(type, isRead, pageable);
        } else if (type != null) {
            return notificationRepository.findByType(type, pageable);
        } else if (isRead != null) {
            return notificationRepository.findByIsRead(isRead, pageable);
        } else {
            return notificationRepository.findAll(pageable);
        }
    }

    public void markRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (!n.isRead()) {
                n.setRead(true); // boolean isRead -> setter là setRead(...)
                notificationRepository.save(n);
            }
        });
    }
}
