package com.tqt.detaithuctap.dto.event;

import com.tqt.detaithuctap.entity.enums.EventStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventUpdateRequest {
    private String title;
    private String description;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private EventStatus status;
    private Boolean notifyByEmail;
    private Boolean notifyInApp;
}
