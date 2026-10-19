package org.chaveamento.service;

import org.chaveamento.dto.torneio.CriarTorneioRequest;
import org.chaveamento.dto.torneio.TorneioResponse;
import org.chaveamento.model.partida.Partida;
import org.chaveamento.model.partida.StatusPartida;
import org.chaveamento.model.torneio.Torneio;
import org.chaveamento.repository.ParticipacaoTorneioRepository;
import org.chaveamento.repository.PartidaRepository;
import org.chaveamento.repository.TorneioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TorneioService {

    private final TorneioRepository torneioRepository;
    private final ParticipacaoTorneioRepository participacaoRepository;
    private final PartidaRepository partidaRepository;

    public TorneioService(
            TorneioRepository torneioRepository,
            ParticipacaoTorneioRepository participacaoRepository,
            PartidaRepository partidaRepository
    ) {
        this.torneioRepository = torneioRepository;
        this.participacaoRepository = participacaoRepository;
        this.partidaRepository = partidaRepository;
    }

    public TorneioResponse criar(CriarTorneioRequest request){
        Torneio torneio = new Torneio(request.tipo());
        Torneio salvo = torneioRepository.save(torneio);
        return new TorneioResponse(salvo.getId(), salvo.getTipo(), salvo.getStatus());
    }

    public List<TorneioResponse> listar() {
        return torneioRepository.findAll()
                .stream()
                .map(torneio -> new TorneioResponse(
                        torneio.getId(),
                        torneio.getTipo(),
                        torneio.getStatus()
                ))
                .toList();
    }

    @Transactional
    public void deletar(Long torneioId) {
        Torneio torneio = torneioRepository.findById(torneioId)
                .orElseThrow(() -> new RuntimeException("Torneio não encontrado"));

        List<Partida> partidas = partidaRepository.findByTorneioId(torneioId);
        boolean jogosIniciados = partidas.stream()
                .anyMatch(p -> p.getStatus() != StatusPartida.AGUARDANDO);

        if (jogosIniciados) {
            throw new RuntimeException("Não é possível excluir um torneio com partidas em andamento ou finalizadas.");
        }

        // Se houver partidas não iniciadas, limpa a árvore do chaveamento
        if (!partidas.isEmpty()) {
            partidas.forEach(p -> p.setProximaPartida(null));
            partidaRepository.saveAll(partidas);
            partidaRepository.deleteAll(partidas);
        }

        // Remove participações vinculadas
        participacaoRepository.deleteByTorneioId(torneioId);

        // Deleta o torneio
        torneioRepository.delete(torneio);
    }
}
