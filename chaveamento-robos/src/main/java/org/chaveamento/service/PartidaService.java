package org.chaveamento.service;

import org.chaveamento.dto.partida.ResultadoPartidaRequest;
import org.chaveamento.model.partida.Partida;
import org.chaveamento.model.partida.PosicaoProximaPartida;
import org.chaveamento.model.partida.StatusPartida;
import org.chaveamento.repository.PartidaRepository;
import org.springframework.stereotype.Service;

@Service
public class PartidaService {

    private final PartidaRepository partidaRepository;

    public PartidaService(PartidaRepository partidaRepository) {
        this.partidaRepository = partidaRepository;
    }

    public Partida registrarResultado(
            Long partidaId,
            ResultadoPartidaRequest request) {

        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));

        if (partida.getStatus() == StatusPartida.FINALIZADA) {
            throw new RuntimeException(
                    "Essa partida já foi finalizada"
            );
        }

        if (partida.getTimeA() == null ||
                partida.getTimeB() == null) {

            throw new RuntimeException(
                    "A partida ainda não possui os dois times"
            );
        }

        if (request.placarTimeA() == null ||
                request.placarTimeB() == null) {

            throw new RuntimeException(
                    "Os placares são obrigatórios"
            );
        }

        if (request.placarTimeA() < 0 ||
                request.placarTimeB() < 0) {

            throw new RuntimeException(
                    "O placar não pode ser negativo"
            );
        }

        if (request.placarTimeA()
                .equals(request.placarTimeB())) {

            throw new RuntimeException(
                    "A partida não pode terminar empatada"
            );
        }

        partida.setPlacarTimeA(request.placarTimeA());
        partida.setPlacarTimeB(request.placarTimeB());
        partida.setStatus(StatusPartida.FINALIZADA);

        if (request.placarTimeA() >
                request.placarTimeB()) {

            partida.setVencedor(partida.getTimeA());

        } else {

            partida.setVencedor(partida.getTimeB());
        }

        Partida salva = partidaRepository.save(partida);

        avancarVencedor(salva);

        return salva;
    }

    private void avancarVencedor(Partida partida) {

        Partida proxima = partida.getProximaPartida();

        if (proxima == null) {
            return;
        }

        if (partida.getPosicaoProximaPartida()
                == PosicaoProximaPartida.TIME_A) {

            proxima.setTimeA(partida.getVencedor());

        } else {

            proxima.setTimeB(partida.getVencedor());
        }

        partidaRepository.save(proxima);
    }
}