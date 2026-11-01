package com.livedesk.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tickets", indexes = {
        @Index(name = "idx_ticket_status", columnList = "status"),
        @Index(name = "idx_ticket_customer_email", columnList = "customer_email"),
        @Index(name = "idx_ticket_updated_at", columnList = "updated_at")
})
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 20)
    private String ticketKey;

    @Column(nullable = false, length = 180)
    private String subject;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(nullable = false, length = 100)
    private String customerName;

    @Column(nullable = false, length = 180)
    private String customerEmail;

    @Column(length = 100)
    private String assigneeName;

    @Column(length = 180)
    private String assigneeEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TicketStatus status = TicketStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketPriority priority = TicketPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TicketCategory category = TicketCategory.GENERAL;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected Ticket() {}

    public Ticket(String subject, String description, String customerName, String customerEmail,
                  TicketCategory category, TicketPriority priority) {
        this.subject = subject;
        this.description = description;
        this.customerName = customerName;
        this.customerEmail = customerEmail.toLowerCase().trim();
        this.category = category;
        this.priority = priority;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public void setTicketKey(String ticketKey) { this.ticketKey = ticketKey; }
    public void touch() { this.updatedAt = Instant.now(); }
    public void setStatus(TicketStatus status) { this.status = status; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }
    public void assign(String name, String email) { this.assigneeName = name; this.assigneeEmail = email; }
    public void clearAssignment() { this.assigneeName = null; this.assigneeEmail = null; }

    public Long getId() { return id; }
    public String getTicketKey() { return ticketKey; }
    public String getSubject() { return subject; }
    public String getDescription() { return description; }
    public String getCustomerName() { return customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public String getAssigneeName() { return assigneeName; }
    public String getAssigneeEmail() { return assigneeEmail; }
    public TicketStatus getStatus() { return status; }
    public TicketPriority getPriority() { return priority; }
    public TicketCategory getCategory() { return category; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
