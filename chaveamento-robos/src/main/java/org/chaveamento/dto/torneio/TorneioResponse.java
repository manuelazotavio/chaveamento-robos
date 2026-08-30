package org.chaveamento.dto.torneio;

import org.chaveamento.model.torneio.EnumTorneio;
import org.chaveamento.model.torneio.StatusTorneio;

public record TorneioResponse (
        Long id,
        EnumTorneio tipo,
        StatusTorneio status
) {
}
