package org.chaveamento.config;

import org.chaveamento.model.usuario.Role;
import org.chaveamento.model.usuario.Usuario;
import org.chaveamento.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private static final String ADMIN_EMAIL = "admin@admin.com";
    private static final String ADMIN_SENHA = "admin123";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminSeeder(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.existsByRole(Role.ADMIN)) {
            return;
        }

        Usuario admin = new Usuario();
        admin.setNome("Admin");
        admin.setEmail(ADMIN_EMAIL);
        admin.setSenha(passwordEncoder.encode(ADMIN_SENHA));
        admin.setRole(Role.ADMIN);

        usuarioRepository.save(admin);

        log.warn("Nenhum admin encontrado, admin padrao criado -> email: {} | senha: {} (troque a senha depois de logar)",
                ADMIN_EMAIL, ADMIN_SENHA);
    }
}
