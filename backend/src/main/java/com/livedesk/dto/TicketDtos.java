package com.livedesk.dto;

import com.livedesk.entity.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class TicketDtos {
    private TicketDtos() {}

    public record CreateTicketRequest(
            @NotBlank @Size(max = 180) String subject,
            @NotBlank @Size(max = 5000) String description,
            TicketCategory category,
            TicketPriority priority) {}

    public record UpdateTicketRequest(TicketStatus status, TicketPriority priority) {}
    public record AssignTicketRequest(@Size(max = 180) String assigneeEmail) {}
    public record CreateMessageRequest(@NotBlank @Size(max = 5000) String body) {}

    public record TicketResponse(Long id, String ticketKey, String subject, String description,
                                 String customerName, String customerEmail,
                                 String assigneeName, String assigneeEmail,
                                 TicketStatus status, TicketPriority priority, TicketCategory category,
                                 Instant createdAt, Instant updatedAt, long messageCount) {}

    public record MessageResponse(Long id, String senderName, String senderEmail,
                                  UserRole senderRole, String body, Instant createdAt) {}

    public record DashboardResponse(long total, long open, long inProgress, long waiting,
                                     long resolved, long urgent, long unassigned,
                                     List<DailyCount> weeklyVolume, List<CategoryCount> categories) {}
    public record DailyCount(String day, long count) {}
    public record CategoryCount(String category, long count) {}
}
