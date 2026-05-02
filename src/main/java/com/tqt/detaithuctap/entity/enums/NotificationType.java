package com.tqt.detaithuctap.entity.enums;

public enum NotificationType {
    PAYMENT_DUE_SOON,   // sắp đến hạn (today .. today + N ngày)
    PAYMENT_OVERDUE     // quá hạn (planDate < today)
}
