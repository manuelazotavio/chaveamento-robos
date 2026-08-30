package org.chaveamento.service;


import org.chaveamento.dto.torneio.CriarTorneioRequest;
import org.chaveamento.dto.torneio.TorneioResponse;
import org.chaveamento.model.torneio.Torneio;
import org.chaveamento.repository.TorneioRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TorneioService {

    public final TorneioRepository torneioRepository;

    public TorneioService(TorneioRepository torneioRepository) {
        this.torneioRepository = torneioRepository;
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


}
