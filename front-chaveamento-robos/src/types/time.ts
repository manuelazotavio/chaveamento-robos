export type EnumTime = "ROBOCODE" | "ROBOSOCCER" | "MARATONA_PROGRAMACAO";

export type StatusTime = "PENDENTE" | "APROVADO" | "REJEITADO";

export interface Time {
  id: number;
  nome: string;
  tipo: EnumTime;
  imagem?: string | null;
  audioGol?: string | null;
  audioVitoria?: string | null;
  status: StatusTime;
  torneioId?: number | null;
}

export interface CriarTimeRequest {
  nome: string;
  tipo: EnumTime;
  imagem?: string | null;
}
