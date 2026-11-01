package com.livedesk.controller;

import com.livedesk.dto.AuthDtos.UserDto;
import com.livedesk.dto.CreateAgentRequest;
import com.livedesk.entity.UserAccount;
import com.livedesk.entity.UserRole;
import com.livedesk.repository.UserAccountRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/agents")
public class AgentController {
    private final UserAccountRepository users;
    private final PasswordEncoder encoder;
    public AgentController(UserAccountRepository users, PasswordEncoder encoder) { this.users = users; this.encoder = encoder; }

    @GetMapping
    public List<UserDto> agents(@AuthenticationPrincipal UserDetails principal) {
        boolean staff = isStaff(principal);
        if (!staff) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Support staff only");
        return users.findAll().stream().filter(u -> u.getRole() == UserRole.AGENT || u.getRole() == UserRole.ADMIN)
                .map(u -> new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole())).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createAgent(@AuthenticationPrincipal UserDetails principal, @Valid @RequestBody CreateAgentRequest request) {
        boolean admin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!admin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can create agents");
        if (users.existsByEmailIgnoreCase(request.email())) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        UserAccount agent = users.save(new UserAccount(request.name().trim(), request.email(), encoder.encode(request.password()), UserRole.AGENT));
        return new UserDto(agent.getId(), agent.getName(), agent.getEmail(), agent.getRole());
    }

    private boolean isStaff(UserDetails principal) {
        return principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_AGENT") || a.getAuthority().equals("ROLE_ADMIN"));
    }
}
