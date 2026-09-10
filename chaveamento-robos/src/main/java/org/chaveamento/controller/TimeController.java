package org.chaveamento.controller;

import jakarta.validation.Valid;
import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.service.TimeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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

    @PatchMapping("/{id}/aprovar")
    public ResponseEntity<TimeResponse> aprovar(@PathVariable Long id) {
        return ResponseEntity.ok(timeService.aprovar(id));
    }

    @PatchMapping("/{id}/reprovar")
    public ResponseEntity<TimeResponse> reprovar(@PathVariable Long id) {
        return ResponseEntity.ok(timeService.reprovar(id));
    }

    @PostMapping("/time/{id}/imagem")
    public ResponseEntity<?> upload(@PathVariable Long id, @RequestParam("imagem") MultipartFile imagem) throws IOException {

        return ResponseEntity.ok(timeService.uploadImagem(id, imagem));
    }

    @PostMapping("/time/{id}/audio-gol")
    public ResponseEntity<?> uploadAudioGol(@PathVariable Long id, @RequestParam("audio") MultipartFile audio) throws IOException {

        return ResponseEntity.ok(timeService.uploadAudioGol(id, audio));
    }

    @PostMapping("/time/{id}/audio-vitoria")
    public ResponseEntity<?> uploadAudioVitoria(@PathVariable Long id, @RequestParam("audio") MultipartFile audio) throws IOException {

        return ResponseEntity.ok(timeService.uploadAudioVitoria(id, audio));
    }
}
