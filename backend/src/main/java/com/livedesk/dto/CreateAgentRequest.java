package com.livedesk.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAgentRequest(
        @NotBlank @Size(max = 100) String name,
        @Email @NotBlank @Size(max = 180) String email,
        @NotBlank @Size(min = 12, max = 72) String password) {}
