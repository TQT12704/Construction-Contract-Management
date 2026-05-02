package com.tqt.detaithuctap.security;

import com.tqt.detaithuctap.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {
    @Value("${jwt.secret}") private String jwtSecretB64;
    @Value("${jwt.expiration}") private long expiration;

    private Key key(){
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecretB64));
    }

    public String generateToken(UserDetails user){
        String role = user.getAuthorities().iterator().next().getAuthority();
        Date now = new Date();
        Date exp = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }
    public String extractUsername(String token) {
        return parser().parseClaimsJws(token).getBody().getSubject();
    }

    public boolean validate(String token, UserDetails user) {
        try {
            Claims body = parser().parseClaimsJws(token).getBody();
            return user.getUsername().equals(body.getSubject()) && body.getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
    private JwtParser parser() {
        return Jwts.parserBuilder().setSigningKey(key()).build();
    }
}
