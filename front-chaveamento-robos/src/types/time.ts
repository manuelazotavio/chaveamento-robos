export type EnumTime = "ROBOCODE" | "ROBOSOCCER";

export type StatusTime = "PENDENTE" | "APROVADO" | "REJEITADO";

export interface Time {
  id: number;
  nome: string;
  tipo: EnumTime;
  imagem?: string | null;
  audioGol?: string | null;
  audioVitoria?: string | null;
  status: StatusTime;
}

export interface CriarTimeRequest {
  nome: string;
  tipo: EnumTime;
  imagem?: string | null;
}
