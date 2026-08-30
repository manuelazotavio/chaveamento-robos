package org.chaveamento.dto.time;

import org.chaveamento.model.time.EnumTime;
import org.chaveamento.model.time.Time;

public record TimeResponse(
        Long id,
        String nome,
        EnumTime tipo
) {

    public TimeResponse(Time time) {
        this(
                time.getId(),
                time.getNome(),
                time.getTipo()
        );
    }
}
