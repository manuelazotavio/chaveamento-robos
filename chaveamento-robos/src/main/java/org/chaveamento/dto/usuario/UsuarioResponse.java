package org.chaveamento.dto.usuario;

import org.chaveamento.model.usuario.Role;
import org.chaveamento.model.usuario.Usuario;

public record UsuarioResponse(
        Long id,
        String nome,
        String email,
        Role role
) {

    public UsuarioResponse(Usuario usuario) {
        this(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getRole()
        );
    }
}
