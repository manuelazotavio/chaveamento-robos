import { api } from "./api";
import type { Partida } from "@/types/partida";

export const chaveamentoService = {
  async listar(torneioId: number): Promise<Partida[]> {
    const { data } = await api.get<Partida[]>(`/torneios/${torneioId}/chaveamento`);
    return data;
  },

  // o backend responde com a entidade Partida (formato diferente do listar) — só
  // precisamos disparar a geração, os dados corretos vêm do listar() logo em seguida
  async gerar(torneioId: number): Promise<void> {
    await api.post(`/torneios/${torneioId}/chaveamento`);
  },

  async resetar(torneioId: number): Promise<void> {
    await api.delete(`/torneios/${torneioId}/chaveamento`);
  },
};
