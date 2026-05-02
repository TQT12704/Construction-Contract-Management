package com.tqt.detaithuctap.dto.customer;

import com.tqt.detaithuctap.entity.enums.ContractStatus;
import com.tqt.detaithuctap.entity.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerDetailResponse {
    // Thông tin KH
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String industry; // NEW
    private String groupName;
    private String region;

    // Tổng quan HĐ/Thanh toán
    private long totalContracts;
    private BigDecimal totalContractAmount;
    private long activeContracts;
    private long completedContracts;
    private long cancelledContracts;
    private BigDecimal totalPaidAmount;
    private BigDecimal remainingAmount;

    private List<RecentContract> recentContracts;
    private List<RecentPayment> recentPayments;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RecentContract {
        private Long id;
        private String contractCode;
        private String title;
        private BigDecimal totalAmount;
        private ContractStatus status;
        private LocalDate signedDate;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RecentPayment {
        private Long id;
        private Long contractId;
        private String contractCode;
        private BigDecimal amount;
        private PaymentStatus status;
        private LocalDate paymentDate;
        private String confirmedByName;
    }
}
