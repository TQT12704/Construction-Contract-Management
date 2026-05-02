package com.tqt.detaithuctap.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@Entity
@Table(name = "payment_history")
public class PaymentHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "payment_id")
    private Payment payment; // có thể null nếu log theo hợp đồng

    @Column(nullable = false, length = 30)
    private String action; // CREATED, UPDATED, MARK_PAID, DELETED

    private BigDecimal amountBefore;
    private BigDecimal amountAfter;
    private BigDecimal actualAmount;

    @Column(length = 20)
    private String statusBefore; // UNPAID/PAID
    @Column(length = 20)
    private String statusAfter;

    @Column(length = 30)
    private String method; // BANK_TRANSFER/CASH/NULL

    @Column(length = 255)
    private String note;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(length = 100)
    private String actor; // username thực hiện
}
