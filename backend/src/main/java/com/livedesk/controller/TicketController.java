package com.livedesk.controller;

import com.livedesk.dto.TicketDtos.*;
import com.livedesk.entity.UserAccount;
import com.livedesk.entity.UserRole;
import com.livedesk.repository.UserAccountRepository;
import com.livedesk.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api")
public class TicketController {
    private final TicketService ticketService;
    private final UserAccountRepository users;

    public TicketController(TicketService ticketService, UserAccountRepository users) {
        this.ticketService = ticketService; this.users = users;
    }

    @GetMapping("/dashboard/stats")
    public DashboardResponse dashboard(@AuthenticationPrincipal UserDetails user) {
        UserAccount account = current(user);
        return ticketService.dashboard(account.getEmail(), TicketService.isStaff(account.getRole()));
    }

    @GetMapping("/tickets")
    public List<TicketResponse> list(@AuthenticationPrincipal UserDetails user,
                                     @RequestParam(required = false) String search,
                                     @RequestParam(required = false) String status,
                                     @RequestParam(required = false) String priority) {
        UserAccount account = current(user);
        return ticketService.list(account.getEmail(), TicketService.isStaff(account.getRole()), search, status, priority);
    }

    @PostMapping("/tickets")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse create(@AuthenticationPrincipal UserDetails user, @Valid @RequestBody CreateTicketRequest request) {
        UserAccount account = current(user);
        if (account.getRole() != UserRole.CUSTOMER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Customer accounts create tickets in this workspace");
        }
        return ticketService.create(request, account);
    }

    @GetMapping("/tickets/{id}")
    public TicketResponse get(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        UserAccount account = current(user);
        return ticketService.get(id, account.getEmail(), TicketService.isStaff(account.getRole()));
    }

    @PatchMapping("/tickets/{id}")
    public TicketResponse update(@PathVariable Long id, @AuthenticationPrincipal UserDetails user,
                                 @RequestBody UpdateTicketRequest request) {
        return ticketService.update(id, request, TicketService.isStaff(current(user).getRole()));
    }

    @PatchMapping("/tickets/{id}/assign")
    public TicketResponse assign(@PathVariable Long id, @AuthenticationPrincipal UserDetails user,
                                 @Valid @RequestBody AssignTicketRequest request) {
        return ticketService.assign(id, request.assigneeEmail(), TicketService.isStaff(current(user).getRole()));
    }

    @GetMapping("/tickets/{id}/messages")
    public List<MessageResponse> messages(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        UserAccount account = current(user);
        return ticketService.listMessages(id, account.getEmail(), TicketService.isStaff(account.getRole()));
    }

    @PostMapping("/tickets/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse addMessage(@PathVariable Long id, @AuthenticationPrincipal UserDetails user,
                                      @Valid @RequestBody CreateMessageRequest request) {
        return ticketService.addMessage(id, request.body(), current(user));
    }

    private UserAccount current(UserDetails user) {
        return users.findByEmailIgnoreCase(user.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
    }
}
