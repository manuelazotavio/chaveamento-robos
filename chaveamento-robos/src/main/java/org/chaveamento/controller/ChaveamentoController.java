package org.chaveamento.controller;

import org.chaveamento.dto.partida.PartidaResponse;
import org.chaveamento.model.partida.Partida;
import org.chaveamento.service.ChaveamentoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/torneios")

public class ChaveamentoController {
    private final ChaveamentoService chaveamentoService;

    public ChaveamentoController(ChaveamentoService chaveamentoService){
        this.chaveamentoService = chaveamentoService;
    }

    @PostMapping("/{torneioId}/chaveamento")
    public ResponseEntity<List<Partida>> gerar(
            @PathVariable Long torneioId
    ) {
        return ResponseEntity.ok(
                chaveamentoService.gerarChaveamento(torneioId)
        );
    }

    @GetMapping("/{torneioId}/chaveamento")
    public ResponseEntity<List<PartidaResponse>> listar(
            @PathVariable Long torneioId) {

        return ResponseEntity.ok(
                chaveamentoService.listarChaveamento(torneioId)
        );
    }

    @DeleteMapping("/{torneioId}/chaveamento")
    public ResponseEntity<Void> resetar(
            @PathVariable Long torneioId) {

        chaveamentoService.resetarChaveamento(torneioId);

        return ResponseEntity.noContent().build();
    }
}
