package com.tqt.detaithuctap.dto.event;

import com.tqt.detaithuctap.entity.enums.EventStatus;
import com.tqt.detaithuctap.entity.enums.EventType;
import lombok.Builder; import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class EventResponse {
    private Long id;
    private String title;
    private EventType type;
    private String description;
    private Long customerId; private String customerName;
    private Long contractId; private String contractCode;
    private Long assigneeId; private String assigneeName;
    private LocalDateTime startAt; private LocalDateTime endAt;
    private EventStatus status;
    private Boolean notifyByEmail; private Boolean notifyInApp;
}
