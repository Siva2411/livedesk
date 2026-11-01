package com.livedesk.config;

import com.livedesk.entity.*;
import com.livedesk.repository.TicketMessageRepository;
import com.livedesk.repository.TicketRepository;
import com.livedesk.repository.UserAccountRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Configuration
@Profile({"local", "postgres-local"})
public class DemoDataConfig {
    @Bean
    ApplicationRunner seedDemoData(UserAccountRepository users, TicketRepository tickets,
                                   TicketMessageRepository messages, PasswordEncoder encoder) {
        return args -> {
            UserAccount admin = users.findByEmailIgnoreCase("admin@livedesk.demo")
                    .orElseGet(() -> users.save(new UserAccount("Olivia Martin", "admin@livedesk.demo", encoder.encode("Admin@123"), UserRole.ADMIN)));
            UserAccount agentA = users.findByEmailIgnoreCase("alex@livedesk.demo")
                    .orElseGet(() -> users.save(new UserAccount("Alex Morgan", "alex@livedesk.demo", encoder.encode("Agent@123"), UserRole.AGENT)));
            UserAccount agentB = users.findByEmailIgnoreCase("maya@livedesk.demo")
                    .orElseGet(() -> users.save(new UserAccount("Maya Chen", "maya@livedesk.demo", encoder.encode("Agent@123"), UserRole.AGENT)));
            UserAccount customerA = users.findByEmailIgnoreCase("sophia@example.com")
                    .orElseGet(() -> users.save(new UserAccount("Sophia Bennett", "sophia@example.com", encoder.encode("Customer@123"), UserRole.CUSTOMER)));
            UserAccount customerB = users.findByEmailIgnoreCase("noah@example.com")
                    .orElseGet(() -> users.save(new UserAccount("Noah Williams", "noah@example.com", encoder.encode("Customer@123"), UserRole.CUSTOMER)));

            if (tickets.count() == 0) {
                create(tickets, messages, "Unable to download my invoice", "The invoice download link returns a 403 error. Could you send me a new copy?", customerA, agentA, TicketCategory.BILLING, TicketPriority.HIGH, TicketStatus.IN_PROGRESS, 2);
                create(tickets, messages, "Two-factor code not arriving", "I have tried requesting a code several times but nothing has arrived in my inbox.", customerB, agentB, TicketCategory.ACCOUNT, TicketPriority.URGENT, TicketStatus.OPEN, 1);
                create(tickets, messages, "Change workspace owner", "Our previous workspace owner has left. Please help transfer ownership to my account.", customerA, agentA, TicketCategory.ACCOUNT, TicketPriority.NORMAL, TicketStatus.WAITING_FOR_CUSTOMER, 1);
                create(tickets, messages, "Dashboard data looks incorrect", "The monthly report appears to be missing the last three days of activity.", customerB, null, TicketCategory.TECHNICAL, TicketPriority.HIGH, TicketStatus.OPEN, 1);
                create(tickets, messages, "Feature request: CSV export", "It would be very useful to export the activity feed as a CSV file.", customerA, agentB, TicketCategory.FEATURE_REQUEST, TicketPriority.LOW, TicketStatus.RESOLVED, 2);
                create(tickets, messages, "Payment receipt needed", "I need a receipt for the payment made last week.", customerB, agentA, TicketCategory.BILLING, TicketPriority.NORMAL, TicketStatus.CLOSED, 1);
            }
        };
    }

    private void create(TicketRepository tickets, TicketMessageRepository messages, String subject, String description,
                        UserAccount customer, UserAccount agent, TicketCategory category, TicketPriority priority,
                        TicketStatus status, int messageCount) {
        Ticket ticket = tickets.save(new Ticket(subject, description, customer.getName(), customer.getEmail(), category, priority));
        ticket.setTicketKey("LD-" + String.format("%05d", ticket.getId()));
        ticket.setStatus(status);
        if (agent != null) ticket.assign(agent.getName(), agent.getEmail());
        tickets.save(ticket);
        messages.save(new TicketMessage(ticket, customer.getName(), customer.getEmail(), UserRole.CUSTOMER, description));
        if (messageCount > 1 && agent != null) {
            messages.save(new TicketMessage(ticket, agent.getName(), agent.getEmail(), agent.getRole(), "Thanks for reaching out. I've picked this up and am looking into it now."));
        }
    }
}
