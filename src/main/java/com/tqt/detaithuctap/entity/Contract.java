package com.tqt.detaithuctap.entity;


import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.ContractType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;


import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Entity @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Table(name = "contracts")
public class Contract {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name="contract_code", unique = true, nullable = false, length = 50)
    private String contractCode;


    @Column(nullable = false, length = 255)
    private String title;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ContractType contractType;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private Customer customer;


    // nhân viên phụ trách / người tạo hợp đồng
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_id")
    private User sales;


    private LocalDate signedDate; // ngày ký (nullable khi còn draft)
    private LocalDate dueDate; // hạn hợp đồng (tuỳ chọn)


    @Column(precision = 18, scale = 2, nullable = false)
    private BigDecimal totalAmount;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContractStatus status; // PENDING/ACTIVE/COMPLETED/CANCELLED


    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Payment> payments = new ArrayList<>();


    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}