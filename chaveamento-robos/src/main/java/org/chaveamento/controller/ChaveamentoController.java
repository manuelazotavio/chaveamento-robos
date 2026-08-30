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

    public ResponseEntity<List<org.chaveamento.dto.partida.PartidaResponse>> listar(
            @PathVariable Long torneioId) {

        return ResponseEntity.ok(
                chaveamentoService.listarChaveamento(torneioId)
        );
    }
}
