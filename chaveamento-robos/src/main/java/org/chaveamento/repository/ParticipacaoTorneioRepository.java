package org.chaveamento.repository;

import org.chaveamento.model.participacaotorneio.ParticipacaoTorneio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParticipacaoTorneioRepository extends JpaRepository<ParticipacaoTorneio, Long> {

    boolean existsByTorneioIdAndTimeId(Long torneioId, Long timeId);

    List<ParticipacaoTorneio> findByTorneioId(Long torneioId);
}
