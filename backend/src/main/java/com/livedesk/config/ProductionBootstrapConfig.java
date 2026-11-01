package com.livedesk.config;

import com.livedesk.entity.UserAccount;
import com.livedesk.entity.UserRole;
import com.livedesk.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("prod")
public class ProductionBootstrapConfig {
    @Bean
    ApplicationRunner bootstrapAdmin(UserAccountRepository users, PasswordEncoder encoder,
                                     @Value("${BOOTSTRAP_ADMIN_EMAIL:}") String email,
                                     @Value("${BOOTSTRAP_ADMIN_PASSWORD:}") String password,
                                     @Value("${BOOTSTRAP_ADMIN_NAME:LiveDesk Admin}") String name) {
        return args -> {
            boolean noBootstrapRequested = (email == null || email.isBlank()) && (password == null || password.isBlank());
            if (noBootstrapRequested) {
                System.out.println("LiveDesk: admin bootstrap skipped. Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for first-time setup.");
                return;
            }
            if (email == null || email.isBlank() || password == null || password.length() < 12) {
                throw new IllegalStateException("Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD with at least 12 characters, or remove both after the first admin is created.");
            }
            if (!users.existsByEmailIgnoreCase(email)) {
                users.save(new UserAccount(name, email, encoder.encode(password), UserRole.ADMIN));
                System.out.println("LiveDesk: initial admin account created for " + email);
            }
        };
    }
}
