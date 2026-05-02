package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.Notification;
import com.tqt.detaithuctap.entity.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    boolean existsByPayment_IdAndType(Long paymentId, NotificationType type);

    Page<Notification> findByIsReadFalse(Pageable pageable);

    Page<Notification> findByType(NotificationType type, Pageable pageable);

    Page<Notification> findByTypeAndIsRead(NotificationType type, boolean isRead, Pageable pageable);

    Page<Notification> findByIsRead(boolean isRead, Pageable pageable);
}
