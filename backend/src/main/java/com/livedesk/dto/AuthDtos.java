package com.livedesk.dto;

import com.livedesk.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RegisterRequest(@NotBlank @Size(max = 100) String name,
                                  @Email @NotBlank @Size(max = 180) String email,
                                  @NotBlank @Size(min = 8, max = 72) String password) {}
    public record UserDto(UUID id, String name, String email, UserRole role) {}
    public record AuthResponse(String token, UserDto user) {}
}
