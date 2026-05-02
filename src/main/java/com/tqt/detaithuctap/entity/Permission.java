package com.tqt.detaithuctap.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "permissions", uniqueConstraints = @UniqueConstraint(columnNames = "code"))
@Getter @Setter
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Ví dụ: CUSTOMER_READ, CONTRACT_CREATE ... */
    @Column(nullable = false, length = 80)
    private String code;
}
