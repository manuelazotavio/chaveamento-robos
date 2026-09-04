package org.chaveamento.service;

import org.chaveamento.model.time.Time;
import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.repository.TimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

@Service
public class TimeService {

    private final TimeRepository timeRepository;

    public TimeService(TimeRepository timeRepository) {
        this.timeRepository = timeRepository;
    }

    public TimeResponse criar(CriarTimeRequest request){

        Time time = new Time(request.nome(), request.tipo(), request.imagem());

        Time salvo = timeRepository.save(time);

        return new TimeResponse(
                salvo.getId(),
                salvo.getNome(),
                salvo.getTipo()
        );

    }

    public Time uploadImagem(Long id, MultipartFile imagem){

        Time time = timeService.getById(id);

        String nomeArquivo = id + ".jpg";

        Path pasta = Paths.get("uploads/time");
        Files.createDirectory(pasta);

        Path caminho = pasta.resolve(nomeArquivo);

        Files.copy(
                imagem.getInputStream(),
                caminho,
                StandardCopyOption.REPLACE_EXISTING
        );

        time.setImagem("uploads/time" + nomeArquivo);

        return timeRepository.save(time);

    }


    public List<TimeResponse> listar() {
        return timeRepository.findAll()
                .stream()
                .map(TimeResponse::new)
                .toList();
    }

    public Time getById(Long id) {
        return timeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Time não encontrado"));
    }
}
