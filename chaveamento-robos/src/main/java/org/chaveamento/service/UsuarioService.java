package org.chaveamento.service;


import org.chaveamento.dto.usuario.CadastroUsuarioDTO;
import org.chaveamento.model.usuario.Role;
import org.chaveamento.model.usuario.Usuario;
import org.chaveamento.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Usuario cadastrar(CadastroUsuarioDTO dados) {
        if(usuarioRepository.findByEmail(dados.email()).isPresent()) {
            throw new RuntimeException("Email ja cadastrado");
        }

        Usuario usuario = new Usuario();

        usuario.setNome(dados.nome());
        usuario.setEmail(dados.email());

        usuario.setSenha(
                passwordEncoder.encode(dados.senha())
        );

        usuario.setRole(dados.role() != null ? dados.role() : Role.USUARIO);

        return usuarioRepository.save(usuario);

    }
}
