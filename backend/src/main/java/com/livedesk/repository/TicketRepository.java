package com.livedesk.repository;

import com.livedesk.entity.Ticket;
import com.livedesk.entity.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findAllByOrderByUpdatedAtDesc();
    List<Ticket> findByCustomerEmailIgnoreCaseOrderByUpdatedAtDesc(String email);
    long countByStatus(TicketStatus status);
}
