package com.tqt.detaithuctap.repository;

import com.tqt.detaithuctap.entity.Event;
import com.tqt.detaithuctap.entity.User;
import com.tqt.detaithuctap.entity.enums.EventStatus;
import com.tqt.detaithuctap.entity.enums.EventType;
import org.springframework.data.domain.Page; import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface EventRepository extends JpaRepository<Event, Long> {
    Page<Event> findByAssignee(User assignee, Pageable pageable);
    Page<Event> findByAssigneeAndStatus(User assignee, EventStatus status, Pageable pageable);
    Page<Event> findByAssigneeAndStartAtBetween(User assignee, LocalDateTime from, LocalDateTime to, Pageable pageable);

    // ADMIN/ACCOUNTANT search (mở rộng nếu cần):
    Page<Event> findByStatus(EventStatus status, Pageable pageable);
    Page<Event> findByType(EventType type, Pageable pageable);
}
