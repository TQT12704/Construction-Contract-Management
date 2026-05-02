package com.tqt.detaithuctap.config;

import com.tqt.detaithuctap.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class ReminderScheduler {

    private final NotificationService notificationService;

    // 08:00 mỗi ngày (giờ server)
    @Scheduled(cron = "0 0 8 * * *")
    public void scanPaymentsDue() {
        int created = notificationService.scanAndCreateDueNotifications(7);
        log.info("ReminderScheduler: created {} notifications.", created);
    }
}
