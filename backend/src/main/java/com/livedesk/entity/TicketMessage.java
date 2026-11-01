package com.livedesk.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ticket_messages", indexes = @Index(name = "idx_message_ticket_created", columnList = "ticket_id,created_at"))
public class TicketMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(nullable = false, length = 100)
    private String senderName;

    @Column(nullable = false, length = 180)
    private String senderEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole senderRole;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected TicketMessage() {}

    public TicketMessage(Ticket ticket, String senderName, String senderEmail, UserRole senderRole, String body) {
        this.ticket = ticket;
        this.senderName = senderName;
        this.senderEmail = senderEmail;
        this.senderRole = senderRole;
        this.body = body;
    }

    public Long getId() { return id; }
    public Ticket getTicket() { return ticket; }
    public String getSenderName() { return senderName; }
    public String getSenderEmail() { return senderEmail; }
    public UserRole getSenderRole() { return senderRole; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
}
