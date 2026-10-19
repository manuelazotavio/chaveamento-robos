package org.chaveamento.dto.partida;

public record RegistrarRoundRequest(
        String vencedorRound, // "TIME_A" ou "TIME_B" (ou "A", "B")
        Long timeVencedorId,  // Opcional: ID do time vencedor
        Integer vitoriasParaGanhar, // Opcional: quantidade de vitórias para encerrar a partida (se aplicável)
        Integer maxRounds,          // Opcional: limite de rounds
        Boolean finalizarComDuasSeguidas // Opcional: se true e placar for 2x0 encerra antecipadamente
) {
}
