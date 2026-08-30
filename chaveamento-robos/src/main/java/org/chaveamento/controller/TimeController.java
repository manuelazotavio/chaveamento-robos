package org.chaveamento.controller;

import jakarta.validation.Valid;
import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.service.TimeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
