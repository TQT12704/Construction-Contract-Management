package com.tqt.detaithuctap.dto.contract;

import java.time.LocalDateTime;

public class AppendixResponse {
    private Long id;
    private String title;
    private String note;
    private LocalDateTime createdAt;

    public AppendixResponse() {}
    public AppendixResponse(Long id, String title, String note, LocalDateTime createdAt) {
        this.id = id; this.title = title; this.note = note; this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getNote() { return note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
