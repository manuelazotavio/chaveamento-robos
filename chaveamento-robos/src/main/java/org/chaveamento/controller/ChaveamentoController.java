package org.chaveamento.controller;

import org.chaveamento.model.partida.Partida;
import org.chaveamento.service.ChaveamentoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
