package org.chaveamento.controller;

import org.chaveamento.dto.partida.PartidaResponse;
import org.chaveamento.dto.partida.ResultadoPartidaRequest;
import org.chaveamento.model.partida.Partida;
import org.chaveamento.service.PartidaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/partidas")
public class PartidaController {

    private final PartidaService partidaService;

    public PartidaController(PartidaService partidaService) {
        this.partidaService = partidaService;
    }

    @PostMapping("/{partidaId}/resultado")
    public ResponseEntity<PartidaResponse> registrarResultado(
            @PathVariable Long partidaId,
            @RequestBody ResultadoPartidaRequest request) {

        return ResponseEntity.ok(
                partidaService.registrarResultado(
                        partidaId,
                        request
                )
        );
    }
}