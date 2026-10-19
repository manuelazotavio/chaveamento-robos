package org.chaveamento.service;

import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.model.time.StatusTime;
import org.chaveamento.model.time.Time;
import org.chaveamento.repository.ParticipacaoTorneioRepository;
import org.chaveamento.repository.PartidaRepository;
import org.chaveamento.repository.TimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TimeService {

    private final TimeRepository timeRepository;
    private final SupabaseStorageService storageService;
    private final ParticipacaoTorneioRepository participacaoRepository;
    private final PartidaRepository partidaRepository;

    public TimeService(
            TimeRepository timeRepository,
            SupabaseStorageService storageService,
            ParticipacaoTorneioRepository participacaoRepository,
            PartidaRepository partidaRepository
    ) {
        this.timeRepository = timeRepository;
        this.storageService = storageService;
        this.participacaoRepository = participacaoRepository;
        this.partidaRepository = partidaRepository;
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
        Map<Long, Long> timeParaTorneio = participacaoRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        p -> p.getTime().getId(),
                        p -> p.getTorneio().getId(),
                        (existente, substituto) -> existente
                ));

        return timeRepository.findAll()
                .stream()
                .map(time -> new TimeResponse(time, timeParaTorneio.get(time.getId())))
                .toList();
    }

    public TimeResponse detalhar(Long id) {
        Time time = getById(id);
        Long torneioId = participacaoRepository.findFirstByTimeId(id)
                .map(p -> p.getTorneio().getId())
                .orElse(null);
        return new TimeResponse(time, torneioId);
    }

    public Time getById(Long id) {
        return timeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Time não encontrado"));
    }

    public TimeResponse aprovar(Long id) {
        Time time = getById(id);
        time.setStatus(StatusTime.APROVADO);
        Long torneioId = participacaoRepository.findFirstByTimeId(id)
                .map(p -> p.getTorneio().getId())
                .orElse(null);
        return new TimeResponse(timeRepository.save(time), torneioId);
    }

    @Transactional
    public TimeResponse reprovar(Long id) {
        Time time = getById(id);

        participacaoRepository.findFirstByTimeId(id).ifPresent(p -> {
            Long torneioId = p.getTorneio().getId();
            if (partidaRepository.existsByTorneioId(torneioId)) {
                throw new RuntimeException("Não é possível reprovar o time: o chaveamento do torneio #" + torneioId + " já foi gerado. Zere o chaveamento primeiro.");
            }
            participacaoRepository.deleteByTorneioIdAndTimeId(torneioId, id);
        });

        time.setStatus(StatusTime.REJEITADO);
        return new TimeResponse(timeRepository.save(time), null);
    }

    @Transactional
    public TimeResponse voltarPendente(Long id) {
        Time time = getById(id);

        participacaoRepository.findFirstByTimeId(id).ifPresent(p -> {
            Long torneioId = p.getTorneio().getId();
            if (partidaRepository.existsByTorneioId(torneioId)) {
                throw new RuntimeException("Não é possível alterar o status do time: o chaveamento do torneio #" + torneioId + " já foi gerado. Zere o chaveamento primeiro.");
            }
            participacaoRepository.deleteByTorneioIdAndTimeId(torneioId, id);
        });

        time.setStatus(StatusTime.PENDENTE);
        return new TimeResponse(timeRepository.save(time), null);
    }
}
