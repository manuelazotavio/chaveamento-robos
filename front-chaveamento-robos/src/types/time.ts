export type EnumTime = "ROBOCODE" | "ROBOSOCCER";

export interface Time {
  id: number;
  nome: string;
  tipo: EnumTime;
  imagem?: string | null;
  audioGol?: string | null;
  audioVitoria?: string | null;
}

export interface CriarTimeRequest {
  nome: string;
  tipo: EnumTime;
  imagem?: string | null;
}
