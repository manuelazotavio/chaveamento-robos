package org.chaveamento.service;

import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.model.participacaotorneio.ParticipacaoTorneio;
import org.chaveamento.model.time.Time;
import org.chaveamento.model.torneio.Torneio;
import org.chaveamento.repository.ParticipacaoTorneioRepository;
import org.chaveamento.repository.TimeRepository;
import org.chaveamento.repository.TorneioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParticipacaoTorneioService {

    private final ParticipacaoTorneioRepository participacaoRepository;
    private final TorneioRepository torneioRepository;
    private final TimeRepository timeRepository;


    public ParticipacaoTorneioService(ParticipacaoTorneioRepository participacaoRepository, TorneioRepository torneioRepository, TimeRepository timeRepository) {
        this.participacaoRepository = participacaoRepository;
        this.torneioRepository = torneioRepository;
        this.timeRepository = timeRepository;
    }

    public ParticipacaoTorneio adicionarTime(Long torneioId, Long timeId){
        Torneio torneio = torneioRepository.findById(torneioId)
                .orElseThrow(() -> new RuntimeException("Torneio não encontrado"));


        Time time = timeRepository.findById(timeId)
                .orElseThrow(() -> new RuntimeException("Time não encontrado"));
        if(participacaoRepository
                .existsByTorneioIdAndTimeId(torneioId, timeId)){
            throw new RuntimeException("O time já está inscrito nesse torneio");
        }

        ParticipacaoTorneio participacao = new ParticipacaoTorneio();

        participacao.setTorneio(torneio);
        participacao.setTime(time);

        return participacaoRepository.save(participacao);
    }

    public List<TimeResponse> listarTimes(Long torneioId) {

        torneioRepository.findById(torneioId)
                .orElseThrow(() ->
                        new RuntimeException("Torneio não encontrado"));

        return participacaoRepository
                .findByTorneioId(torneioId)
                .stream()
                .map(participacao -> new TimeResponse(participacao.getTime()))
                .toList();
    }
}

