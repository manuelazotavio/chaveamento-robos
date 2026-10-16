import { api } from "./api";
import type { Partida, ResultadoPartidaRequest } from "@/types/partida";

export const partidaService = {
  async registrarResultado(partidaId: number, payload: ResultadoPartidaRequest): Promise<Partida> {
    const { data } = await api.post<Partida>(`/partidas/${partidaId}/resultado`, payload);
    return data;
  },
  async atualizarResultado(partidaId: number, payload: ResultadoPartidaRequest): Promise<Partida> {
    const { data } = await api.put<Partida>(`/partidas/${partidaId}/resultado`, payload);
    return data;
  },
  async iniciar(partidaId: number): Promise<Partida> {
    const { data } = await api.post<Partida>(`/partidas/${partidaId}/iniciar`);
    return data;
  },
  async resetar(partidaId: number): Promise<Partida> {
    const { data } = await api.post<Partida>(`/partidas/${partidaId}/resetar`);
    return data;
  },
};

