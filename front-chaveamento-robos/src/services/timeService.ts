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
};
