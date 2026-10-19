package org.chaveamento.controller;

import org.chaveamento.dto.partida.PartidaResponse;
import org.chaveamento.dto.partida.RegistrarRoundRequest;
import org.chaveamento.dto.partida.ResultadoPartidaRequest;
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

    @GetMapping("/{partidaId}")
    public ResponseEntity<PartidaResponse> buscarPorId(@PathVariable Long partidaId) {
        return ResponseEntity.ok(partidaService.buscarPorId(partidaId));
    }

    @PostMapping("/{partidaId}/iniciar")
    public ResponseEntity<PartidaResponse> iniciarPartida(@PathVariable Long partidaId) {
        return ResponseEntity.ok(partidaService.iniciarPartida(partidaId));
    }

    @PostMapping("/{partidaId}/rounds")
    public ResponseEntity<PartidaResponse> registrarRound(
            @PathVariable Long partidaId,
            @RequestBody RegistrarRoundRequest request) {
        return ResponseEntity.ok(partidaService.registrarRound(partidaId, request));
    }

    @PostMapping("/{partidaId}/resetar")
    public ResponseEntity<PartidaResponse> resetarPartida(@PathVariable Long partidaId) {
        return ResponseEntity.ok(partidaService.resetarPartida(partidaId));
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

    @PutMapping({ "/{partidaId}/resultado", "/admin/{partidaId}/resultado" })
    public ResponseEntity<PartidaResponse> atualizarResultado(
            @PathVariable Long partidaId,
            @RequestBody ResultadoPartidaRequest request) {

        return ResponseEntity.ok(
                partidaService.atualizarResultado(
                        partidaId,
                        request
                )
        );
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<java.util.Map<String, String>> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.badRequest().body(java.util.Map.of("erro", e.getMessage() != null ? e.getMessage() : "Erro inesperado"));
    }
}