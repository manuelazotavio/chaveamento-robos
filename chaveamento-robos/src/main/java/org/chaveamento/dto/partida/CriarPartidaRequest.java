package org.chaveamento.dto.partida;

public record CriarPartidaRequest(
        Long torneioId,
        Long timeAId,
        Long timeBId
) {
}
