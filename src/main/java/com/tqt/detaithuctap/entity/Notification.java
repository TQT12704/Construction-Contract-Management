package com.tqt.detaithuctap.entity;

import com.tqt.detaithuctap.entity.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_type", columnList = "type"),
                @Index(name = "idx_notifications_is_read", columnList = "is_read"),
                @Index(name = "idx_notifications_created_at", columnList = "created_at")
        },
        uniqueConstraints = {
                // tránh tạo trùng theo (payment_id, type)
                @UniqueConstraint(name = "uk_notifications_payment_type", columnNames = {"payment_id", "type"})
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private NotificationType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")
    private Contract contract;

    @Column(length = 255)
    private String title;

    @Column(length = 2000)
    private String message;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "days_overdue")
    private Integer daysOverdue;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
