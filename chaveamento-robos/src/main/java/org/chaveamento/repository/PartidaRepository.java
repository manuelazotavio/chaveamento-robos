package org.chaveamento.repository;

import org.chaveamento.model.partida.Partida;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartidaRepository extends JpaRepository<Partida, Long> {
    List<Partida> findByTorneioId(Long torneioId);
}
