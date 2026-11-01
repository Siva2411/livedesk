package com.livedesk.repository;

import com.livedesk.entity.TicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TicketMessageRepository extends JpaRepository<TicketMessage, Long> {
    List<TicketMessage> findByTicket_IdOrderByCreatedAtAsc(Long ticketId);
    long countByTicket_Id(Long ticketId);
}
