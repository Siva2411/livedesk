package com.livedesk.service;

import com.livedesk.dto.TicketDtos.*;
import com.livedesk.entity.*;
import com.livedesk.repository.TicketMessageRepository;
import com.livedesk.repository.TicketRepository;
import com.livedesk.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TicketService {

    private final TicketRepository tickets;
    private final TicketMessageRepository messages;
    private final UserAccountRepository users;
    private final SimpMessagingTemplate messaging;

    public TicketService(
            TicketRepository tickets,
            TicketMessageRepository messages,
            UserAccountRepository users,
            SimpMessagingTemplate messaging) {
        this.tickets = tickets;
        this.messages = messages;
        this.users = users;
        this.messaging = messaging;
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> list(
            String email,
            boolean staff,
            String search,
            String status,
            String priority) {

        List<Ticket> source = staff
                ? tickets.findAllByOrderByUpdatedAtDesc()
                : tickets.findByCustomerEmailIgnoreCaseOrderByUpdatedAtDesc(email);

        String q = search == null ? "" : search.trim().toLowerCase();

        return source.stream()
                .filter(t -> q.isBlank()
                        || t.getTicketKey().toLowerCase().contains(q)
                        || t.getSubject().toLowerCase().contains(q)
                        || t.getCustomerName().toLowerCase().contains(q))
                .filter(t -> status == null || status.isBlank()
                        || t.getStatus().name().equalsIgnoreCase(status))
                .filter(t -> priority == null || priority.isBlank()
                        || t.getPriority().name().equalsIgnoreCase(priority))
                .map(this::toTicketResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TicketResponse get(Long id, String email, boolean staff) {
        Ticket ticket = findTicket(id);
        ensureAccess(ticket, email, staff);
        return toTicketResponse(ticket);
    }

    @Transactional
    public TicketResponse create(CreateTicketRequest request, UserAccount customer) {
        Ticket ticket = tickets.save(new Ticket(
                request.subject().trim(),
                request.description().trim(),
                customer.getName(),
                customer.getEmail(),
                request.category() == null ? TicketCategory.GENERAL : request.category(),
                request.priority() == null ? TicketPriority.NORMAL : request.priority()));

        ticket.setTicketKey("LD-" + String.format("%05d", ticket.getId()));
        tickets.save(ticket);

        messages.save(new TicketMessage(
                ticket,
                customer.getName(),
                customer.getEmail(),
                customer.getRole(),
                request.description().trim()));

        TicketResponse response = toTicketResponse(ticket);
        publishTicket(response);
        return response;
    }

    @Transactional
    public TicketResponse update(Long id, UpdateTicketRequest request, boolean staff) {
        if (!staff) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only support staff can update ticket status or priority");
        }

        Ticket ticket = findTicket(id);

        if (request.status() != null) {
            ticket.setStatus(request.status());
        }
        if (request.priority() != null) {
            ticket.setPriority(request.priority());
        }

        ticket = tickets.save(ticket);
        TicketResponse response = toTicketResponse(ticket);
        publishTicket(response);
        return response;
    }

    @Transactional
    public TicketResponse assign(Long id, String assigneeEmail, boolean staff) {
        if (!staff) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only support staff can assign tickets");
        }

        Ticket ticket = findTicket(id);

        if (assigneeEmail == null || assigneeEmail.isBlank()) {
            ticket.clearAssignment();
        } else {
            UserAccount assignee = users.findByEmailIgnoreCase(assigneeEmail)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Agent not found"));

            if (assignee.getRole() != UserRole.AGENT
                    && assignee.getRole() != UserRole.ADMIN) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Assignee must be an agent or admin");
            }

            ticket.assign(assignee.getName(), assignee.getEmail());
        }

        ticket = tickets.save(ticket);
        TicketResponse response = toTicketResponse(ticket);
        publishTicket(response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> listMessages(Long id, String email, boolean staff) {
        Ticket ticket = findTicket(id);
        ensureAccess(ticket, email, staff);

        return messages.findByTicket_IdOrderByCreatedAtAsc(id)
                .stream()
                .map(this::toMessageResponse)
                .toList();
    }

    @Transactional
    public MessageResponse addMessage(Long id, String body, UserAccount sender) {
        Ticket ticket = findTicket(id);
        ensureAccess(ticket, sender.getEmail(), isStaff(sender.getRole()));

        ticket.touch();
        tickets.save(ticket);

        TicketMessage message = messages.save(new TicketMessage(
                ticket,
                sender.getName(),
                sender.getEmail(),
                sender.getRole(),
                body.trim()));

        TicketResponse response = toTicketResponse(ticket);
        publishTicket(response);

        MessageResponse messageResponse = toMessageResponse(message);

        messaging.convertAndSend(
                "/topic/tickets/" + id,
                (Object) Map.of(
                        "type", "MESSAGE_CREATED",
                        "message", messageResponse,
                        "ticket", response));

        return messageResponse;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(String email, boolean staff) {
        List<Ticket> all = staff
                ? tickets.findAllByOrderByUpdatedAtDesc()
                : tickets.findByCustomerEmailIgnoreCaseOrderByUpdatedAtDesc(email);

        long total = all.size();
        long open = count(all, TicketStatus.OPEN);
        long inProgress = count(all, TicketStatus.IN_PROGRESS);
        long waiting = count(all, TicketStatus.WAITING_FOR_CUSTOMER);
        long resolved = all.stream()
                .filter(t -> t.getStatus() == TicketStatus.RESOLVED
                        || t.getStatus() == TicketStatus.CLOSED)
                .count();
        long urgent = all.stream()
                .filter(t -> t.getPriority() == TicketPriority.URGENT)
                .count();
        long unassigned = all.stream()
                .filter(t -> t.getAssigneeEmail() == null)
                .count();

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<DailyCount> weekly = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            long value = all.stream()
                    .filter(t -> t.getCreatedAt()
                            .atZone(ZoneOffset.UTC)
                            .toLocalDate()
                            .equals(day))
                    .count();

            weekly.add(new DailyCount(
                    day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    value));
        }

        Map<String, Long> grouped = all.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getCategory().name(),
                        Collectors.counting()));

        List<CategoryCount> categories = grouped.entrySet().stream()
                .map(e -> new CategoryCount(e.getKey(), e.getValue()))
                .toList();

        return new DashboardResponse(
                total,
                open,
                inProgress,
                waiting,
                resolved,
                urgent,
                unassigned,
                weekly,
                categories);
    }

    private long count(List<Ticket> ticketList, TicketStatus status) {
        return ticketList.stream()
                .filter(t -> t.getStatus() == status)
                .count();
    }

    private Ticket findTicket(Long id) {
        return tickets.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Ticket not found"));
    }

    private void ensureAccess(Ticket ticket, String email, boolean staff) {
        if (!staff && !ticket.getCustomerEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have access to this ticket");
        }
    }

    public static boolean isStaff(UserRole role) {
        return role == UserRole.ADMIN || role == UserRole.AGENT;
    }

    private TicketResponse toTicketResponse(Ticket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getTicketKey(),
                ticket.getSubject(),
                ticket.getDescription(),
                ticket.getCustomerName(),
                ticket.getCustomerEmail(),
                ticket.getAssigneeName(),
                ticket.getAssigneeEmail(),
                ticket.getStatus(),
                ticket.getPriority(),
                ticket.getCategory(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                messages.countByTicket_Id(ticket.getId()));
    }

    private MessageResponse toMessageResponse(TicketMessage message) {
        return new MessageResponse(
                message.getId(),
                message.getSenderName(),
                message.getSenderEmail(),
                message.getSenderRole(),
                message.getBody(),
                message.getCreatedAt());
    }

    private void publishTicket(TicketResponse response) {
        messaging.convertAndSend(
                "/topic/agents/tickets",
                (Object) Map.of(
                        "type", "TICKET_UPDATED",
                        "ticket", response));

        messaging.convertAndSend(
                "/topic/tickets/" + response.id(),
                (Object) Map.of(
                        "type", "TICKET_UPDATED",
                        "ticket", response));
    }
}
