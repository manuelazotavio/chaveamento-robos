package org.chaveamento.dto.time;

import org.chaveamento.model.time.EnumTime;
import org.chaveamento.model.time.Time;

public record TimeResponse(
        Long id,
        String nome,
        EnumTime tipo,
        String imagem,
        String audioGol,
        String audioVitoria
) {

    public TimeResponse(Time time) {
        this(
                time.getId(),
                time.getNome(),
                time.getTipo(),
                time.getImagem(),
                time.getAudioGol(),
                time.getAudioVitoria()
        );
    }
}
