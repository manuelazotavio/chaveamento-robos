import type { EnumTime, Time } from "./time";

export type EnumTorneio = EnumTime;

export type StatusTorneio = "INSCRICOES" | "EM_ANDAMENTO" | "FINALIZADO";

export interface Torneio {
  id: number;
  tipo: EnumTorneio;
  status: StatusTorneio | null;
}

export interface CriarTorneioRequest {
  tipo: EnumTorneio;
}

export interface ParticipacaoTorneio {
  id: number;
  torneio: Torneio;
  time: Time;
}
