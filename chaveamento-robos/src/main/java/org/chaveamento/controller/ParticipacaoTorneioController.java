package org.chaveamento.controller;


import org.chaveamento.model.participacaotorneio.ParticipacaoTorneio;
import org.chaveamento.service.ParticipacaoTorneioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/torneios")
public class ParticipacaoTorneioController {

    private final ParticipacaoTorneioService service;

    public ParticipacaoTorneioController(ParticipacaoTorneioService service) {
        this.service = service;
    }

    @PostMapping("/{torneioId}/times/{timeId}")
    public ResponseEntity<ParticipacaoTorneio> adicionarTime(
            @PathVariable Long torneioId,
            @PathVariable Long timeId
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(service.adicionarTime(torneioId, timeId));
    }
}
