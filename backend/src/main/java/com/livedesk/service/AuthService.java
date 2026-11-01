package com.livedesk.service;

import com.livedesk.dto.AuthDtos.*;
import com.livedesk.entity.UserAccount;
import com.livedesk.entity.UserRole;
import com.livedesk.repository.UserAccountRepository;
import com.livedesk.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UserAccountRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(UserAccountRepository users, PasswordEncoder encoder, JwtService jwtService) {
        this.users = users; this.encoder = encoder; this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        UserAccount user = users.save(new UserAccount(request.name().trim(), email, encoder.encode(request.password()), UserRole.CUSTOMER));
        return createResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        UserAccount user = users.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return createResponse(user);
    }

    @Transactional(readOnly = true)
    public UserDto currentUser(String email) {
        UserAccount user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toDto(user);
    }

    private AuthResponse createResponse(UserAccount user) {
        return new AuthResponse(jwtService.generateToken(user.getEmail(), user.getRole().name()), toDto(user));
    }

    private UserDto toDto(UserAccount user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
