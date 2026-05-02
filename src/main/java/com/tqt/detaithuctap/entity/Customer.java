package com.tqt.detaithuctap.entity;

import com.tqt.detaithuctap.entity.enums.CustomerGroup;
import com.tqt.detaithuctap.entity.enums.Region;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "customers",
        indexes = {
                @Index(name = "idx_customers_industry_norm", columnList = "industry_normalized")
        }
)
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CustomerGroup customerGroup = CustomerGroup.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Region region = Region.OTHER;

    @Column(length = 120)
    private String industry; // hiển thị cho người dùng (có dấu)

    @Column(name = "industry_normalized", length = 120)
    private String industryNormalized; // KHÔNG DẤU + lowercase, để search

    private String address;
    private String contactPerson;
    private String phone;
    private String email;

    // Nhân viên phụ trách (Sales)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
