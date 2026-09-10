package org.chaveamento.dto.usuario;

import org.chaveamento.model.usuario.Role;

public record CadastroUsuarioDTO(
        String nome,
        String email,
        String senha,
        Role role
) {
}
