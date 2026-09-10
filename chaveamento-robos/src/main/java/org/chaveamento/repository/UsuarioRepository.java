package org.chaveamento.repository;

import org.chaveamento.model.usuario.Role;
import org.chaveamento.model.usuario.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByRole(Role role);
}
