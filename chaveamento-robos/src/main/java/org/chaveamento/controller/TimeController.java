package org.chaveamento.controller;

import jakarta.validation.Valid;
import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.model.time.Time;
import org.chaveamento.service.TimeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

@RestController
@RequestMapping("/api/times")
public class TimeController {

    private final TimeService timeService;

    public TimeController(TimeService timeService) {
        this.timeService = timeService;
    }

    @PostMapping
    public ResponseEntity<TimeResponse> criar(
            @Valid @RequestBody CriarTimeRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(timeService.criar(request));
    }

    @GetMapping
    public ResponseEntity<List<TimeResponse>> listar() {

        return ResponseEntity.ok(timeService.listar());
    }

    @PostMapping("/time/{id}/imagem")
    public ResponseEntity<?> upload(@PathVariable Long id, @RequestParam("imagem") MultipartFile imagem) throws IOException {

        return ResponseEntity.ok(timeService.uploadImagem(id, imagem));
    }
}
