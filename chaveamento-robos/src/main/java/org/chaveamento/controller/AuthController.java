package org.chaveamento.controller;

import org.chaveamento.dto.auth.LoginDTO;
import org.chaveamento.dto.auth.TokenResponse;
import org.chaveamento.model.usuario.Usuario;
import org.chaveamento.repository.UsuarioRepository;
import org.chaveamento.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    public AuthController(
            AuthenticationManager authenticationManager,
            UsuarioRepository usuarioRepository,
            JwtService jwtService
    ) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody LoginDTO dados) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(dados.email(), dados.senha())
        );

        Usuario usuario = usuarioRepository.findByEmail(dados.email())
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));

        String token = jwtService.gerarToken(usuario);

        return ResponseEntity.ok(new TokenResponse(token));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<String> handleAuthenticationException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email ou senha invalidos");
    }
}
