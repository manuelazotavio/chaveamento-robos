import { api } from "./api";
import type { Partida, ResultadoPartidaRequest } from "@/types/partida";

export const partidaService = {
  async registrarResultado(partidaId: number, payload: ResultadoPartidaRequest): Promise<Partida> {
    const { data } = await api.post<Partida>(`/partidas/${partidaId}/resultado`, payload);
    return data;
  },
};
