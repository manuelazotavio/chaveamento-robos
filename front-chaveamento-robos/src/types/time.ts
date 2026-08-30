export type EnumTime = "ROBOCODE" | "ROBOSOCCER";

export interface Time {
  id: number;
  nome: string;
  tipo: EnumTime;
}

export interface CriarTimeRequest {
  nome: string;
  tipo: EnumTime;
}
