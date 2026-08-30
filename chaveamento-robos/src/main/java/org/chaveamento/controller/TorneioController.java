package org.chaveamento.controller;

import org.chaveamento.dto.torneio.CriarTorneioRequest;
import org.chaveamento.service.TorneioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/torneios")
public class TorneioController {

    private final TorneioService torneioService;

    public TorneioController(TorneioService torneioService) {
        this.torneioService = torneioService;
    }

    @PostMapping
    public ResponseEntity<TorneioResponse> criar(
            @RequestBody CriarTorneioRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(torneioService.criar(request));
    }

    @GetMapping
    public ResponseEntity<List<TorneioResponse>> listar() {
        return ResponseEntity.ok(torneioService.listar());
    }

}
