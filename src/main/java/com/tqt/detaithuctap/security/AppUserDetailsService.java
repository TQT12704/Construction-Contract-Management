package com.tqt.detaithuctap.security;

import com.tqt.detaithuctap.entity.User;
import com.tqt.detaithuctap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepo;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User u = userRepo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Not found: " + username));


        String roleName = u.getRole().getName();
        String granted = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;

        var authorities = List.of(new SimpleGrantedAuthority(granted));


        System.out.println("LoadUser: " + u.getUsername() + " => " + authorities);

        return org.springframework.security.core.userdetails.User
                .withUsername(u.getUsername())
                .password(u.getPassword())
                .authorities(authorities)
                .accountExpired(false)
                .accountLocked(Boolean.FALSE.equals(u.getActive()))
                .credentialsExpired(false)
                .disabled(Boolean.FALSE.equals(u.getActive()))
                .build();
    }
}
