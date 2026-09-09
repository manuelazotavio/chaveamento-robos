import { api } from "./api";
import type { CriarTimeRequest, Time } from "@/types/time";

export const timeService = {
  async listar(): Promise<Time[]> {
    const { data } = await api.get<Time[]>("/api/times");
    return data;
  },

  async criar(payload: CriarTimeRequest): Promise<Time> {
    const { data } = await api.post<Time>("/api/times", payload);
    return data;
  },

  async uploadImagem(id: number, imagem: File): Promise<Time> {
    const formData = new FormData();
    formData.append("imagem", imagem);
    // deixa o axios definir o Content-Type com o boundary do multipart automaticamente
    const { data } = await api.post<Time>(`/api/times/time/${id}/imagem`, formData, {
      headers: { "Content-Type": undefined },
    });
    return data;
  },

  async uploadAudioGol(id: number, audio: File): Promise<Time> {
    const formData = new FormData();
    formData.append("audio", audio);
    const { data } = await api.post<Time>(`/api/times/time/${id}/audio-gol`, formData, {
      headers: { "Content-Type": undefined },
    });
    return data;
  },

  async uploadAudioVitoria(id: number, audio: File): Promise<Time> {
    const formData = new FormData();
    formData.append("audio", audio);
    const { data } = await api.post<Time>(`/api/times/time/${id}/audio-vitoria`, formData, {
      headers: { "Content-Type": undefined },
    });
    return data;
  },
};
