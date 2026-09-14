package org.chaveamento.service;

import org.chaveamento.model.time.StatusTime;
import org.chaveamento.model.time.Time;
import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.repository.TimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class TimeService {

    private final TimeRepository timeRepository;
    private final SupabaseStorageService storageService;

    public TimeService(TimeRepository timeRepository, SupabaseStorageService storageService) {
        this.timeRepository = timeRepository;
        this.storageService = storageService;
    }

    public TimeResponse criar(CriarTimeRequest request){

        Time time = new Time(request.nome(), request.tipo(), request.imagem());

        Time salvo = timeRepository.save(time);

        return new TimeResponse(salvo);

    }

    public Time uploadImagem(Long id, MultipartFile imagem) throws IOException {

        Time time = getById(id);

        String nomeArquivo = id + ".jpg";

        String url = storageService.upload(
                "time/" + nomeArquivo,
                imagem.getInputStream(),
                imagem.getContentType()
        );

        time.setImagem(url);

        return timeRepository.save(time);

    }

    public Time uploadAudioGol(Long id, MultipartFile audio) throws IOException {

        Time time = getById(id);

        String url = salvarAudio("audio/gol", id, audio);

        time.setAudioGol(url);

        return timeRepository.save(time);
    }

    public Time uploadAudioVitoria(Long id, MultipartFile audio) throws IOException {

        Time time = getById(id);

        String url = salvarAudio("audio/vitoria", id, audio);

        time.setAudioVitoria(url);

        return timeRepository.save(time);
    }

    private String salvarAudio(String pastaBase, Long id, MultipartFile audio) throws IOException {

        String extensao = extensaoDoArquivo(audio.getOriginalFilename());
        String nomeArquivo = id + extensao;

        return storageService.upload(
                pastaBase + "/" + nomeArquivo,
                audio.getInputStream(),
                audio.getContentType()
        );
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

    public TimeResponse detalhar(Long id) {
        return new TimeResponse(getById(id));
    }

    public Time getById(Long id) {
        return timeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Time não encontrado"));
    }

    public TimeResponse aprovar(Long id) {
        Time time = getById(id);
        time.setStatus(StatusTime.APROVADO);
        return new TimeResponse(timeRepository.save(time));
    }

    public TimeResponse reprovar(Long id) {
        Time time = getById(id);
        time.setStatus(StatusTime.REJEITADO);
        return new TimeResponse(timeRepository.save(time));
    }
}
