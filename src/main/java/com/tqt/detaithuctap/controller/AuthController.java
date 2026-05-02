package com.tqt.detaithuctap.controller;

import com.tqt.detaithuctap.dto.auth.LoginRequest;
import com.tqt.detaithuctap.dto.auth.LoginResponse;
import com.tqt.detaithuctap.repository.RoleRepository;
import com.tqt.detaithuctap.repository.UserRepository;
import com.tqt.detaithuctap.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = {"http://localhost:3000","http://localhost:3003","http://localhost:3005"})
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil jwt;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordEncoder encoder;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

        UserDetails principal = (UserDetails) auth.getPrincipal();
        String token = jwt.generateToken(principal);
        String role = principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).findFirst().orElse("");

        return ResponseEntity.ok(new LoginResponse(token, principal.getUsername(), role, 3600000));
    }
}
