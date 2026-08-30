package org.chaveamento.service;

import org.chaveamento.dto.partida.PartidaResponse;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.model.participacaotorneio.ParticipacaoTorneio;
import org.chaveamento.model.partida.FasePartida;
import org.chaveamento.model.partida.Partida;
import org.chaveamento.model.partida.PosicaoProximaPartida;
import org.chaveamento.model.partida.StatusPartida;
import org.chaveamento.model.time.Time;
import org.chaveamento.model.torneio.Torneio;
import org.chaveamento.repository.ParticipacaoTorneioRepository;
import org.chaveamento.repository.PartidaRepository;
import org.chaveamento.repository.TorneioRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class ChaveamentoService {
    private final TorneioRepository torneioRepository;
    private final ParticipacaoTorneioRepository participacaoRepository;
    private final PartidaRepository partidaRepository;

    public ChaveamentoService(
            TorneioRepository torneioRepository,
            ParticipacaoTorneioRepository participacaoRepository,
            PartidaRepository partidaRepository) {

        this.torneioRepository = torneioRepository;
        this.participacaoRepository = participacaoRepository;
        this.partidaRepository = partidaRepository;
    }

    public void validarQuantidadeTimes(int quantidade) {

        if (quantidade < 2 || (quantidade & (quantidade - 1)) != 0) {
            throw new RuntimeException(
                    "A quantidade de times deve ser uma potência de 2."
            );
        }
    }

    public List<Partida> gerarChaveamento(Long torneioId) {

        Torneio torneio = torneioRepository.findById(torneioId)
                .orElseThrow(() ->
                        new RuntimeException("Torneio não encontrado"));

        List<ParticipacaoTorneio> participacoes =
                participacaoRepository.findByTorneioId(torneioId);

        validarQuantidadeTimes(participacoes.size());
        List<Time> times = participacoes.stream()
                .map(ParticipacaoTorneio::getTime)
                .toList();

        List<Time> timesSorteados = new ArrayList<>(times);

        Collections.shuffle(timesSorteados);

        List<Partida> partidasPrimeiraFase =
                criarPrimeiraFase(torneio, timesSorteados);

        criarProximasFases(torneio, partidasPrimeiraFase);

        return partidaRepository.findByTorneioId(torneioId);
    }

    private List<Partida> criarPrimeiraFase(
            Torneio torneio,
            List<Time> times) {

        List<Partida> partidas = new ArrayList<>();

        FasePartida fase = descobrirFase(times.size());

        for (int i = 0; i < times.size(); i += 2) {

            Partida partida = new Partida();

            partida.setTorneio(torneio);
            partida.setFase(fase);
            partida.setStatus(StatusPartida.AGUARDANDO);

            partida.setTimeA(times.get(i));
            partida.setTimeB(times.get(i + 1));

            partidas.add(partidaRepository.save(partida));
        }

        return partidas;
    }

    private void criarProximasFases(
            Torneio torneio,
            List<Partida> partidasAtuais) {

        List<Partida> partidas = partidasAtuais;

        while (partidas.size() > 1) {

            List<Partida> proximasPartidas = new ArrayList<>();

            FasePartida proximaFase =
                    descobrirProximaFase(partidas.get(0).getFase());

            for (int i = 0; i < partidas.size(); i += 2) {

                Partida partida = new Partida();

                partida.setTorneio(torneio);
                partida.setFase(proximaFase);
                partida.setStatus(StatusPartida.AGUARDANDO);

                partida.setProximaPartida(null);

                Partida salva = partidaRepository.save(partida);

                partidas.get(i).setProximaPartida(salva);

                partidas.get(i).setPosicaoProximaPartida(PosicaoProximaPartida.TIME_A);
                partidas.get(i + 1).setProximaPartida(salva);

                partidas.get(i + 1).setPosicaoProximaPartida(PosicaoProximaPartida.TIME_B);

                partidaRepository.save(partidas.get(i));
                partidaRepository.save(partidas.get(i + 1));

                proximasPartidas.add(salva);
            }

            partidas = proximasPartidas;
        }
    }

    private FasePartida descobrirFase(int quantidadeTimes) {

        return switch (quantidadeTimes) {
            case 2 -> FasePartida.FINAL;
            case 4 -> FasePartida.SEMIFINAL;
            case 8 -> FasePartida.QUARTAS;
            case 16 -> FasePartida.OITAVAS;
            default -> throw new RuntimeException(
                    "Quantidade de times não suportada."
            );
        };
    }

    private FasePartida descobrirProximaFase(FasePartida fase) {

        return switch (fase) {
            case OITAVAS -> FasePartida.QUARTAS;
            case QUARTAS -> FasePartida.SEMIFINAL;
            case SEMIFINAL -> FasePartida.FINAL;
            case FINAL -> FasePartida.FINAL;
        };
    }

    public List<PartidaResponse> listarChaveamento(Long torneioId) {

        torneioRepository.findById(torneioId)
                .orElseThrow(() ->
                        new RuntimeException("Torneio não encontrado"));

        List<Partida> partidas =
                partidaRepository.findByTorneioId(torneioId);

        return partidas.stream()
                .map(partida -> new PartidaResponse(
                        partida.getId(),
                        partida.getFase(),
                        partida.getStatus(),
                        partida.getTorneio().getId(),
                        partida.getTimeA() != null
                                ? partida.getTimeA().getId()
                                : null,
                        partida.getTimeB() != null
                                ? partida.getTimeB().getId()
                                : null,
                        partida.getPlacarTimeA(),
                        partida.getPlacarTimeB(),
                        partida.getVencedor() != null
                                ? partida.getVencedor().getId()
                                : null,
                        partida.getProximaPartida() != null
                                ? partida.getProximaPartida().getId()
                                : null
                ))
                .toList();
    }



}
