package org.chaveamento.service;

import org.chaveamento.model.time.Time;
import org.chaveamento.dto.time.CriarTimeRequest;
import org.chaveamento.dto.time.TimeResponse;
import org.chaveamento.repository.TimeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TimeService {

    private final TimeRepository timeRepository;

    public TimeService(TimeRepository timeRepository) {
        this.timeRepository = timeRepository;
    }

    public TimeResponse criar(CriarTimeRequest request){

        Time time = new Time(request.nome(), request.tipo());

        Time salvo = timeRepository.save(time);

        return new TimeResponse(
                salvo.getId(),
                salvo.getNome(),
                salvo.getTipo()
        );

    }

    public List<TimeResponse> listar() {
        return timeRepository.findAll()
                .stream()
                .map(TimeResponse::new)
                .toList();
    }
}
