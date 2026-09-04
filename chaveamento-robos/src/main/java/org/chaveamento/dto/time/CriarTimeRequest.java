package org.chaveamento.dto.time;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.chaveamento.model.time.EnumTime;

public record CriarTimeRequest(
        @NotBlank(message = "O nome do time é obrigatório")
        String nome,

        @NotNull(message = "O tipo do time é obrigatório")
        EnumTime tipo,

        String imagem
) {
}
