package org.chaveamento.repository;

import org.chaveamento.model.torneio.Torneio;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TorneioRepository extends JpaRepository<Torneio, Long> {
}
