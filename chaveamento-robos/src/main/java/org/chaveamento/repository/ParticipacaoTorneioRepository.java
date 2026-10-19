package org.chaveamento.repository;

import org.chaveamento.model.participacaotorneio.ParticipacaoTorneio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParticipacaoTorneioRepository extends JpaRepository<ParticipacaoTorneio, Long> {

    boolean existsByTorneioIdAndTimeId(Long torneioId, Long timeId);

    List<ParticipacaoTorneio> findByTorneioId(Long torneioId);

    Optional<ParticipacaoTorneio> findFirstByTimeId(Long timeId);

    void deleteByTorneioIdAndTimeId(Long torneioId, Long timeId);

    void deleteByTorneioId(Long torneioId);

    void deleteByTimeId(Long timeId);
}
