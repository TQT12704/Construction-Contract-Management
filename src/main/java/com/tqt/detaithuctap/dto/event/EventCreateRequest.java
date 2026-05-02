package com.tqt.detaithuctap.dto.event;

import com.tqt.detaithuctap.entity.enums.EventStatus;
import com.tqt.detaithuctap.entity.enums.EventType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventCreateRequest {
    private String title;
    private EventType type;
    private String description;
    private Long customerId;
    private Long contractId;
    private Long assigneeUserId; // nếu null -> gán người tạo
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private EventStatus status; // mặc định SCHEDULED ở service nếu null
    private Boolean notifyByEmail = false;
    private Boolean notifyInApp = true;
}
