package com.tqt.detaithuctap.entity;

import com.tqt.detaithuctap.entity.enums.PaymentMethod;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "payments")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)   // ✅ thêm builder
public class Payment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Contract contract;

    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal amount;            // SỐ TIỀN DỰ KIẾN của đợt

    @Column(precision = 19, scale = 2)
    private BigDecimal actualAmount;      // SỐ TIỀN THỰC THU (khi xác nhận)

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    private PaymentMethod method;

    private LocalDate planDate;
    private LocalDate paymentDate;

    private Integer installmentNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by_id")
    private User confirmedBy;

    private String note;
}

