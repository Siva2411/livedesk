package com.livedesk.security;

import com.livedesk.entity.Ticket;
import com.livedesk.repository.TicketRepository;
import io.jsonwebtoken.JwtException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class JwtStompChannelInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final AppUserDetailsService users;
    private final TicketRepository tickets;

    public JwtStompChannelInterceptor(JwtService jwtService, AppUserDetailsService users, TicketRepository tickets) {
        this.jwtService = jwtService;
        this.users = users;
        this.tickets = tickets;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing WebSocket bearer token");
            }
            try {
                String email = jwtService.extractSubject(authHeader.substring(7));
                UserDetails user = users.loadUserByUsername(email);
                Authentication authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                accessor.setUser(authentication);
            } catch (JwtException | org.springframework.security.core.userdetails.UsernameNotFoundException ex) {
                throw new IllegalArgumentException("Invalid WebSocket token", ex);
            }
        }
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            Authentication auth = (Authentication) accessor.getUser();
            if (auth == null || !auth.isAuthenticated()) throw new IllegalArgumentException("Authentication required");
            String destination = accessor.getDestination();
            boolean agent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_AGENT") || a.getAuthority().equals("ROLE_ADMIN"));
            if ("/topic/agents/tickets".equals(destination) && !agent) {
                throw new IllegalArgumentException("Agent access required");
            }
            if (destination != null && destination.matches("/topic/tickets/\\d+")) {
                Long ticketId = Long.valueOf(destination.substring(destination.lastIndexOf('/') + 1));
                Ticket ticket = tickets.findById(ticketId).orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
                String email = auth.getName();
                if (!agent && !ticket.getCustomerEmail().equalsIgnoreCase(email)) {
                    throw new IllegalArgumentException("You cannot subscribe to this ticket");
                }
            }
        }
        return message;
    }
}
