package org.chaveamento.dto.torneio;

import jakarta.validation.constraints.NotBlank;
import org.chaveamento.model.torneio.EnumTorneio;

public record CriarTorneioRequest(
        @NotBlank(message = "O tipo do torneio é obrigatório")
        EnumTorneio tipo
) {
}
