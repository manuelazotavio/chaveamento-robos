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

    public PartidaResponse registrarResultado(
            Long partidaId,
            ResultadoPartidaRequest request) {

        Partida partida = partidaRepository.findById(partidaId)
                .orElseThrow(() ->
                        new RuntimeException("Partida não encontrada"));

        if (partida.getStatus() == StatusPartida.FINALIZADA) {
            throw new RuntimeException(
                    "Essa partida já foi finalizada");
        }

        if (request.placarTimeA() < 0 ||
                request.placarTimeB() < 0) {

            throw new RuntimeException(
                    "O placar não pode ser negativo");
        }

        if (request.placarTimeA()
                .equals(request.placarTimeB())) {

            throw new RuntimeException(
                    "A partida não pode terminar empatada");
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


        Partida salva = partidaRepository.save(partida);


        Partida proxima = partida.getProximaPartida();

        if (proxima != null) {

            if (partida.getPosicaoProximaPartida()
                    == PosicaoProximaPartida.TIME_A) {

                proxima.setTimeA(vencedor);

            } else if (partida.getPosicaoProximaPartida()
                    == PosicaoProximaPartida.TIME_B) {

                proxima.setTimeB(vencedor);
            }

            partidaRepository.save(proxima);
        }

        return new PartidaResponse(
                salva.getId(),
                salva.getFase(),
                salva.getStatus(),
                salva.getTorneio().getId(),
                salva.getTimeA() != null
                        ? salva.getTimeA().getId()
                        : null,
                salva.getTimeB() != null
                        ? salva.getTimeB().getId()
                        : null,
                salva.getPlacarTimeA(),
                salva.getPlacarTimeB(),
                salva.getVencedor() != null
                        ? salva.getVencedor().getId()
                        : null,
                salva.getProximaPartida() != null
                        ? salva.getProximaPartida().getId()
                        : null
        );
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