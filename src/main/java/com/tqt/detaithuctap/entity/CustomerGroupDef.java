package com.tqt.detaithuctap.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customer_group_defs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CustomerGroupDef {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64, unique = true)
    private String code;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 512)
    private String note;

    // ✅ map cột active NOT NULL và đặt default = true
    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;
}
