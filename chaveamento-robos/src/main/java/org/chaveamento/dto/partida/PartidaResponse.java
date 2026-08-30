package org.chaveamento.dto.partida;

import org.chaveamento.model.partida.FasePartida;
import org.chaveamento.model.partida.StatusPartida;

public record PartidaResponse(
        Long id,
        FasePartida fase,
        StatusPartida status,
        Long torneioId,
        Long timeAId,
        Long timeBId,
        Integer placarTimeA,
        Integer placarTimeB,
        Long vencedorId,
        Long proximaPartidaId
) {
}
