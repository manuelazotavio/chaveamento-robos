import { api } from "./api";
import type { CriarTorneioRequest, ParticipacaoTorneio, Torneio } from "@/types/torneio";

export const torneioService = {
  async listar(): Promise<Torneio[]> {
    const { data } = await api.get<Torneio[]>("/torneios");
    return data;
  },

  async criar(payload: CriarTorneioRequest): Promise<Torneio> {
    const { data } = await api.post<Torneio>("/torneios", payload);
    return data;
  },

  async inscreverTime(torneioId: number, timeId: number): Promise<ParticipacaoTorneio> {
    const { data } = await api.post<ParticipacaoTorneio>(`/torneios/${torneioId}/times/${timeId}`);
    return data;
  },
};
