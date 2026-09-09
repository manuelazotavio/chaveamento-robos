package org.chaveamento.service;

import org.chaveamento.model.time.Time;
import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.repository.TimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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

        return new TimeResponse(salvo);

    }

    public Time uploadImagem(Long id, MultipartFile imagem) throws IOException {

        Time time = getById(id);

        String nomeArquivo = id + ".jpg";

        Path pasta = Paths.get("uploads/time");
        Files.createDirectories(pasta);

        Path caminho = pasta.resolve(nomeArquivo);

        Files.copy(
                imagem.getInputStream(),
                caminho,
                StandardCopyOption.REPLACE_EXISTING
        );

        // caminho servido via o resource handler /uploads/** (ver CorsConfig)
        time.setImagem("/uploads/time/" + nomeArquivo);

        return timeRepository.save(time);

    }

    public Time uploadAudioGol(Long id, MultipartFile audio) throws IOException {

        Time time = getById(id);

        String caminhoSalvo = salvarAudio("uploads/audio/gol", id, audio);

        time.setAudioGol(caminhoSalvo);

        return timeRepository.save(time);
    }

    public Time uploadAudioVitoria(Long id, MultipartFile audio) throws IOException {

        Time time = getById(id);

        String caminhoSalvo = salvarAudio("uploads/audio/vitoria", id, audio);

        time.setAudioVitoria(caminhoSalvo);

        return timeRepository.save(time);
    }

    private String salvarAudio(String pastaBase, Long id, MultipartFile audio) throws IOException {

        String extensao = extensaoDoArquivo(audio.getOriginalFilename());
        String nomeArquivo = id + extensao;

        Path pasta = Paths.get(pastaBase);
        Files.createDirectories(pasta);

        Path caminho = pasta.resolve(nomeArquivo);

        Files.copy(
                audio.getInputStream(),
                caminho,
                StandardCopyOption.REPLACE_EXISTING
        );

        // caminho servido via o resource handler /uploads/** (ver CorsConfig)
        return "/" + pastaBase + "/" + nomeArquivo;
    }

    private String extensaoDoArquivo(String nomeOriginal) {

        if (nomeOriginal == null || !nomeOriginal.contains(".")) {
            return ".mp3";
        }

        return nomeOriginal.substring(nomeOriginal.lastIndexOf("."));
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
