package org.chaveamento.dto.partida;

public record ResultadoPartidaRequest(
        Integer placarTimeA,
        Integer placarTimeB,
        String observacao
) {
    public ResultadoPartidaRequest(Integer placarTimeA, Integer placarTimeB) {
        this(placarTimeA, placarTimeB, null);
    }
}
