package com.tqt.detaithuctap.config;

import com.tqt.detaithuctap.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ===== Auth =====
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers("/actuator/**").permitAll()

                        // ===== Customers =====
                        .requestMatchers("/api/customers/**").hasAnyRole("ADMIN", "SALES")

                        // ===== Contracts =====
                        .requestMatchers(HttpMethod.GET, "/api/contracts/**").hasAnyRole("ADMIN", "SALES", "ACCOUNTANT")
                        .requestMatchers(HttpMethod.POST, "/api/contracts/**").hasAnyRole("ADMIN", "SALES")
                        .requestMatchers(HttpMethod.PUT, "/api/contracts/**").hasAnyRole("ADMIN", "ACCOUNTANT", "SALES")
                        .requestMatchers(HttpMethod.PATCH, "/api/contracts/**").hasAnyRole("ADMIN", "ACCOUNTANT", "SALES")
                        .requestMatchers(HttpMethod.DELETE, "/api/contracts/**").hasRole("ADMIN")

                        // ===== Payments =====
                        .requestMatchers(HttpMethod.GET, "/api/payments/**").hasAnyRole("ADMIN", "ACCOUNTANT", "SALES")
                        .requestMatchers(HttpMethod.POST, "/api/payments/**").hasAnyRole("ADMIN", "SALES")
                        .requestMatchers(HttpMethod.PATCH, "/api/payments/**").hasAnyRole("ADMIN", "ACCOUNTANT")
                        .requestMatchers(HttpMethod.DELETE, "/api/payments/**").hasAnyRole("ADMIN", "ACCOUNTANT")

                        // ===== Events =====
                        // Quan trọng: đặt rule đặc thù trước rule tổng quát
                        .requestMatchers(HttpMethod.GET, "/api/events/admin").hasAnyRole("ADMIN", "ACCOUNTANT")
                        // Các endpoint còn lại của /api/events (bao gồm /me, POST/PUT/DELETE) → ADMIN, SALES
                        .requestMatchers("/api/events/**").hasAnyRole("ADMIN", "SALES")

                        // ===== Users & Roles =====
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/roles/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000",
                "http://localhost:3003",
                "http://localhost:3005"
        ));
        cfg.setAllowedMethods(Arrays.asList("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        cfg.setExposedHeaders(Arrays.asList("Authorization","Location"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
