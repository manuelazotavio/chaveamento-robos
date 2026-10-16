package org.chaveamento.controller;

import org.chaveamento.dto.torneio.CriarTorneioRequest;
import org.chaveamento.dto.torneio.TorneioResponse;
import org.chaveamento.service.TorneioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        torneioService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException e) {
        String msg = e.getMessage() != null ? e.getMessage() : "Erro inesperado";
        return ResponseEntity.badRequest().body(Map.of(
                "erro", msg,
                "message", msg
        ));
    }
}
