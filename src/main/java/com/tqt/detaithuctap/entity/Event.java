package com.tqt.detaithuctap.entity;


import com.tqt.detaithuctap.entity.enums.EventStatus;
import com.tqt.detaithuctap.entity.enums.EventType;
import jakarta.persistence.*;
import lombok.*;


import java.time.LocalDateTime;


@Entity
@Table(name = "events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(nullable = false, length = 255)
    private String title;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EventType type; // MEETING, PAYMENT_REMINDER, CONTRACT_RENEWAL, OTHER


    @Column(columnDefinition = "text")
    private String description;


    // Liên kết khách hàng (bắt buộc nên có trên UI, nhưng để nullable để linh hoạt)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;


    // Liên kết hợp đồng (tùy chọn)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")
    private Contract contract;


    // Người phụ trách (assignee / owner)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;


    @Column(nullable = false)
    private LocalDateTime startAt;


    private LocalDateTime endAt;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EventStatus status; // SCHEDULED, DONE, CANCELED


    private Boolean notifyByEmail; // tùy chọn gửi email
    private Boolean notifyInApp; // hiển thị trong UI
}