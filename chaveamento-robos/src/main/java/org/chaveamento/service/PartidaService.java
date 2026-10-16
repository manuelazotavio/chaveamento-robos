package org.chaveamento.service;

import org.chaveamento.dto.partida.PartidaResponse;
import org.chaveamento.dto.partida.ResultadoPartidaRequest;
import org.chaveamento.model.partida.Partida;
import org.chaveamento.model.partida.PosicaoProximaPartida;
import org.chaveamento.model.partida.StatusPartida;
import org.chaveamento.model.time.Time;
import org.chaveamento.repository.PartidaRepository;
import org.springframework.stereotype.Service;

@Service
public class PartidaService {

    private final PartidaRepository partidaRepository;

    public PartidaService(PartidaRepository partidaRepository) {
        this.partidaRepository = partidaRepository;
    }

    public PartidaResponse buscarPorId(Long partidaId) {
        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));
        return toResponse(partida);
    }

    public PartidaResponse iniciarPartida(Long partidaId) {
        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));

        if (partida.getStatus() == StatusPartida.FINALIZADA) {
            throw new RuntimeException("Essa partida já foi finalizada");
        }

        if (partida.getTimeA() == null || partida.getTimeB() == null) {
            throw new RuntimeException("Não é possível iniciar a partida sem os dois times definidos");
        }

        partida.setStatus(StatusPartida.EM_ANDAMENTO);
        if (partida.getPlacarTimeA() == null) {
            partida.setPlacarTimeA(0);
        }
        if (partida.getPlacarTimeB() == null) {
            partida.setPlacarTimeB(0);
        }

        Partida salva = partidaRepository.save(partida);
        return toResponse(salva);
    }

    public PartidaResponse resetarPartida(Long partidaId) {
        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));

        partida.setStatus(StatusPartida.AGUARDANDO);
        partida.setPlacarTimeA(0);
        partida.setPlacarTimeB(0);
        partida.setVencedor(null);

        Partida proxima = partida.getProximaPartida();
        if (proxima != null && proxima.getStatus() != StatusPartida.FINALIZADA) {
            if (partida.getPosicaoProximaPartida() == PosicaoProximaPartida.TIME_A) {
                proxima.setTimeA(null);
            } else if (partida.getPosicaoProximaPartida() == PosicaoProximaPartida.TIME_B) {
                proxima.setTimeB(null);
            }
            partidaRepository.save(proxima);
        }

        Partida salva = partidaRepository.save(partida);
        return toResponse(salva);
    }

    public PartidaResponse registrarRound(Long partidaId, org.chaveamento.dto.partida.RegistrarRoundRequest request) {
        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));

        if (partida.getStatus() == StatusPartida.FINALIZADA) {
            throw new RuntimeException("Essa partida já foi finalizada");
        }

        if (partida.getTimeA() == null || partida.getTimeB() == null) {
            throw new RuntimeException("Ambos os times devem estar definidos para registrar rounds");
        }

        if (partida.getStatus() == StatusPartida.AGUARDANDO) {
            partida.setStatus(StatusPartida.EM_ANDAMENTO);
        }

        int placarA = partida.getPlacarTimeA() != null ? partida.getPlacarTimeA() : 0;
        int placarB = partida.getPlacarTimeB() != null ? partida.getPlacarTimeB() : 0;

        boolean timeAVenceu = false;

        if (request.timeVencedorId() != null) {
            if (request.timeVencedorId().equals(partida.getTimeA().getId())) {
                timeAVenceu = true;
            } else if (request.timeVencedorId().equals(partida.getTimeB().getId())) {
                timeAVenceu = false;
            } else {
                throw new RuntimeException("O ID informado não pertence a nenhum dos times desta partida");
            }
        } else if (request.vencedorRound() != null) {
            String v = request.vencedorRound().trim().toUpperCase();
            if ("TIME_A".equals(v) || "A".equals(v)) {
                timeAVenceu = true;
            } else if ("TIME_B".equals(v) || "B".equals(v)) {
                timeAVenceu = false;
            } else {
                throw new RuntimeException("Vencedor do round inválido. Informe 'TIME_A' ou 'TIME_B'");
            }
        } else {
            throw new RuntimeException("Informe o vencedor do round ('vencedorRound' ou 'timeVencedorId')");
        }

        if (timeAVenceu) {
            placarA++;
        } else {
            placarB++;
        }

        partida.setPlacarTimeA(placarA);
        partida.setPlacarTimeB(placarB);

        Integer vitoriasParaGanhar = request.vitoriasParaGanhar();
        boolean finalizarPorDuasSeguidas = Boolean.TRUE.equals(request.finalizarComDuasSeguidas());

        boolean deveFinalizar = false;
        Time vencedor = null;

        // Condição 1: Atingiu o número de vitórias estipulado (somente se informado pelo cliente)
        if (vitoriasParaGanhar != null && placarA >= vitoriasParaGanhar) {
            deveFinalizar = true;
            vencedor = partida.getTimeA();
        } else if (vitoriasParaGanhar != null && placarB >= vitoriasParaGanhar) {
            deveFinalizar = true;
            vencedor = partida.getTimeB();
        }
        // Condição 2: Duas vitórias seguidas (somente se solicitado explicitamente pelo cliente)
        else if (finalizarPorDuasSeguidas && ((placarA >= 2 && placarB == 0) || (placarB >= 2 && placarA == 0))) {
            deveFinalizar = true;
            vencedor = (placarA > placarB) ? partida.getTimeA() : partida.getTimeB();
        }
        // Condição 3: Limite de rounds atingido (somente se informado pelo cliente)
        else if (request.maxRounds() != null && (placarA + placarB) >= request.maxRounds()) {
            if (placarA != placarB) {
                deveFinalizar = true;
                vencedor = (placarA > placarB) ? partida.getTimeA() : partida.getTimeB();
            }
        }

        if (deveFinalizar && vencedor != null) {
            partida.setVencedor(vencedor);
            partida.setStatus(StatusPartida.FINALIZADA);
            avancarVencedor(partida);
        }

        Partida salva = partidaRepository.save(partida);
        return toResponse(salva);
    }

    public PartidaResponse registrarResultado(
            Long partidaId,
            ResultadoPartidaRequest request) {

        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));

        if (partida.getStatus() == StatusPartida.FINALIZADA) {
            throw new RuntimeException("Essa partida já foi finalizada");
        }

        if (partida.getTimeA() == null || partida.getTimeB() == null) {
            throw new RuntimeException("Não é possível registrar resultado sem os dois times definidos");
        }

        if (request.placarTimeA() < 0 || request.placarTimeB() < 0) {
            throw new RuntimeException("O placar não pode ser negativo");
        }

        if (request.placarTimeA().equals(request.placarTimeB())) {
            throw new RuntimeException("A partida não pode terminar empatada");
        }

        partida.setPlacarTimeA(request.placarTimeA());
        partida.setPlacarTimeB(request.placarTimeB());

        Time vencedor;
        if (request.placarTimeA() > request.placarTimeB()) {
            vencedor = partida.getTimeA();
        } else {
            vencedor = partida.getTimeB();
        }

        partida.setVencedor(vencedor);
        partida.setStatus(StatusPartida.FINALIZADA);

        avancarVencedor(partida);

        Partida salva = partidaRepository.save(partida);
        return toResponse(salva);
    }

    public PartidaResponse atualizarResultado(
            Long partidaId,
            ResultadoPartidaRequest request) {

        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));

        if (partida.getTimeA() == null || partida.getTimeB() == null) {
            throw new RuntimeException("Não é possível atualizar resultado sem os dois times definidos");
        }

        if (request.placarTimeA() < 0 || request.placarTimeB() < 0) {
            throw new RuntimeException("O placar não pode ser negativo");
        }

        if (request.placarTimeA().equals(request.placarTimeB())) {
            throw new RuntimeException("A partida não pode terminar empatada");
        }

        partida.setPlacarTimeA(request.placarTimeA());
        partida.setPlacarTimeB(request.placarTimeB());

        Time vencedor;
        if (request.placarTimeA() > request.placarTimeB()) {
            vencedor = partida.getTimeA();
        } else {
            vencedor = partida.getTimeB();
        }

        partida.setVencedor(vencedor);
        partida.setStatus(StatusPartida.FINALIZADA);

        avancarVencedor(partida);

        Partida salva = partidaRepository.save(partida);
        return toResponse(salva);
    }

    private void avancarVencedor(Partida partida) {
        Partida proxima = partida.getProximaPartida();
        if (proxima == null) {
            return;
        }

        Time antigoTime = (partida.getPosicaoProximaPartida() == PosicaoProximaPartida.TIME_A)
                ? proxima.getTimeA()
                : proxima.getTimeB();

        if (partida.getPosicaoProximaPartida() == PosicaoProximaPartida.TIME_A) {
            proxima.setTimeA(partida.getVencedor());
        } else if (partida.getPosicaoProximaPartida() == PosicaoProximaPartida.TIME_B) {
            proxima.setTimeB(partida.getVencedor());
        }

        if (antigoTime != null && !antigoTime.getId().equals(partida.getVencedor().getId())) {
            if (proxima.getStatus() != StatusPartida.AGUARDANDO) {
                proxima.setStatus(StatusPartida.AGUARDANDO);
                proxima.setPlacarTimeA(0);
                proxima.setPlacarTimeB(0);
                proxima.setVencedor(null);
            }
        }

        partidaRepository.save(proxima);
    }

    private PartidaResponse toResponse(Partida partida) {
        return new PartidaResponse(
                partida.getId(),
                partida.getFase(),
                partida.getStatus(),
                partida.getTorneio().getId(),
                partida.getTimeA() != null ? partida.getTimeA().getId() : null,
                partida.getTimeB() != null ? partida.getTimeB().getId() : null,
                partida.getPlacarTimeA(),
                partida.getPlacarTimeB(),
                partida.getVencedor() != null ? partida.getVencedor().getId() : null,
                partida.getProximaPartida() != null ? partida.getProximaPartida().getId() : null
        );
    }


}